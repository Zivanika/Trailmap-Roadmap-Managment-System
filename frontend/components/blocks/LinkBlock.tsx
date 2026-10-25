'use client'

import type { LinkBlock } from '@/types'
import { ExternalLink, Trash2 } from 'lucide-react'
import { safeHref } from '@/lib/url'

interface Props {
  block: LinkBlock
  onDelete: () => void
}

export function LinkBlockComponent({ block, onDelete }: Props) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 group">
      {block.favicon && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={block.favicon} alt="" className="h-4 w-4 shrink-0" />
      )}
      <a
        href={safeHref(block.url)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 min-w-0 text-sm text-blue-600 hover:underline truncate dark:text-blue-400"
      >
        {block.title || block.url}
      </a>
      <ExternalLink size={13} className="shrink-0 text-gray-400" />
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}
