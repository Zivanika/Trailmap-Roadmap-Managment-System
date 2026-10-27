'use client'

import { useCallback } from 'react'
import { useStoreApi } from '@xyflow/react'
import { useCanvasStore } from '@/store/canvas-store'
import { useUIStore } from '@/store/ui-store'
import { useStore } from 'zustand'
import type { CanvasNode } from '@/types'
import { Undo2, Redo2, Sparkles, Wand2 } from 'lucide-react'
import { autoLayout } from '@/lib/auto-layout'
import { cn } from '@/lib/utils'

const NODE_PRESETS: { type: CanvasNode['type']; label: string; emoji: string; color: string }[] = [
  { type: 'step',      label: 'Step',      emoji: '📍', color: 'hover:bg-blue-500/15 hover:text-blue-300' },
  { type: 'milestone', label: 'Milestone', emoji: '🏆', color: 'hover:bg-amber-500/15 hover:text-amber-300' },
  { type: 'note',      label: 'Note',      emoji: '📝', color: 'hover:bg-yellow-500/15 hover:text-yellow-300' },
  { type: 'group',     label: 'Group',     emoji: '⬡',  color: 'hover:bg-indigo-500/15 hover:text-indigo-300' },
]

// Rough rendered sizes, used to centre a new node on the viewport.
const NODE_SIZE: Record<CanvasNode['type'], { w: number; h: number }> = {
  step:      { w: 220, h: 90 },
  milestone: { w: 220, h: 90 },
  note:      { w: 190, h: 140 },
  group:     { w: 320, h: 200 },
}

/**
 * Adds a node in the middle of what the user is looking at, so it never lands
 * off-screen. Must be used inside a <ReactFlowProvider>.
 */
export function useAddNodeAtCenter() {
  const addNode = useCanvasStore((s) => s.addNode)
  const flow = useStoreApi()

  return useCallback(
    (type: CanvasNode['type']) => {
      const { width, height, transform: [tx, ty, zoom] } = flow.getState()
      const size = NODE_SIZE[type]
      let x = (width / 2 - tx) / zoom - size.w / 2
      let y = (height / 2 - ty) / zoom - size.h / 2
      // Step diagonally past nodes already there, so repeated adds don't stack exactly.
      const taken = useCanvasStore.getState().nodes
      while (taken.some((n) => Math.abs(n.position.x - x) < 16 && Math.abs(n.position.y - y) < 16)) {
        x += 28
        y += 28
      }
      const node: CanvasNode = {
        id: crypto.randomUUID(),
        type,
        position: { x, y },
        data: { title: '', blocks: [], color: 'blue' },
        // Top-level width/height (not style) so NodeResizer can update them and
        // they get persisted by serializeGraph.
        ...(type === 'group' && { width: 320, height: 200 }),
      }
      addNode(node)
      return node.id
    },
    [addNode, flow],
  )
}

export function CanvasToolbar() {
  const handleAdd = useAddNodeAtCenter()
  const setGenerateOpen = useUIStore((s) => s.setGenerateOpen)
  const { undo, redo, pastStates, futureStates } = useStore(useCanvasStore.temporal)
  // zundo restores nodes/edges but not isDirty; flag it so the undo is saved too.
  const markDirty = useCanvasStore((s) => s.markDirty)
  const nodeCount = useCanvasStore((s) => s.nodes.length)

  // One undo step; then fit the view to the tidied trail.
  function tidyUp() {
    const { nodes, edges, setNodes } = useCanvasStore.getState()
    setNodes(autoLayout(nodes, edges))
    useUIStore.getState().requestFitView()
  }

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 rounded-2xl border border-white/10 bg-gray-950/80 backdrop-blur-md px-2 py-1.5 shadow-xl">
      {NODE_PRESETS.map((p) => (
        <button
          key={p.type}
          onClick={() => handleAdd(p.type)}
          className={cn(
            'flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-sm font-medium text-gray-400 transition-colors',
            p.color,
          )}
          title={`Add ${p.label}`}
        >
          <span className="text-base leading-none">{p.emoji}</span>
          <span>{p.label}</span>
        </button>
      ))}

      <div className="mx-1.5 h-4 w-px bg-white/10" />

      <button
        onClick={() => setGenerateOpen(true)}
        className="flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-sm font-medium text-violet-300 transition-colors hover:bg-violet-500/15"
        title="Generate with AI"
      >
        <Sparkles size={15} />
        <span>Generate</span>
      </button>

      <button
        onClick={tidyUp}
        disabled={nodeCount < 2}
        className="flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-sm font-medium text-gray-400 transition-colors hover:bg-white/10 hover:text-gray-200 disabled:cursor-not-allowed disabled:opacity-30"
        title="Tidy up: lay the trail out top to bottom"
      >
        <Wand2 size={15} />
        <span>Tidy up</span>
      </button>

      <div className="mx-1.5 h-4 w-px bg-white/10" />

      <button
        onClick={() => { undo(); markDirty() }}
        disabled={pastStates.length === 0}
        className="rounded-lg p-1.5 text-gray-500 hover:bg-white/10 hover:text-gray-200 disabled:cursor-not-allowed disabled:opacity-20 transition-colors"
        title="Undo"
      >
        <Undo2 size={15} />
      </button>
      <button
        onClick={() => { redo(); markDirty() }}
        disabled={futureStates.length === 0}
        className="rounded-lg p-1.5 text-gray-500 hover:bg-white/10 hover:text-gray-200 disabled:cursor-not-allowed disabled:opacity-20 transition-colors"
        title="Redo"
      >
        <Redo2 size={15} />
      </button>
    </div>
  )
}
