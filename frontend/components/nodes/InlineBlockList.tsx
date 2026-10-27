'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Trash2, ExternalLink, Play, X, ChevronLeft } from 'lucide-react'
import { useCanvasStore } from '@/store/canvas-store'
import { normalizeUrl, safeHref } from '@/lib/url'
import { parseYouTubeUrl, youtubeThumbnail } from '@/lib/youtube'
import { addVideoOrLink, videoBadge } from '@/lib/video-block'
import type { ContentBlock, NodeData, TextBlock, ChecklistBlock, ImageBlock } from '@/types'
import { TextBlockComponent } from '@/components/blocks/TextBlock'
import { ChecklistBlockComponent } from '@/components/blocks/ChecklistBlock'
import { ImageBlockComponent } from '@/components/blocks/ImageBlock'

function BlockDeleteButton({ onDelete }: { onDelete: () => void }) {
  return (
    <button
      onClick={onDelete}
      aria-label="Delete block"
      className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-md bg-black/5 text-black/35 opacity-0 transition-opacity hover:bg-red-500/15 hover:text-red-500 group-hover:opacity-100"
    >
      <Trash2 size={11} />
    </button>
  )
}

function BlockRow({
  block,
  onDelete,
  onChange,
}: {
  block: ContentBlock
  onDelete: () => void
  onChange: (b: ContentBlock) => void
}) {
  if (block.type === 'link') {
    return (
      <div className="group flex items-center gap-2 rounded-lg bg-white/50 px-2.5 py-2 text-xs">
        {block.favicon
          ? <img src={block.favicon} alt="" className="h-3.5 w-3.5 shrink-0 rounded-sm" /> // eslint-disable-line @next/next/no-img-element
          : <ExternalLink size={12} className="shrink-0 text-blue-400" />}
        <a
          href={safeHref(block.url)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 min-w-0 truncate text-blue-600 dark:text-blue-400 hover:underline font-medium"
        >
          {block.title || block.url}
        </a>
        <button
          onClick={onDelete}
          className="shrink-0 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-opacity"
        >
          <Trash2 size={11} />
        </button>
      </div>
    )
  }

  if (block.type === 'video') {
    const ref = parseYouTubeUrl(block.url)
    const thumb = ref ? youtubeThumbnail(ref, block.thumbnail) : null
    const badge = videoBadge(block)
    return (
      <div className="group relative rounded-lg overflow-hidden">
        {ref ? (
          // Opens the video (or playlist) on YouTube.
          <a href={safeHref(block.url)} target="_blank" rel="noopener noreferrer" className="block" aria-label={`Watch ${block.title}`}>
            {thumb ? (
              <img // eslint-disable-line @next/next/no-img-element
                src={thumb}
                alt=""
                className="w-full h-[88px] object-cover"
              />
            ) : (
              <div className="h-[88px] w-full bg-gradient-to-br from-red-500/40 to-black/40" />
            )}
            {badge && (
              <span className="absolute right-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">{badge}</span>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/25 transition-colors group-hover:bg-black/35">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow">
                <Play size={12} className="ml-0.5 text-gray-900" fill="currentColor" />
              </div>
            </div>
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5">
              <p className="text-[11px] text-white/90 truncate">{block.title}</p>
            </div>
          </a>
        ) : (
          <div className="flex items-center gap-2 rounded-lg bg-gray-100 dark:bg-white/5 px-2.5 py-2 text-xs text-gray-500">
            <Play size={12} className="text-red-400 shrink-0" />
            <span className="truncate">{block.title || block.url}</span>
          </div>
        )}
        <button
          onClick={onDelete}
          aria-label="Delete video"
          className="absolute top-1.5 left-1.5 opacity-0 group-hover:opacity-100 rounded-md bg-black/50 p-1 text-white/70 hover:text-white transition-opacity"
        >
          <Trash2 size={11} />
        </button>
      </div>
    )
  }

  if (block.type === 'text') {
    return (
      <div className="group relative rounded-lg border border-black/8 bg-white/40 px-2.5 py-2">
        <TextBlockComponent block={block as TextBlock} onChange={onChange as (b: TextBlock) => void} />
        <BlockDeleteButton onDelete={onDelete} />
      </div>
    )
  }

  if (block.type === 'checklist') {
    return (
      <div className="group relative rounded-lg border border-black/8 bg-white/40 px-2.5 py-2">
        <ChecklistBlockComponent
          block={block as ChecklistBlock}
          onChange={onChange as (b: ChecklistBlock) => void}
        />
        <BlockDeleteButton onDelete={onDelete} />
      </div>
    )
  }

  if (block.type === 'image') {
    return (
      <ImageBlockComponent
        block={block as ImageBlock}
        onChange={onChange as (b: ImageBlock) => void}
        onDelete={onDelete}
      />
    )
  }

  return null
}

const BLOCK_OPTIONS: { type: ContentBlock['type']; emoji: string; label: string }[] = [
  { type: 'text',      emoji: '📝', label: 'Text note' },
  { type: 'link',      emoji: '🔗', label: 'Link' },
  { type: 'video',     emoji: '▶',  label: 'YouTube video' },
  { type: 'image',     emoji: '🖼',  label: 'Image' },
  { type: 'checklist', emoji: '✅', label: 'Checklist' },
]

interface Props {
  nodeId: string
  data: NodeData
}

export function InlineBlockList({ nodeId, data }: Props) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [step, setStep] = useState<'menu' | 'link' | 'video'>('menu')
  const [urlVal, setUrlVal] = useState('')

  function openDialog() {
    setStep('menu')
    setUrlVal('')
    setDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
  }

  function patch(blocks: ContentBlock[]) {
    updateNodeData(nodeId, { blocks })
  }

  function updateBlock(updated: ContentBlock) {
    patch(data.blocks.map((b) => (b.id === updated.id ? updated : b)))
  }

  function deleteBlock(id: string) {
    patch(data.blocks.filter((b) => b.id !== id))
  }

  function chooseType(type: ContentBlock['type']) {
    if (type === 'link')  { setStep('link');  setUrlVal(''); return }
    if (type === 'video') { setStep('video'); setUrlVal(''); return }
    const block: ContentBlock =
      type === 'text'
        ? { id: crypto.randomUUID(), type: 'text', html: '' }
        : type === 'image'
          ? { id: crypto.randomUUID(), type: 'image', url: '' }
          : { id: crypto.randomUUID(), type: 'checklist', items: [] }
    patch([...data.blocks, block])
    closeDialog()
  }

  function commitLink() {
    const url = normalizeUrl(urlVal)
    if (!url) return
    let favicon: string | undefined
    try { favicon = `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=16` } catch {}
    patch([...data.blocks, { id: crypto.randomUUID(), type: 'link', url, title: url, favicon }])
    closeDialog()
  }

  function commitVideo() {
    if (!urlVal.trim()) return
    addVideoOrLink(nodeId, urlVal)
    closeDialog()
  }

  return (
    <div
      className="nodrag nopan"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Block list */}
      {data.blocks.length > 0 && (
        <div className="space-y-2 px-3 pb-2 pt-2">
          {data.blocks.map((block) => (
            <BlockRow key={block.id} block={block} onDelete={() => deleteBlock(block.id)} onChange={updateBlock} />
          ))}
        </div>
      )}

      {/* Add resource */}
      <div className="px-3 pb-3">
        <button
          onClick={openDialog}
          className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-black/35 hover:bg-black/8 hover:text-black/60 transition-colors"
        >
          <Plus size={12} className="shrink-0" />
          Add resource
        </button>
      </div>

      {/* Dialog — portalled to body so the card's clip-path / overflow can't clip it */}
      {dialogOpen && createPortal(
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
          onMouseDown={(e) => { e.stopPropagation(); closeDialog() }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Panel */}
          <div
            className="relative w-full max-w-xs overflow-hidden rounded-2xl border border-black/5 bg-white shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-black/5 px-4 py-3">
              {step !== 'menu' ? (
                <button
                  onClick={() => setStep('menu')}
                  className="-ml-1 flex items-center gap-1 rounded-md px-1 py-0.5 text-xs text-gray-500 hover:text-gray-800"
                >
                  <ChevronLeft size={14} /> Back
                </button>
              ) : (
                <h3 className="text-sm font-semibold text-gray-800">Add a resource</h3>
              )}
              <button
                onClick={closeDialog}
                aria-label="Close"
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            {step === 'menu' && (
              <div className="grid grid-cols-1 gap-1 p-2">
                {BLOCK_OPTIONS.map((o) => (
                  <button
                    key={o.type}
                    onClick={() => chooseType(o.type)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <span className="text-base">{o.emoji}</span>
                    {o.label}
                  </button>
                ))}
              </div>
            )}

            {(step === 'link' || step === 'video') && (
              <div className="space-y-3 p-4">
                <label className="block text-xs font-medium text-gray-600">
                  {step === 'link' ? 'Link URL' : 'YouTube URL'}
                </label>
                <input
                  autoFocus
                  value={urlVal}
                  onChange={(e) => setUrlVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') step === 'link' ? commitLink() : commitVideo()
                    if (e.key === 'Escape') closeDialog()
                  }}
                  placeholder={step === 'link' ? 'https://example.com' : 'https://youtube.com/watch?v=…'}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-black/10"
                />
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={closeDialog}
                    className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => (step === 'link' ? commitLink() : commitVideo())}
                    disabled={!urlVal.trim()}
                    className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
