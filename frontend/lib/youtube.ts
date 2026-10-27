// Mirrors backend/src/lib/youtube.ts (parseYouTubeUrl); keep the two in sync.
export type YouTubeRef = { kind: 'video'; id: string; playlistId?: string } | { kind: 'playlist'; playlistId: string }

const HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be', 'www.youtube-nocookie.com'])
const ID = /^[A-Za-z0-9_-]{6,64}$/

/**
 * Reads a YouTube link: watch?v=, youtu.be/, /shorts/, /embed/, /live/,
 * playlist?list=, and a video inside a playlist. Null for anything else.
 */
export function parseYouTubeUrl(raw: string): YouTubeRef | null {
  let u: URL
  try {
    u = new URL(raw.trim())
  } catch {
    return null
  }
  if (!HOSTS.has(u.hostname)) return null
  const list = u.searchParams.get('list')
  const playlistId = list && ID.test(list) ? list : undefined

  let id: string | null = null
  if (u.hostname === 'youtu.be') id = u.pathname.split('/')[1] ?? null
  else if (u.pathname === '/watch') id = u.searchParams.get('v')
  else {
    const m = u.pathname.match(/^\/(shorts|embed|live|v)\/([^/?#]+)/)
    if (m && m[2] !== 'videoseries') id = m[2]
  }

  if (id && ID.test(id)) return { kind: 'video', id, ...(playlistId ? { playlistId } : {}) }
  if (playlistId) return { kind: 'playlist', playlistId }
  return null
}

/** The iframe URL for a video (optionally inside its playlist) or a whole playlist. */
export function youtubeEmbedUrl(ref: YouTubeRef): string {
  if (ref.kind === 'playlist') return `https://www.youtube.com/embed/videoseries?list=${ref.playlistId}`
  return `https://www.youtube.com/embed/${ref.id}${ref.playlistId ? `?list=${ref.playlistId}` : ''}`
}

/** A thumbnail: the stored one, else a video's default frame (playlists have none without the API). */
export function youtubeThumbnail(ref: YouTubeRef, stored?: string): string | null {
  if (stored) return stored
  return ref.kind === 'video' ? `https://img.youtube.com/vi/${ref.id}/mqdefault.jpg` : null
}
