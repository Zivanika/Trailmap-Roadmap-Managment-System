'use client'

import { Lock, PanelRightOpen } from 'lucide-react'
import { useCanvasStore } from '@/store/canvas-store'
import { useUIStore } from '@/store/ui-store'
import type { PathStatus } from '@/lib/path-state'
import { cn } from '@/lib/utils'

/** "~45m", or "~5h" / "~1.5h" from an hour up, so the card's meta row fits on one line. */
export function formatEstimate(minutes: number) {
  if (minutes < 60) return `~${minutes}m`
  return `~${Math.round((minutes / 60) * 2) / 2}h`
}

/** Opacity for a card given its path status; locked cards brighten on hover so they stay editable. */
export function pathDimClass(status: PathStatus | null, done: boolean) {
  if (done) return 'opacity-60'
  if (status === 'locked') return 'opacity-45 hover:opacity-90'
  return null
}

/** Pulsing ring + "Next up" tag around the step the learner should do next. */
export function NextUpGlow() {
  return (
    <>
      <div
        className="tm-glow pointer-events-none absolute -inset-1.5 rounded-md ring-2 ring-emerald-400 shadow-[0_0_28px_rgba(52,211,153,0.55)]"
        aria-hidden
      />
      <span className="pointer-events-none absolute -top-7 left-0 rounded-full bg-emerald-400 px-2 py-0.5 text-[11px] font-semibold text-emerald-950 shadow">
        Next up
      </span>
    </>
  )
}

export function LockedIcon({ className }: { className?: string }) {
  return (
    <span title="Finish the steps leading here first" className={cn('flex', className)}>
      <Lock size={12} aria-label="Locked" />
    </span>
  )
}

/**
 * Opens the side panel. Double-clicking the header does the same, but nobody
 * finds that on their own, and double-clicking the title only selects text.
 */
export function OpenDetailsButton({ nodeId, className }: { nodeId: string; className?: string }) {
  const openSidebar = useUIStore((s) => s.openSidebar)
  const selectNode = useCanvasStore((s) => s.selectNode)
  return (
    <button
      className={cn('nodrag nopan rounded p-0.5 transition-colors hover:bg-black/10', className)}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation()
        selectNode(nodeId)
        openSidebar(nodeId)
      }}
      onDoubleClick={(e) => e.stopPropagation()}
      title="Open details"
      aria-label="Open details"
    >
      <PanelRightOpen size={14} />
    </button>
  )
}
