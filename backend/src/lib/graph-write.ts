import { randomUUID } from 'crypto'
import { Prisma } from '@prisma/client'
import type { GraphInput } from './validators'
import { HttpError } from './http-error'

/**
 * Full-graph upsert for a roadmap, inside a transaction. Shared by
 * PATCH /:id/graph and the local→cloud import route.
 *
 * Nodes are reconciled by a diff (not delete-all + recreate) so that nodes which
 * survive a save keep their row — and therefore their NodeProgress FKs stay
 * valid. Only nodes actually removed from the graph are deleted (their progress
 * cascades). Edges have no dependents, so they're fully replaced.
 *
 * Nodes are written in two passes so self-referential `parentId` FKs never
 * reference a not-yet-inserted row.
 *
 * Ids come from the client and node/edge ids are global primary keys, so
 * everything is scoped to this roadmap: a node id that already belongs to
 * another roadmap is rejected (upserting it would move someone else's node, and
 * public roadmaps expose their node ids), and edges never touch other roadmaps' rows.
 */
export async function writeGraphTx(
  tx: Prisma.TransactionClient,
  roadmapId: string,
  nodesInput: GraphInput['nodes'],
  edgesInput: GraphInput['edges'],
) {
  // Dedupe by id — a PK can't repeat, and clients can occasionally send a
  // duplicated node/edge id (e.g. deterministic React Flow edge ids). Keep the
  // last occurrence of each id.
  const nodes = [...new Map(nodesInput.map((n) => [n.id, n])).values()]
  const incomingIds = new Set(nodes.map((n) => n.id))
  // Edges have no FK to nodes; drop any whose endpoints aren't in this graph.
  const edges = [...new Map(edgesInput.map((e) => [e.id, e])).values()].filter(
    (e) => incomingIds.has(e.source) && incomingIds.has(e.target),
  )

  const foreign = await tx.node.count({ where: { id: { in: [...incomingIds] }, roadmapId: { not: roadmapId } } })
  if (foreign > 0) throw new HttpError(409, 'Graph contains nodes that belong to another roadmap')

  await tx.edge.deleteMany({ where: { roadmapId } })

  // Delete only nodes that are no longer present (cascades their progress rows).
  const existing = await tx.node.findMany({ where: { roadmapId }, select: { id: true } })
  const toDelete = existing.filter((e) => !incomingIds.has(e.id)).map((e) => e.id)
  if (toDelete.length) {
    await tx.node.deleteMany({ where: { id: { in: toDelete } } })
  }

  // Pass 1: upsert each node with parentId null (avoids self-FK ordering issues).
  for (const n of nodes) {
    const fields = {
      type: n.type,
      positionX: n.position.x,
      positionY: n.position.y,
      width: n.width ?? null,
      height: n.height ?? null,
      data: (n.data ?? {}) as Prisma.InputJsonValue,
    }
    await tx.node.upsert({
      where: { id: n.id },
      create: { id: n.id, roadmapId, parentId: null, ...fields },
      update: { parentId: null, ...fields },
    })
  }
  // Pass 2: set parent links now that all rows exist.
  for (const n of nodes) {
    if (n.parentId && n.parentId !== n.id && incomingIds.has(n.parentId)) {
      await tx.node.update({ where: { id: n.id }, data: { parentId: n.parentId } })
    }
  }

  if (edges.length) {
    // This roadmap's edges were deleted above, so any id still taken belongs to
    // another roadmap; give those edges fresh ids rather than touching that row.
    const taken = new Set(
      (await tx.edge.findMany({ where: { id: { in: edges.map((e) => e.id) } }, select: { id: true } })).map((e) => e.id),
    )
    await tx.edge.createMany({
      data: edges.map((e) => ({
        id: taken.has(e.id) ? randomUUID() : e.id,
        roadmapId,
        sourceNodeId: e.source,
        targetNodeId: e.target,
        label: e.label ?? null,
        style: (e.style ?? undefined) as Prisma.InputJsonValue | undefined,
      })),
    })
  }
}
