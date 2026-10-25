'use client'

import { memo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { type NodeProps } from '@xyflow/react'
import type { CanvasNode } from '@/types'
import { useCanvasStore } from '@/store/canvas-store'
import { useUIStore } from '@/store/ui-store'
import { cn } from '@/lib/utils'
import { InlineBlockList } from './InlineBlockList'
import { OpenDetailsButton } from './node-parts'

// Plain yellow sticky note: tan tape on top, folded corner at bottom-left.
const FOLD = 26
const PAPER = '#ECD85A'

function NoteNode({ data, id, selected }: NodeProps<CanvasNode>) {
  const [expanded, setExpanded] = useState(false)
  const openSidebar    = useUIStore((s) => s.openSidebar)
  const selectNode     = useCanvasStore((s) => s.selectNode)
  const updateNodeData = useCanvasStore((s) => s.updateNodeData)

  const blockCount = data.blocks.length

  return (
    <div className={cn('tm-pop-in relative w-[190px]', selected ? 'note-shadow-selected' : 'note-shadow')}>

      {/* ── Paper ───────────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden"
        style={{
          background: PAPER,
          // Cut the bottom-LEFT corner so the fold shows through.
          clipPath: `polygon(0 0, 100% 0, 100% 100%, ${FOLD}px 100%, 0 calc(100% - ${FOLD}px))`,
          borderRadius: 3,
        }}
        onDoubleClick={() => { selectNode(id); openSidebar(id) }}
      >
        <div className="absolute right-1.5 top-1.5 flex items-center gap-0.5 text-yellow-900/45">
          <OpenDetailsButton nodeId={id} />
          {/* collapse chevron (only when there are resources) */}
          {blockCount > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v) }}
              className="nodrag nopan flex items-center gap-0.5 rounded px-1 py-0.5 hover:bg-black/5"
            >
              <span className="text-[10px] font-semibold">{blockCount}</span>
              <ChevronDown size={11} className={cn('transition-transform duration-200', expanded && 'rotate-180')} />
            </button>
          )}
        </div>

        {/* Note text — only the textarea is `nodrag`, so the surrounding
            padding stays a drag handle for moving the note. */}
        <div className="px-4 pb-5 pt-5">
          <textarea
            value={data.title}
            onChange={(e) => updateNodeData(id, { title: e.target.value })}
            onMouseDown={(e) => e.stopPropagation()}
            placeholder="Write a note…"
            rows={4}
            className="nodrag nopan w-full resize-none bg-transparent text-sm leading-relaxed text-yellow-950 placeholder:text-yellow-800/35 focus:outline-none"
          />
        </div>

        {/* Collapsible resources */}
        <div
          style={{
            display: 'grid',
            gridTemplateRows: expanded ? '1fr' : '0fr',
            transition: 'grid-template-rows 200ms ease',
          }}
        >
          <div className="overflow-hidden">
            <div className="h-px w-full bg-yellow-950/10" />
            <InlineBlockList nodeId={id} data={data} />
          </div>
        </div>
      </div>

      {/* ── Tape across the top ─────────────────────────────────────── */}
      <div
        className="pointer-events-none absolute left-1/2 top-[-9px] h-[20px] w-[54px]"
        style={{
          transform: 'translateX(-50%) rotate(-5deg)',
          background: 'rgba(200, 184, 140, 0.72)',
          clipPath: 'polygon(7% 0, 100% 0, 93% 100%, 0 100%)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
          borderTop: '1px solid rgba(255,255,255,0.25)',
        }}
      />

      {/* ── Folded corner (bottom-left) ─────────────────────────────── */}
      <div
        className="pointer-events-none absolute bottom-0 left-0"
        style={{
          width: FOLD,
          height: FOLD,
          clipPath: 'polygon(0 0, 100% 100%, 0 100%)',
          background: 'linear-gradient(135deg, #c7b545 0%, #d8c85f 70%, #e3d574 100%)',
          boxShadow: '1px -1px 2px rgba(0,0,0,0.12)',
        }}
      />

      {selected && (
        <div className="pointer-events-none absolute inset-0 rounded-[3px] ring-2 ring-inset ring-yellow-600/60" />
      )}
    </div>
  )
}

export default memo(NoteNode)
