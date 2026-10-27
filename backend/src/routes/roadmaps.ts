import { Router } from 'express'
import { randomUUID } from 'crypto'
import { prisma } from '../db/prisma'
import { requireAuth } from '../middleware/auth'
import {
  createRoadmapSchema,
  updateRoadmapSchema,
  graphSaveSchema,
  importSchema,
} from '../lib/validators'
import { isAdmin } from '../lib/admin'
import { hasCycle } from '../lib/dag'
import { makeShareSlug } from '../lib/slug'
import { serializeRoadmap } from '../lib/serialize'
import { writeGraphTx } from '../lib/graph-write'

const router = Router()

// Everything here requires a signed-in user.
router.use(requireAuth)

/** GET /api/roadmaps — list the user's roadmaps (summary + completion stats). */
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user!.id
    const roadmaps = await prisma.roadmap.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: 'desc' },
    })
    const ids = roadmaps.map((r) => r.id)

    // Per-type node counts + completion (done ÷ step+milestone).
    const [nodeCounts, doneCounts] = await Promise.all([
      ids.length
        ? prisma.node.groupBy({
            by: ['roadmapId', 'type'],
            where: { roadmapId: { in: ids } },
            _count: { _all: true },
          })
        : [],
      ids.length
        ? prisma.nodeProgress.groupBy({
            by: ['roadmapId'],
            where: { userId, roadmapId: { in: ids }, status: 'done' },
            _count: { _all: true },
          })
        : [],
    ])

    const countsByRoadmap = new Map<string, { step: number; milestone: number; note: number; group: number }>()
    for (const id of ids) countsByRoadmap.set(id, { step: 0, milestone: 0, note: 0, group: 0 })
    for (const row of nodeCounts) {
      const c = countsByRoadmap.get(row.roadmapId)
      if (c) c[row.type as keyof typeof c] = row._count._all
    }
    const doneMap = new Map(doneCounts.map((n) => [n.roadmapId, n._count._all]))

    res.json({
      roadmaps: roadmaps.map((r) => {
        const c = countsByRoadmap.get(r.id) ?? { step: 0, milestone: 0, note: 0, group: 0 }
        const total = c.step + c.milestone
        return {
          ...serializeRoadmap(r),
          counts: c,
          totalSteps: total,
          doneSteps: Math.min(doneMap.get(r.id) ?? 0, total),
        }
      }),
    })
  } catch (err) {
    next(err)
  }
})

