import { api } from './api-client'
import { normalizeUrl } from './url'
import { parseYouTubeUrl } from './youtube'
import { useCanvasStore } from '@/store/canvas-store'
import type { ContentBlock } from '@/types'

/**
 * Turns a pasted URL into a block: a video block for YouTube links (title,
 * thumbnail, duration or playlist size filled in when they arrive), otherwise
 * a plain link so it still works.
 */
export function addVideoOrLink(nodeId: string, input: string) {
  const url = normalizeUrl(input)
  if (!url) return
  const { nodes, updateNodeData } = useCanvasStore.getState()
  const node = nodes.find((n) => n.id === nodeId)
  if (!node) return
  const ref = parseYouTubeUrl(url)
  const id = crypto.randomUUID()
  const block: ContentBlock = ref
    ? { id, type: 'video', url, title: ref.kind === 'playlist' ? 'YouTube playlist' : 'YouTube video', kind: ref.kind }
    : { id, type: 'link', url, title: url }
  updateNodeData(nodeId, { blocks: [...node.data.blocks, block] })
  if (!ref) return

  api
    .youtubeMetadata(url)
    .then((meta) => {
      const current = useCanvasStore.getState().nodes.find((n) => n.id === nodeId)
      if (!current) return
      useCanvasStore.getState().updateNodeData(nodeId, {
        blocks: current.data.blocks.map((b) =>
          b.id === id && b.type === 'video'
            ? {
                ...b,
                kind: meta.kind,
                title: meta.title || b.title,
                thumbnail: meta.thumbnail || b.thumbnail,
                ...(meta.duration ? { duration: meta.duration } : {}),
                ...(meta.itemCount ? { itemCount: meta.itemCount } : {}),
              }
            : b,
        ),
      })
    })
    .catch(() => {})
}

/** "12:34", "Playlist · 24 videos" or "Playlist", for the card's corner badge. */
export function videoBadge(b: { kind?: 'video' | 'playlist'; duration?: string; itemCount?: number }) {
  if (b.kind === 'playlist') return b.itemCount ? `Playlist · ${b.itemCount} videos` : 'Playlist'
  return b.duration ?? null
}
