'use client'

import { useState } from 'react'
import { CheckCircle2, Circle, CircleDot } from 'lucide-react'
import { useCanvasStore } from '@/store/canvas-store'
import { useProgressStore } from '@/store/progress-store'
import { cn } from '@/lib/utils'

/** Whether progress tracking applies to this node, and its status. */
export function useNodeDone(nodeId: string) {
  const canvasRoadmapId = useCanvasStore((s) => s.roadmapId)
  const progressRoadmapId = useProgressStore((s) => s.roadmapId)
  const status = useProgressStore((s) => s.statuses[nodeId])
  const trackable = progressRoadmapId !== null && progressRoadmapId === canvasRoadmapId
  return { trackable, done: status === 'done', inProgress: status === 'in_progress' }
}

/** Circular check toggle; renders nothing when progress tracking is off. */
export function NodeDoneToggle({ nodeId, className }: { nodeId: string; className?: string }) {
  const toggleDone = useProgressStore((s) => s.toggleDone)
  const { trackable, done, inProgress } = useNodeDone(nodeId)
  // Bumped on each click so the check animation plays only for the user's own toggles.
  const [toggles, setToggles] = useState(0)
  if (!trackable) return null
  return (
    <button
      className={cn('nodrag nopan relative shrink-0 transition-colors', className, done && 'text-emerald-700', inProgress && 'text-amber-700')}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation()
        setToggles((n) => n + 1)
        toggleDone(nodeId)
      }}
      title={done ? 'Mark as not done' : inProgress ? 'In progress · mark as done' : 'Mark as done'}
      aria-label={done ? 'Mark as not done' : inProgress ? 'In progress, mark as done' : 'Mark as done'}
    >
      {done ? (
        <CheckCircle2 key={toggles} size={16} className={toggles > 0 ? 'tm-check' : undefined} />
      ) : inProgress ? (
        <CircleDot size={16} />
      ) : (
        <Circle size={16} />
      )}
      {done && toggles > 0 && (
        <span key={`r${toggles}`} className="tm-ripple pointer-events-none absolute inset-0 rounded-full bg-current" aria-hidden />
      )}
    </button>
  )
}

const STATUSES: { value: 'todo' | 'in_progress' | 'done'; label: string }[] = [
  { value: 'todo', label: 'To do' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'done', label: 'Done' },
]

/** Three-way status for the side panel; the card's toggle only flips done. */
export function StatusPicker({ nodeId }: { nodeId: string }) {
  const setStatus = useProgressStore((s) => s.setStatus)
  const status = useProgressStore((s) => s.statuses[nodeId]) ?? 'todo'
  const { trackable } = useNodeDone(nodeId)
  if (!trackable) return null
  return (
    <div>
      <span id={`status-${nodeId}`} className="text-xs font-medium text-gray-500 dark:text-gray-400">
        Your progress
      </span>
      <div role="radiogroup" aria-labelledby={`status-${nodeId}`} className="mt-1 grid grid-cols-3 gap-1 rounded-lg bg-white/5 p-1">
        {STATUSES.map((s) => (
          <button
            key={s.value}
            role="radio"
            aria-checked={status === s.value}
            onClick={() => setStatus(nodeId, s.value)}
            className={cn(
              'rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
              status === s.value
                ? s.value === 'done'
                  ? 'bg-emerald-500/20 text-emerald-200'
                  : s.value === 'in_progress'
                    ? 'bg-amber-400/20 text-amber-200'
                    : 'bg-white/10 text-white'
                : 'text-white/50 hover:text-white',
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}
