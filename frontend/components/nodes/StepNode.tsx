'use client'

import { memo, useState } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { ChevronDown } from 'lucide-react'
import type { CanvasNode } from '@/types'
import { useCanvasStore } from '@/store/canvas-store'
import { useUIStore } from '@/store/ui-store'
import { cn } from '@/lib/utils'
import { InlineBlockList } from './InlineBlockList'
import { PeelCorner } from './PeelCorner'
import { NodeDoneToggle, useNodeDone } from './NodeDoneToggle'
import { LockedIcon, NextUpGlow, OpenDetailsButton, formatEstimate, pathDimClass } from './node-parts'
import { useNodePathStatus } from '@/hooks/use-path-state'

/**
 * Each colour entry:
 *   bg    – the card's solid background hex
 *   fold  – the darker triangle that fills the clipped corner (underside of fold)
 *   text  – main text on the card
 *   meta  – subdued text (est time, count)
 *   ring  – Tailwind ring colour for selection
 */
const STICKY: Record<string, {
  bg: string; fold: string; text: string; meta: string
  placeholder: string; divider: string; ring: string
}> = {
  blue: {
    bg:          '#7EC8F5',
    fold:        '#4A9ED4',
    text:        'text-blue-950',
    meta:        'text-blue-950/50',
    placeholder: 'placeholder:text-blue-950/30',
    divider:     'bg-blue-950/10',
    ring:        'ring-blue-600/70',
  },
  green: {
    bg:          '#6EDEA0',
    fold:        '#3EBB74',
    text:        'text-emerald-950',
    meta:        'text-emerald-950/50',
    placeholder: 'placeholder:text-emerald-950/30',
    divider:     'bg-emerald-950/10',
    ring:        'ring-emerald-600/70',
  },
  purple: {
    bg:          '#C49FF5',
    fold:        '#9670D4',
    text:        'text-violet-950',
    meta:        'text-violet-950/50',
    placeholder: 'placeholder:text-violet-950/30',
    divider:     'bg-violet-950/10',
    ring:        'ring-violet-600/70',
  },
  orange: {
    bg:          '#FFB347',
    fold:        '#D4841A',
    text:        'text-orange-950',
    meta:        'text-orange-950/50',
    placeholder: 'placeholder:text-orange-950/30',
    divider:     'bg-orange-950/10',
    ring:        'ring-orange-600/70',
  },
  pink: {
    bg:          '#FF8FAB',
    fold:        '#D4607C',
    text:        'text-rose-950',
    meta:        'text-rose-950/50',
    placeholder: 'placeholder:text-rose-950/30',
    divider:     'bg-rose-950/10',
    ring:        'ring-rose-600/70',
  },
}

// Size of the diagonal fold cut in px
const FOLD = 38

const HANDLE_STYLE: React.CSSProperties = {
  background: 'rgba(0,0,0,0.28)',
  borderColor: 'rgba(255,255,255,0.65)',
  width: 10,
  height: 10,
}

function StepNode({ data, id, selected }: NodeProps<CanvasNode>) {
  const [expanded, setExpanded] = useState(false)
  const openSidebar  = useUIStore((s) => s.openSidebar)
  const selectNode   = useCanvasStore((s) => s.selectNode)
  const updateNodeData = useCanvasStore((s) => s.updateNodeData)

  const s = STICKY[data.color ?? 'blue'] ?? STICKY.blue
  const blockCount = data.blocks.length
  const { done } = useNodeDone(id)
  const path = useNodePathStatus(id)

  return (
    /**
     * Outer wrapper:
     *  – carries the drop-shadow filter (follows the pentagon clip path)
     *  – hosts the fold triangles as absolutely-positioned siblings
     */
    <div className={cn('tm-pop-in relative w-[220px] transition-opacity', pathDimClass(path, done), selected ? 'note-shadow-selected' : 'note-shadow')}>

      {/* ── Main card ───────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden"
        style={{
          background: s.bg,
          /* Pentagon clip: cuts the bottom-right corner diagonally */
          clipPath: `polygon(0 0, 100% 0, 100% calc(100% - ${FOLD}px), calc(100% - ${FOLD}px) 100%, 0 100%)`,
          borderRadius: 3,
        }}
      >
        {/* Tape strip */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[11px] w-10 rounded-b-md bg-white/25" />

        <Handle type="target" position={Position.Top} style={HANDLE_STYLE} className="!border-2" />

        {/* ── Top meta row — click to toggle expand ─────────────────── */}
        <div
          className="flex cursor-pointer select-none items-center justify-between px-4 pb-1.5 pt-5"
          onClick={() => setExpanded((e) => !e)}
          onDoubleClick={() => { selectNode(id); openSidebar(id) }}
        >
          <div className={cn('flex items-center gap-1.5 whitespace-nowrap text-xs font-medium', s.meta)}>
            <NodeDoneToggle nodeId={id} className={s.text} />
            <span className="text-sm leading-none">📍</span>
            <span>Step</span>
            {data.estMinutes && <span>· {formatEstimate(data.estMinutes)}</span>}
            {path === 'locked' && <LockedIcon />}
          </div>
          <div className="flex items-center gap-1">
            <OpenDetailsButton nodeId={id} className={s.meta} />
            <ChevronDown
              size={14}
              className={cn(s.meta, 'transition-transform duration-200', expanded && 'rotate-180')}
            />
          </div>
        </div>

        {/* ── Title ────────────────────────────────────────────────── */}
        <div
          className="nodrag nopan px-4 pb-3"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            value={data.title}
            onChange={(e) => updateNodeData(id, { title: e.target.value })}
            placeholder="Untitled step"
            className={cn(
              'w-full bg-transparent text-[15px] font-bold leading-snug focus:outline-none',
              s.text, s.placeholder, done && 'line-through',
            )}
          />
          {blockCount > 0 && !expanded && (
            <p className={cn('mt-1 text-[11px] font-medium', s.meta)}>
              ▼ {blockCount} resource{blockCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* ── Collapsible resources ─────────────────────────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateRows: expanded ? '1fr' : '0fr',
            transition: 'grid-template-rows 200ms ease',
          }}
        >
          <div className="overflow-hidden">
            <div className={cn('h-px w-full', s.divider)} />
            <InlineBlockList nodeId={id} data={data} />
          </div>
        </div>

        <Handle type="source" position={Position.Bottom} style={HANDLE_STYLE} className="!border-2" />
      </div>

      {/* ── Peeling corner (curled underside of the sheet) ──────────── */}
      <PeelCorner size={FOLD} back={s.fold} />

      {path === 'next' && <NextUpGlow />}

      {/* Selection ring — rendered as a border on a full-size overlay */}
      {selected && (
        <div
          className={cn('pointer-events-none absolute inset-0 rounded-[3px] ring-2 ring-inset', s.ring)}
        />
      )}
    </div>
  )
}

export default memo(StepNode)
