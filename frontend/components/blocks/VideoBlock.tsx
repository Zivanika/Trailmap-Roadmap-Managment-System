'use client'

import type { VideoBlock } from '@/types'
import { Trash2 } from 'lucide-react'
import { parseYouTubeUrl, youtubeEmbedUrl } from '@/lib/youtube'
import { videoBadge } from '@/lib/video-block'

interface Props {
  block: VideoBlock
  onDelete: () => void
}

export function VideoBlockComponent({ block, onDelete }: Props) {
  const ref = parseYouTubeUrl(block.url)
  const embedUrl = ref ? youtubeEmbedUrl(ref) : null
  const badge = videoBadge(block)

  return (
    <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 group relative">
      {embedUrl ? (
        <iframe //dusri website ka content ko apni website mei show karne ke liye iframe ka use hota hai
          src={embedUrl}
          title={block.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full aspect-video"
        />
      ) : (
        <div className="bg-gray-100 dark:bg-gray-800 p-3 text-sm text-gray-500">
          {block.title || block.url}
        </div>
      )}
      {(badge || block.title) && embedUrl && (
        <p className="flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs text-gray-400">
          <span className="truncate">{block.title}</span>
          {badge && <span className="shrink-0 text-gray-500">{badge}</span>}
        </p>
      )}
      <button
        onClick={onDelete}
        aria-label="Delete video"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-white dark:bg-gray-900 rounded p-1 text-gray-400 hover:text-red-500 transition-opacity shadow"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}
