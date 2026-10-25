/**
 * Picks the step/milestone a learner should do next: the first undone node
 * whose prerequisites (incoming edges) are all done, reading the canvas
 * top-to-bottom, left-to-right. Falls back to any undone node.
 */
export function pickNextStep<T extends { id: string; type: string; positionX: number; positionY: number }>(
  nodes: T[],
  edges: { sourceNodeId: string; targetNodeId: string }[],
  done: Set<string>,
): T | null {
  const trackable = nodes.filter((n) => n.type === 'step' || n.type === 'milestone')
  const undone = trackable
    .filter((n) => !done.has(n.id))
    .sort((a, b) => a.positionY - b.positionY || a.positionX - b.positionX)
  if (undone.length === 0) return null

  const trackableIds = new Set(trackable.map((n) => n.id))
  const prereqs = new Map<string, string[]>()
  for (const e of edges) {
    if (!trackableIds.has(e.sourceNodeId)) continue
    const list = prereqs.get(e.targetNodeId) ?? []
    list.push(e.sourceNodeId)
    prereqs.set(e.targetNodeId, list)
  }

  return undone.find((n) => (prereqs.get(n.id) ?? []).every((p) => done.has(p))) ?? undone[0]
}

const DAY_MS = 24 * 60 * 60 * 1000

/** Calendar-day index for a timestamp in the user's timezone (offset as from Date#getTimezoneOffset). */
export function dayIndex(date: Date, tzOffsetMinutes: number): number {
  return Math.floor((date.getTime() - tzOffsetMinutes * 60 * 1000) / DAY_MS)
}

/**
 * Consecutive days with at least one completion, ending today — or yesterday,
 * so a streak isn't shown as broken before the user has had a chance today.
 */
export function currentStreak(days: Set<number>, today: number): number {
  let day = days.has(today) ? today : today - 1
  let streak = 0
  while (days.has(day)) {
    streak++
    day--
  }
  return streak
}