/** POST /api/roadmaps — create an empty roadmap. */
router.post('/', async (req, res, next) => {
  try {
    const body = createRoadmapSchema.parse(req.body ?? {})
    const roadmap = await prisma.roadmap.create({
      data: {
        ownerId: req.user!.id,
        title: body.title ?? 'Untitled roadmap',
        description: body.description,
        tags: [],
      },
    })
    res.status(201).json({ roadmap: serializeRoadmap(roadmap) })
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/roadmaps/import — local→cloud migration.
 * Creates a roadmap per local entry and returns { idMap: { localId: cloudId } }.
 * Never overwrites existing roadmaps; always adds new ones.
 */
router.post('/import', async (req, res, next) => {
  try {
    const { roadmaps } = importSchema.parse(req.body ?? {})
    const idMap: Record<string, string> = {}

    for (const r of roadmaps) {
      if (hasCycle(r.edges)) {
        return res.status(400).json({ error: `Roadmap "${r.localId}" contains a cycle` })
      }
    }

    await prisma.$transaction(async (tx) => {
      for (const r of roadmaps) {
        const created = await tx.roadmap.create({
          data: {
            ownerId: req.user!.id,
            title: r.title ?? 'Untitled roadmap',
            description: r.description,
            tags: [],
          },
        })

        // Remap node ids to fresh uuids so they're globally unique (local ids may
        // collide across roadmaps or with existing rows). Rewrite edges + parents.
        const nodeIdMap = new Map<string, string>()
        for (const n of r.nodes) nodeIdMap.set(n.id, randomUUID())
        const nodes = r.nodes.map((n) => ({
          ...n,
          id: nodeIdMap.get(n.id)!,
          parentId: n.parentId ? nodeIdMap.get(n.parentId) ?? null : null,
        }))
        const edges = r.edges.map((e) => ({
          ...e,
          id: randomUUID(),
          source: nodeIdMap.get(e.source) ?? e.source,
          target: nodeIdMap.get(e.target) ?? e.target,
        }))

        await writeGraphTx(tx, created.id, nodes, edges)
        idMap[r.localId] = created.id
      }
    })

    res.status(201).json({ idMap })
  } catch (err) {
    next(err)
  }
})

/**
 * GET /api/roadmaps/following — shared roadmaps the user follows, with their
 * progress on each. Declared before /:id so "following" isn't read as an id.
 * One the owner has made private again drops out of the list (the follow is kept).
 */
router.get('/following', async (req, res, next) => {
  try {
    const userId = req.user!.id
    const follows = await prisma.roadmapFollow.findMany({
      where: { userId, roadmap: { visibility: { not: 'private' }, shareSlug: { not: null } } },
      orderBy: { createdAt: 'desc' },
      select: {
        createdAt: true,
        roadmap: { select: { id: true, title: true, description: true, shareSlug: true, visibility: true, tags: true, viewCount: true, updatedAt: true } },
      },
    })
    const ids = follows.map((f) => f.roadmap.id)
    const [trackable, done] = await Promise.all([
      ids.length
        ? prisma.node.groupBy({ by: ['roadmapId'], where: { roadmapId: { in: ids }, type: { in: ['step', 'milestone'] } }, _count: { _all: true } })
        : [],
      ids.length
        ? prisma.nodeProgress.groupBy({ by: ['roadmapId'], where: { userId, roadmapId: { in: ids }, status: 'done' }, _count: { _all: true } })
        : [],
    ])
    const totalOf = new Map(trackable.map((t) => [t.roadmapId, t._count._all]))
    const doneOf = new Map(done.map((d) => [d.roadmapId, d._count._all]))
    res.json({
      roadmaps: follows.map(({ roadmap: r, createdAt }) => {
        const totalSteps = totalOf.get(r.id) ?? 0
        return {
          ...r,
          description: r.description ?? undefined,
          followedAt: createdAt,
          totalSteps,
          doneSteps: Math.min(doneOf.get(r.id) ?? 0, totalSteps),
        }
      }),
    })
  } catch (err) {
    next(err)
  }
})

/** Loads a roadmap someone other than its owner may follow: shared, and not their own. */
async function followable(id: string, userId: string) {
  const roadmap = await prisma.roadmap.findUnique({ where: { id }, select: { ownerId: true, visibility: true } })
  if (!roadmap || roadmap.visibility === 'private') return { status: 404 as const, error: 'Not found' }
  if (roadmap.ownerId === userId) return { status: 400 as const, error: 'You can’t follow your own roadmap' }
  return null
}

/** GET /api/roadmaps/:id/follow — whether the user follows it (or owns it), and how many people do. */
router.get('/:id/follow', async (req, res, next) => {
  try {
    const [mine, followers, roadmap] = await Promise.all([
      prisma.roadmapFollow.findUnique({ where: { userId_roadmapId: { userId: req.user!.id, roadmapId: req.params.id } } }),
      prisma.roadmapFollow.count({ where: { roadmapId: req.params.id } }),
      prisma.roadmap.findUnique({ where: { id: req.params.id }, select: { ownerId: true } }),
    ])
    res.json({ following: Boolean(mine), followers, isOwner: roadmap?.ownerId === req.user!.id })
  } catch (err) {
    next(err)
  }
})

/** POST /api/roadmaps/:id/follow — follow a shared roadmap (idempotent). */
router.post('/:id/follow', async (req, res, next) => {
  try {
    const problem = await followable(req.params.id, req.user!.id)
    if (problem) return res.status(problem.status).json({ error: problem.error })
    await prisma.roadmapFollow.upsert({
      where: { userId_roadmapId: { userId: req.user!.id, roadmapId: req.params.id } },
      create: { userId: req.user!.id, roadmapId: req.params.id },
      update: {},
    })
    res.json({ following: true, followers: await prisma.roadmapFollow.count({ where: { roadmapId: req.params.id } }) })
  } catch (err) {
    next(err)
  }
})

/** DELETE /api/roadmaps/:id/follow — unfollow (idempotent). */
router.delete('/:id/follow', async (req, res, next) => {
  try {
    await prisma.roadmapFollow.deleteMany({ where: { userId: req.user!.id, roadmapId: req.params.id } })
    res.json({ following: false, followers: await prisma.roadmapFollow.count({ where: { roadmapId: req.params.id } }) })
  } catch (err) {
    next(err)
  }
})

/** GET /api/roadmaps/:id — full roadmap with nodes + edges (owner only). */
router.get('/:id', async (req, res, next) => {
  try {
    const roadmap = await prisma.roadmap.findUnique({
      where: { id: req.params.id },
      include: { nodes: true, edges: true },
    })
    if (!roadmap) return res.status(404).json({ error: 'Not found' })
    if (roadmap.ownerId !== req.user!.id) return res.status(403).json({ error: 'Forbidden' })
    res.json({ roadmap: { ...serializeRoadmap(roadmap), canFeature: isAdmin(req.user!.email) } })
  } catch (err) {
    next(err)
  }
})

/** PATCH /api/roadmaps/:id — update metadata; publishing mints a share slug. */
router.patch('/:id', async (req, res, next) => {
  try {
    const body = updateRoadmapSchema.parse(req.body ?? {})
    const existing = await prisma.roadmap.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ error: 'Not found' })
    if (existing.ownerId !== req.user!.id) return res.status(403).json({ error: 'Forbidden' })
    if (body.isTemplate !== undefined && body.isTemplate !== existing.isTemplate && !isAdmin(req.user!.email)) {
      return res.status(403).json({ error: 'Only admins can feature templates' })
    }

    // Mint a slug the first time it becomes shareable.
    let shareSlug = existing.shareSlug
    if (
      body.visibility &&
      body.visibility !== 'private' &&
      !existing.shareSlug
    ) {
      shareSlug = makeShareSlug(body.title ?? existing.title)
    }

    const updated = await prisma.roadmap.update({
      where: { id: req.params.id },
      data: {
        title: body.title,
        description: body.description,
        tags: body.tags,
        visibility: body.visibility,
        coverUrl: body.coverUrl,
        // The gallery only shows public roadmaps; unsharing one takes it out.
        isTemplate: body.visibility && body.visibility !== 'public' ? false : body.isTemplate,
        shareSlug,
      },
    })
    res.json({ roadmap: { ...serializeRoadmap(updated), canFeature: isAdmin(req.user!.email) } })
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/roadmaps/:id/fork — clone an accessible roadmap into the user's account.
 * Source must be owned by the user or non-private. New copy is private, records forkedFrom.
 */
router.post('/:id/fork', async (req, res, next) => {
  try {
    const source = await prisma.roadmap.findUnique({
      where: { id: req.params.id },
      include: { nodes: true, edges: true },
    })
    if (!source) return res.status(404).json({ error: 'Not found' })
    if (source.ownerId !== req.user!.id && source.visibility === 'private') {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const created = await prisma.$transaction(async (tx) => {
      const copy = await tx.roadmap.create({
        data: {
          ownerId: req.user!.id,
          // A template is meant to be copied; a fork of someone's roadmap says so.
          title: source.isTemplate ? source.title : `${source.title} (fork)`,
          description: source.description,
          tags: source.tags,
          forkedFrom: source.id,
          visibility: 'private',
        },
      })

      const nodeIdMap = new Map<string, string>()
      for (const n of source.nodes) nodeIdMap.set(n.id, randomUUID())
      const nodes = source.nodes.map((n) => ({
        id: nodeIdMap.get(n.id)!,
        type: n.type,
        position: { x: n.positionX, y: n.positionY },
        width: n.width,
        height: n.height,
        parentId: n.parentId ? nodeIdMap.get(n.parentId) ?? null : null,
        data: n.data,
      }))
      const edges = source.edges.map((e) => ({
        id: randomUUID(),
        source: nodeIdMap.get(e.sourceNodeId) ?? e.sourceNodeId,
        target: nodeIdMap.get(e.targetNodeId) ?? e.targetNodeId,
        label: e.label,
        style: e.style,
      }))

      await writeGraphTx(tx, copy.id, nodes, edges)
      return copy
    })

    res.status(201).json({ roadmap: serializeRoadmap(created) })
  } catch (err) {
    next(err)
  }
})

/** DELETE /api/roadmaps/:id — delete (nodes/edges cascade). */
router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.roadmap.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ error: 'Not found' })
    if (existing.ownerId !== req.user!.id) return res.status(403).json({ error: 'Forbidden' })
    await prisma.roadmap.delete({ where: { id: req.params.id } })
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

/** PATCH /api/roadmaps/:id/graph — full-graph upsert (replace all nodes + edges). */
router.patch('/:id/graph', async (req, res, next) => {
  try {
    const { nodes, edges, baseVersion, force } = graphSaveSchema.parse(req.body ?? {})

    const existing = await prisma.roadmap.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ error: 'Not found' })
    if (existing.ownerId !== req.user!.id) return res.status(403).json({ error: 'Forbidden' })

    if (hasCycle(edges)) {
      return res.status(400).json({ error: 'Graph contains a cycle' })
    }

    // Each save replaces the whole graph, so a save built on an older version
    // (another tab or device saved since) would silently wipe those edits.
    // The version check and bump happen in one conditional update, so two
    // saves racing on the same version can't both win.
    const roadmapId = req.params.id
    const checkVersion = baseVersion !== undefined && !force
    const version = await prisma.$transaction(async (tx) => {
      const bumped = await tx.roadmap.updateMany({
        where: { id: roadmapId, ...(checkVersion ? { version: baseVersion } : {}) },
        data: { version: { increment: 1 }, updatedAt: new Date() },
      })
      if (bumped.count === 0) return null
      await writeGraphTx(tx, roadmapId, nodes, edges)
      return (await tx.roadmap.findUniqueOrThrow({ where: { id: roadmapId }, select: { version: true } })).version
    })
    if (version === null) {
      const current = await prisma.roadmap.findUnique({ where: { id: roadmapId }, select: { version: true } })
      return res.status(409).json({ error: 'This roadmap was changed somewhere else.', version: current?.version })
    }

    res.json({ ok: true, nodeCount: nodes.length, edgeCount: edges.length, version })
  } catch (err) {
    next(err)
  }
})

export default router
