'use client'

import { useState } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { useCanvasStore } from '@/store/canvas-store'
import { useUIStore } from '@/store/ui-store'
import type { ContentBlock, NodeData, NodeType } from '@/types'
import { TextBlockComponent } from '@/components/blocks/TextBlock'
import { LinkBlockComponent } from '@/components/blocks/LinkBlock'
import { VideoBlockComponent } from '@/components/blocks/VideoBlock'
import { ChecklistBlockComponent } from '@/components/blocks/ChecklistBlock'
import { ImageBlockComponent } from '@/components/blocks/ImageBlock'
import { normalizeUrl } from '@/lib/url'
import { addVideoOrLink } from '@/lib/video-block'
import { StatusPicker } from '@/components/nodes/NodeDoneToggle'
import { NodeAiTools } from './NodeAiTools'

const NODE_COLORS: { name: string; bg: string }[] = [
  { name: 'blue', bg: 'bg-blue-400' },
  { name: 'green', bg: 'bg-green-400' },
  { name: 'purple', bg: 'bg-purple-400' },
  { name: 'orange', bg: 'bg-orange-400' },
  { name: 'pink', bg: 'bg-pink-400' },
]

function AddBlockMenu({ onAdd }: { onAdd: (type: ContentBlock['type']) => void }) {
  const [open, setOpen] = useState(false)
  const options: { type: ContentBlock['type']; label: string }[] = [
    { type: 'text', label: 'Text note' },
    { type: 'link', label: 'Link' },
    { type: 'video', label: 'YouTube video' },
    { type: 'image', label: 'Image' },
    { type: 'checklist', label: 'Checklist' },
  ]
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
      >
        <Plus size={14} /> Add resource
      </button>
      {open && (
        <div className="absolute left-0 mt-1 z-50 w-40 rounded-lg border border-gray-200 bg-white shadow-lg dark:bg-gray-900 dark:border-gray-700">
          {options.map((o) => (
            <button
              key={o.type}
              onClick={() => {
                onAdd(o.type)
                setOpen(false)
              }}
              className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// The below function is a component because its returning JSX 
function LinkInput({ onAdd }: { onAdd: (url: string) => void }) {
  const [val, setVal] = useState('')
  return (
    <div className="flex gap-1">
      <input
        autoFocus
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && val.trim()) { onAdd(val.trim()); setVal('') }
        }}
        placeholder="Paste URL and press Enter"
        className="flex-1 text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
      />
    </div>
  )
}

export function NodePanel() {
  const closeSidebar = useUIStore((s) => s.closeSidebar)
  const activePanelNodeId = useUIStore((s) => s.activePanelNodeId)
  const nodes = useCanvasStore((s) => s.nodes)
  const updateNodeData = useCanvasStore((s) => s.updateNodeData)
  const deleteNode = useCanvasStore((s) => s.deleteNode)
  const mode = useCanvasStore((s) => s.mode)

  const node = nodes.find((n) => n.id === activePanelNodeId)
  const [addingLink, setAddingLink] = useState(false)
  const [addingVideo, setAddingVideo] = useState(false)

  if (!node) return null

  const data: NodeData = node.data

  // line 91: yani pehle id nikale then uss id ke help se node ka object mil gaya poora then uss node ka data aur changes joki patch mei hai usse bhejdete update function mein then woh state aur indexdb ko update kardeta
  function patchData(patch: Partial<NodeData>) {
    updateNodeData(node!.id, patch)
  }
//  toh  matlab patchdata mei nodedata ka koi bhi cheez bhej sakte aur nodedata ka strcuture wahi hai jo claude bataya - interface NodeData {
//   title: string
//   color?: string
//   estMinutes?: number
//   blocks: ContentBlock[]
// }

// // So patch can be any of:
// { title: 'New title' }
// { color: 'blue' }
// { estMinutes: 30 }
// { blocks: [...] }
// or any combination
  // updateblock mein poora block object aa jata hai aur uske id ke help se data.blocks mein uss block ko replace kardeta aur phir patchdata ke through update kardeta
  function updateBlock(updated: ContentBlock) {
    patchData({ blocks: data.blocks.map((b) => (b.id === updated.id ? updated : b)) })
  }
  
  function deleteBlock(id: string) {
    patchData({ blocks: data.blocks.filter((b) => b.id !== id) })
  }

  function addBlock(type: ContentBlock['type']) {
    if (type === 'link') { setAddingLink(true); return }
    if (type === 'video') { setAddingVideo(true); return }
    const newBlock: ContentBlock =
      type === 'text'
        ? { id: crypto.randomUUID(), type: 'text', html: '' }
        : type === 'image'
          ? { id: crypto.randomUUID(), type: 'image', url: '' }
          : { id: crypto.randomUUID(), type: 'checklist', items: [] }
    patchData({ blocks: [...data.blocks, newBlock] })
  }

  function commitLink(input: string) {
    const url = normalizeUrl(input)
    let favicon: string | undefined
    try {
      const domain = new URL(url).hostname
      favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=16`
    } catch {
      // invalid URL — no favicon
    }
    const block: ContentBlock = {
      id: crypto.randomUUID(),
      type: 'link',
      url,
      title: url,
      favicon,
    }
    patchData({ blocks: [...data.blocks, block] })
    setAddingLink(false)
  }

  function commitVideo(input: string) {
    addVideoOrLink(node!.id, input)
    setAddingVideo(false)
  }

  const typeLabel: Record<NodeType, string> = {
    step: 'Step',
    milestone: 'Milestone',
    note: 'Note',
    group: 'Group',
  }

  return (
    <aside className="animate-in slide-in-from-right-8 fade-in-0 duration-300 flex flex-col w-80 border-l border-gray-200 bg-white dark:bg-gray-950 dark:border-gray-800 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          {typeLabel[node.type]}
        </span>
        <button
          onClick={closeSidebar}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 space-y-4 p-4">
        {/* Title */}
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Title</label>
          <input
            value={data.title}
            onChange={(e) => patchData({ title: e.target.value })}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
            placeholder="Node title"
          />
        </div>

        {(node.type === 'step' || node.type === 'milestone') && <StatusPicker nodeId={node.id} />}

        {/* Est. time (not for notes) */}
        {node.type !== 'note' && (
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Est. time (min)
            </label>
            <input
              type="number"
              min={0}
              value={data.estMinutes ?? ''}
              onChange={(e) =>
                patchData({ estMinutes: e.target.value ? Number(e.target.value) : undefined })
              }
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
              placeholder="e.g. 30"
            />
          </div>
        )}

        {/* Color (steps only) */}
        {node.type === 'step' && (
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Color</label>
            <div className="mt-1.5 flex gap-2">
              {NODE_COLORS.map(({ name, bg }) => (
                <button
                  key={name}
                  onClick={() => patchData({ color: name })}
                  className={`h-6 w-6 rounded-full border-2 ${
                    data.color === name ? 'border-gray-700 dark:border-gray-200' : 'border-transparent'
                  } ${bg}`}
                  title={name}
                />
              ))}
            </div>
          </div>
        )}

        {/* Content blocks */}
        {node.type !== 'group' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Resources
              </label>
              <AddBlockMenu onAdd={addBlock} />
            </div>

            {addingLink && (
              <div className="mb-2">
                <LinkInput onAdd={commitLink} />
              </div>
            )}
            {addingVideo && (
              <div className="mb-2">
                <LinkInput onAdd={commitVideo} />
              </div>
            )}

            <div className="space-y-3">
              {data.blocks.map((block) => {
                if (block.type === 'text')
                  return (
                    <div key={block.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-2">
                      <TextBlockComponent
                        block={block}
                        onChange={(b) => updateBlock(b)}
                        tone="panel"
                      />
                    </div>
                  )
                if (block.type === 'link')
                  return (
                    <LinkBlockComponent
                      key={block.id}
                      block={block}
                      onDelete={() => deleteBlock(block.id)}
                    />
                  )
                if (block.type === 'video')
                  return (
                    <VideoBlockComponent
                      key={block.id}
                      block={block}
                      onDelete={() => deleteBlock(block.id)}
                    />
                  )
                if (block.type === 'image')
                  return (
                    <ImageBlockComponent
                      key={block.id}
                      block={block}
                      onChange={(b) => updateBlock(b)}
                      onDelete={() => deleteBlock(block.id)}
                    />
                  )
                if (block.type === 'checklist')
                  return (
                    <div key={block.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-2">
                      <ChecklistBlockComponent
                        block={block}
                        onChange={(b) => updateBlock(b)}
                        tone="panel"
                      />
                    </div>
                  )
                return null
              })}
            </div>
          </div>
        )}
        {/* AI needs an account and a saved roadmap, so only in the cloud editor. */}
        {mode === 'cloud' && (node.type === 'step' || node.type === 'milestone') && <NodeAiTools node={node} />}
      </div>

      {/* Delete */}
      <div className="shrink-0 border-t border-gray-100 dark:border-gray-800 p-4">
        <button
          onClick={() => {
            deleteNode(node.id)
            closeSidebar()
          }}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 py-2 text-sm text-red-500 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
        >
          <Trash2 size={14} /> Delete node
        </button>
      </div>
    </aside>
  )
}
