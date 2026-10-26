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

const FOLD = 38

const HANDLE_STYLE: React.CSSProperties = {
  background: 'rgba(0,0,0,0.28)',
  borderColor: 'rgba(255,255,255,0.65)',
  width: 10,
  height: 10,
}

function MilestoneNode({ data, id, selected }: NodeProps<CanvasNode>) {
  const [expanded, setExpanded] = useState(false)
  const openSidebar    = useUIStore((s) => s.openSidebar)
  const selectNode     = useCanvasStore((s) => s.selectNode)
  const updateNodeData = useCanvasStore((s) => s.updateNodeData)

  const blockCount = data.blocks.length
  const { done } = useNodeDone(id)
  const path = useNodePathStatus(id)

  return (
    <div className={cn('tm-pop-in relative w-[220px] transition-opacity', pathDimClass(path, done), selected ? 'note-shadow-selected' : 'note-shadow')}>

      {/* ── Main card ───────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden"
        style={{
          background: '#FFD233',
          clipPath: `polygon(0 0, 100% 0, 100% calc(100% - ${FOLD}px), calc(100% - ${FOLD}px) 100%, 0 100%)`,
          borderRadius: 3,
        }}
      >
        {/* Gold shimmer at top */}
        <div className="absolute top-0 inset-x-0 h-[11px] bg-white/22 rounded-b-md" />

        <Handle type="target" position={Position.Top} style={HANDLE_STYLE} className="!border-2" />

        {/* Top meta row */}
        <div
          className="flex cursor-pointer select-none items-center justify-between px-4 pb-1.5 pt-5"
          onClick={() => setExpanded((e) => !e)}
          onDoubleClick={() => { selectNode(id); openSidebar(id) }}
        >
          <div className="flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-amber-950/55">
            <NodeDoneToggle nodeId={id} className="text-amber-950" />
            <span className="text-sm leading-none">🏆</span>
            <span>Milestone</span>
            {data.estMinutes && <span>· {formatEstimate(data.estMinutes)}</span>}
            {path === 'locked' && <LockedIcon />}
          </div>
          <div className="flex items-center gap-1">
            <OpenDetailsButton nodeId={id} className="text-amber-950/45" />
            <ChevronDown
              size={14}
              className={cn('text-amber-950/45 transition-transform duration-200', expanded && 'rotate-180')}
            />
          </div>
        </div>

        {/* Title */}
        <div
          className="nodrag nopan px-4 pb-3"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            value={data.title}
            onChange={(e) => updateNodeData(id, { title: e.target.value })}
            placeholder="Milestone"
            className={cn(
              'w-full bg-transparent text-[15px] font-bold leading-snug text-amber-950 placeholder:text-amber-950/30 focus:outline-none',
              done && 'line-through',
            )}
          />
          {blockCount > 0 && !expanded && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="mt-1 cursor-pointer text-[11px] font-medium text-amber-950/50 hover:underline"
            >
              ▼ {blockCount} resource{blockCount !== 1 ? 's' : ''}
            </button>
          )}
        </div>

        {/* Collapsible */}
        <div
          style={{
            display: 'grid',
            gridTemplateRows: expanded ? '1fr' : '0fr',
            transition: 'grid-template-rows 200ms ease',
          }}
        >
          <div className="overflow-hidden">
            <div className="h-px w-full bg-amber-950/10" />
            <InlineBlockList nodeId={id} data={data} />
          </div>
        </div>

        <Handle type="source" position={Position.Bottom} style={HANDLE_STYLE} className="!border-2" />
      </div>

      {/* Peeling corner */}
      <PeelCorner size={FOLD} back="#C4980A" />

      {path === 'next' && <NextUpGlow />}

      {selected && (
        <div className="pointer-events-none absolute inset-0 rounded-[3px] ring-2 ring-inset ring-amber-600/70" />
      )}
    </div>
  )
}

export default memo(MilestoneNode)
