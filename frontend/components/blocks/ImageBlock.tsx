'use client'

import { useEffect, useRef, useState } from 'react'
import type { ImageBlock } from '@/types'
import { Trash2, ImageIcon } from 'lucide-react'
import { db } from '@/lib/local-db'
import { useCanvasStore } from '@/store/canvas-store'
import { uploadToCloudinary } from '@/lib/upload'
import { normalizeUrl } from '@/lib/url'

interface Props {
  block: ImageBlock
  onChange: (block: ImageBlock) => void
  onDelete: () => void
}

export function ImageBlockComponent({ block, onChange, onDelete }: Props) {
  const roadmapId = useCanvasStore((s) => s.roadmapId) ?? ''
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [urlInput, setUrlInput] = useState('')
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!block.url.startsWith('localblob:')) {
      setObjectUrl(null)
      return
    }
    const blobId = block.url.slice('localblob:'.length)
    let revokeUrl: string | null = null
    let mounted = true

    db.blobs.get(blobId).then((row) => {
      if (!mounted || !row) return
      revokeUrl = URL.createObjectURL(row.blob)
      setObjectUrl(revokeUrl)
    })

    return () => {
      mounted = false
      if (revokeUrl) URL.revokeObjectURL(revokeUrl)
    }
  }, [block.url])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      // Prefer a cloud URL (persists across devices); fall back to a local blob.
      const cloudUrl = await uploadToCloudinary(file)
      if (cloudUrl) {
        onChange({ ...block, url: cloudUrl, alt: block.alt || file.name })
      } else {
        const id = crypto.randomUUID()
        await db.blobs.put({ id, roadmapId, blob: file })
        onChange({ ...block, url: `localblob:${id}`, alt: block.alt || file.name })
      }
    } finally {
      setUploading(false)
    }
  }

  function commitUrl() {
    const trimmed = normalizeUrl(urlInput)
    if (!trimmed) return
    onChange({ ...block, url: trimmed })
    setUrlInput('')
    setShowUrlInput(false)
  }

  const displayUrl = block.url.startsWith('localblob:') ? objectUrl : block.url || null

  if (!displayUrl) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 overflow-hidden">
        {showUrlInput ? (
          <div className="p-2 flex gap-1">
            <input
              autoFocus
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && commitUrl()}
              placeholder="Paste image URL and press Enter"
              className="flex-1 text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
            />
          </div>
        ) : (
          <div className="flex gap-2 p-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex flex-1 flex-col items-center gap-1.5 py-4 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-xs disabled:opacity-60"
            >
              <ImageIcon size={20} />
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
            <button
              onClick={() => setShowUrlInput(true)}
              className="flex flex-1 flex-col items-center gap-1.5 py-4 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-xs"
            >
              <span className="text-base leading-none">🔗</span>
              Paste URL
            </button>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    )
  }

  return (
    <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 group relative">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={displayUrl} alt={block.alt ?? ''} className="w-full object-contain max-h-48" />
      <button
        onClick={onDelete}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-white dark:bg-gray-900 rounded p-1 text-gray-400 hover:text-red-500 transition-opacity shadow"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}
