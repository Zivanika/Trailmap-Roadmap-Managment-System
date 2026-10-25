'use client'

import { createContext, useContext, useMemo, useState } from 'react'
import { useCanvasStore } from '@/store/canvas-store'
import { useProgressStore } from '@/store/progress-store'
import { computePathState, type PathState, type PathStatus } from '@/lib/path-state'

/**
 * Path state for the canvas, or null when progress isn't tracked here (the
 * local /try canvas, signed-out viewers) or hasn't loaded yet — so nothing
 * flashes "locked" before the real statuses arrive.
 */
export function usePathState(): PathState | null {
  const nodes = useCanvasStore((s) => s.nodes)
  const edges = useCanvasStore((s) => s.edges)
  const canvasRoadmapId = useCanvasStore((s) => s.roadmapId)
  const roadmapId = useProgressStore((s) => s.roadmapId)
  const statuses = useProgressStore((s) => s.statuses)
  const loaded = useProgressStore((s) => s.loaded)
  const active = loaded && roadmapId !== null && roadmapId === canvasRoadmapId

  const computed = useMemo(
    () => (active ? computePathState(nodes, edges, (id) => statuses[id] === 'done') : null),
    [active, nodes, edges, statuses],
  )
  // Dragging changes `nodes` every frame. Keep handing back the previous object
  // while the result is the same, so every node doesn't re-render with it.
  const [stable, setStable] = useState(computed)
  if (computed !== stable && !samePathState(computed, stable)) {
    setStable(computed)
    return computed
  }
  return stable
}

function samePathState(a: PathState | null, b: PathState | null) {
  if (!a || !b) return a === b
  if (a.nextId !== b.nextId) return false
  const keys = Object.keys(a.status)
  return keys.length === Object.keys(b.status).length && keys.every((k) => a.status[k] === b.status[k])
}

// Computed once in <Canvas> and shared, rather than once per node.
export const PathStateContext = createContext<PathState | null>(null)

export function useNodePathStatus(nodeId: string): PathStatus | null {
  return useContext(PathStateContext)?.status[nodeId] ?? null
}
