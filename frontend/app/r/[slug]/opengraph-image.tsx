import { ImageResponse } from 'next/og'
import { BACKDROP, Card, EMERALD, Logo, truncate } from '@/components/og/parts'
import type { RoadmapFull } from '@/lib/api-client'

// Link preview for a shared roadmap (WhatsApp, iMessage, Slack, X, …): its
// title, size, and its first few steps drawn as on the canvas.
export const alt = 'A learning roadmap on Trailmap'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
// Previews are fetched by crawlers on every share; an hour-old card is fine.
export const revalidate = 3600

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:4000'

async function fetchPreview(slug: string): Promise<RoadmapFull | null> {
  try {
    // `preview=1` so crawlers fetching the card don't count as views.
    const res = await fetch(`${BACKEND_URL}/api/r/${encodeURIComponent(slug)}?preview=1`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    return ((await res.json()) as { roadmap: RoadmapFull }).roadmap
  } catch {
    return null
  }
}

// Staggered positions for up to three cards, and the curves joining them.
const SLOTS = [
  { x: 790, y: 70 },
  { x: 705, y: 262 },
  { x: 845, y: 452 },
]
const LINKS = ['M 905 158 C 905 210, 820 200, 820 262', 'M 820 352 C 820 410, 960 400, 960 452']

export default async function RoadmapPreviewImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const roadmap = await fetchPreview(slug)

  const trackable = (roadmap?.nodes ?? [])
    .filter((n) => n.type === 'step' || n.type === 'milestone')
    .sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x)
  const milestones = trackable.filter((n) => n.type === 'milestone').length
  const steps = trackable.length - milestones
  const shown = trackable.slice(0, SLOTS.length)

  const title = truncate(roadmap?.title || 'A learning roadmap', 70)
  const stats = [
    steps > 0 && `${steps} step${steps === 1 ? '' : 's'}`,
    milestones > 0 && `${milestones} milestone${milestones === 1 ? '' : 's'}`,
  ]
    .filter(Boolean)
    .join(' · ')

  return new ImageResponse(
    (
      <div style={BACKDROP}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 0 0 80px', width: 620 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Logo size={52} />
            <div style={{ display: 'flex', marginLeft: 16, fontSize: 32, fontWeight: 700, color: 'white' }}>Trailmap</div>
          </div>
          <div
            style={{
              display: 'flex',
              marginTop: 36,
              fontSize: title.length > 40 ? 50 : 62,
              fontWeight: 800,
              lineHeight: 1.1,
              color: 'white',
            }}
          >
            {title}
          </div>
          {stats && (
            <div style={{ display: 'flex', marginTop: 24, fontSize: 28, color: EMERALD }}>{stats}</div>
          )}
          <div style={{ display: 'flex', marginTop: 12, fontSize: 26, color: 'rgba(255,255,255,0.6)' }}>
            Follow it, or fork it into your own.
          </div>
        </div>

        <svg width="1200" height="630" style={{ position: 'absolute', left: 0, top: 0 }}>
          {LINKS.slice(0, Math.max(0, shown.length - 1)).map((d) => (
            <path key={d} d={d} fill="none" stroke="#94a3b8" strokeWidth="4" />
          ))}
        </svg>
        {shown.map((n, i) => (
          <Card
            key={n.id}
            x={SLOTS[i].x}
            y={SLOTS[i].y}
            title={n.data.title || 'Untitled step'}
            state="plain"
            milestone={n.type === 'milestone'}
          />
        ))}
      </div>
    ),
    size,
  )
}
