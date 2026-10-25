'use client'

import { useState } from 'react'
import { CheckCircle2, Circle } from 'lucide-react'
import { useCanvasStore } from '@/store/canvas-store'
import { useProgressStore } from '@/store/progress-store'
import { cn } from '@/lib/utils'

/** Whether progress tracking applies to this node, and whether it's done. */
export function useNodeDone(nodeId: string) {
  const canvasRoadmapId = useCanvasStore((s) => s.roadmapId)
  const progressRoadmapId = useProgressStore((s) => s.roadmapId)
  const status = useProgressStore((s) => s.statuses[nodeId])
  const trackable = progressRoadmapId !== null && progressRoadmapId === canvasRoadmapId
  return { trackable, done: status === 'done' }
}

/** Circular check toggle; renders nothing when progress tracking is off. */
export function NodeDoneToggle({ nodeId, className }: { nodeId: string; className?: string }) {
  const toggleDone = useProgressStore((s) => s.toggleDone)
  const { trackable, done } = useNodeDone(nodeId)
  // Bumped on each click so the check animation plays only for the user's own toggles.
  const [toggles, setToggles] = useState(0)
  if (!trackable) return null
  return (
    <button
      className={cn('nodrag nopan relative shrink-0 transition-colors', done && 'text-emerald-700', className)}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation()
        setToggles((n) => n + 1)
        toggleDone(nodeId)
      }}
      title={done ? 'Mark as not done' : 'Mark as done'}
      aria-label={done ? 'Mark as not done' : 'Mark as done'}
    >
      {done ? (
        <CheckCircle2 key={toggles} size={16} className={toggles > 0 ? 'tm-check' : undefined} />
      ) : (
        <Circle size={16} />
      )}
      {done && toggles > 0 && (
        <span key={`r${toggles}`} className="tm-ripple pointer-events-none absolute inset-0 rounded-full bg-current" aria-hidden />
      )}
    </button>
  )
}
