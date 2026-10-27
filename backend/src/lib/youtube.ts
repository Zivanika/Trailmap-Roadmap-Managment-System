// Mirrored in frontend/lib/youtube.ts; keep the two in sync.
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

/** ISO 8601 duration (PT1H2M3S) → "1:02:03" / "4:05". */
export function formatDuration(iso: string): string | undefined {
  const m = iso.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/)
  if (!m) return undefined
  const [, d, h, min, s] = m.map((x) => Number(x ?? 0))
  const hours = d * 24 + h
  const mm = hours ? String(min).padStart(2, '0') : String(min)
  return `${hours ? `${hours}:` : ''}${mm}:${String(s).padStart(2, '0')}`
}
