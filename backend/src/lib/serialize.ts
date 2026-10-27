import type { Node as DbNode, Edge as DbEdge, Roadmap as DbRoadmap } from '@prisma/client'

/** DB node row → React Flow-shaped node for the client. */
export function serializeNode(n: DbNode) {
  return {
    id: n.id,
    type: n.type,
    position: { x: n.positionX, y: n.positionY },
    width: n.width ?? undefined,
    height: n.height ?? undefined,
    parentId: n.parentId ?? undefined,
    data: n.data,
  }
}

/** DB edge row → React Flow-shaped edge for the client. */
export function serializeEdge(e: DbEdge) {
  return {
    id: e.id,
    source: e.sourceNodeId,
    target: e.targetNodeId,
    label: e.label ?? undefined,
    style: e.style ?? undefined,
  }
}

export function serializeRoadmap(
  r: DbRoadmap & { nodes?: DbNode[]; edges?: DbEdge[] },
) {
  return {
    id: r.id,
    title: r.title,
    description: r.description ?? undefined,
    visibility: r.visibility,
    shareSlug: r.shareSlug ?? undefined,
    tags: r.tags,
    coverUrl: r.coverUrl ?? undefined,
    viewCount: r.viewCount,
    version: r.version,
    isTemplate: r.isTemplate,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    ...(r.nodes ? { nodes: r.nodes.map(serializeNode) } : {}),
    ...(r.edges ? { edges: r.edges.map(serializeEdge) } : {}),
  }
}
