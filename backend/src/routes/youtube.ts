import { Router } from 'express'
import { formatDuration, parseYouTubeUrl, type YouTubeRef } from '../lib/youtube'

const router = Router()

interface Meta {
  kind: 'video' | 'playlist'
  title: string
  thumbnail: string
  author: string
  duration?: string
  itemCount?: number
}

const DATA_API = 'https://www.googleapis.com/youtube/v3'

/** YouTube Data API v3: gives durations and playlist sizes. Needs YOUTUBE_API_KEY. */
async function fromDataApi(ref: YouTubeRef, key: string): Promise<Meta | null> {
  const isVideo = ref.kind === 'video'
  const url = isVideo
    ? `${DATA_API}/videos?part=snippet,contentDetails&id=${ref.id}&key=${key}`
    : `${DATA_API}/playlists?part=snippet,contentDetails&id=${ref.playlistId}&key=${key}`
  const r = await fetch(url)
  if (!r.ok) return null
  const item = ((await r.json()) as { items?: Record<string, any>[] }).items?.[0]
  if (!item) return null
  const thumbs = item.snippet?.thumbnails ?? {}
  return {
    kind: ref.kind,
    title: item.snippet?.title ?? '',
    thumbnail: (thumbs.medium ?? thumbs.high ?? thumbs.default)?.url ?? '',
    author: item.snippet?.channelTitle ?? '',
    ...(isVideo ? { duration: formatDuration(item.contentDetails?.duration ?? '') } : { itemCount: item.contentDetails?.itemCount }),
  }
}

/** Keyless oEmbed fallback: title and thumbnail only. */
async function fromOEmbed(ref: YouTubeRef): Promise<Meta | null> {
  const page =
    ref.kind === 'video' ? `https://www.youtube.com/watch?v=${ref.id}` : `https://www.youtube.com/playlist?list=${ref.playlistId}`
  const r = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(page)}&format=json`)
  if (!r.ok) return null
  const d = (await r.json()) as { title?: string; thumbnail_url?: string; author_name?: string }
  return { kind: ref.kind, title: d.title ?? '', thumbnail: d.thumbnail_url ?? '', author: d.author_name ?? '' }
}

/**
 * GET /api/youtube/metadata?url= — title, thumbnail, and (with YOUTUBE_API_KEY)
 * duration or playlist size for a YouTube link. Falls back to oEmbed.
 */
router.get('/metadata', async (req, res, next) => {
  try {
    const ref = typeof req.query.url === 'string' ? parseYouTubeUrl(req.query.url) : null
    if (!ref) return res.status(400).json({ error: 'A valid YouTube URL is required' })
    const key = process.env.YOUTUBE_API_KEY
    const meta = (key ? await fromDataApi(ref, key).catch(() => null) : null) ?? (await fromOEmbed(ref))
    if (!meta) return res.status(404).json({ error: 'Could not fetch video metadata' })
    res.set('Cache-Control', 'public, max-age=86400')
    res.json(meta)
  } catch (err) {
    next(err)
  }
})

export default router
