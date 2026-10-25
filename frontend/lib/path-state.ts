import type { CanvasEdge, CanvasNode } from '@/types'

/** How a step or milestone sits on the learner's path. */
export type PathStatus = 'done' | 'next' | 'open' | 'locked'

export interface PathState {
  /** Status per step/milestone id; notes and groups are absent. */
  status: Record<string, PathStatus>
  nextId: string | null
}

/**
 * Port of the backend's `pickNextStep` (backend/src/lib/next-step.ts), extended
 * to classify every node: a node is locked while any step/milestone feeding
 * into it is undone, and "next" is the first unlocked undone node reading the
 * canvas top-to-bottom, left-to-right. Keep the two in sync so the dashboard's
 * "pick up where you left off" card and the canvas glow agree.
 */
export function computePathState(
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  isDone: (id: string) => boolean,
): PathState {
  const trackable = nodes.filter((n) => n.type === 'step' || n.type === 'milestone')
  const trackableIds = new Set(trackable.map((n) => n.id))

  const prereqs = new Map<string, string[]>()
  for (const e of edges) {
    if (!trackableIds.has(e.source)) continue
    const list = prereqs.get(e.target) ?? []
    list.push(e.source)
    prereqs.set(e.target, list)
  }

  const status: Record<string, PathStatus> = {}
  for (const n of trackable) {
    if (isDone(n.id)) status[n.id] = 'done'
    else status[n.id] = (prereqs.get(n.id) ?? []).every(isDone) ? 'open' : 'locked'
  }

  const undone = trackable
    .filter((n) => status[n.id] !== 'done')
    .sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x)
  // Same fallback as the backend: with no unlocked node, point at the first undone one.
  const next = undone.find((n) => status[n.id] === 'open') ?? undone[0] ?? null
  if (next) status[next.id] = 'next'

  return { status, nextId: next?.id ?? null }
}
