import { ImageResponse } from 'next/og'
import { BACKDROP, Card, EMERALD, Logo, NextUpTag } from '@/components/og/parts'

// Default share card for every page. Shared roadmaps (/r/[slug]) have their own.
export const alt = 'Trailmap: build and share learning roadmaps'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={BACKDROP}>
        {/* Left: brand + pitch */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 0 0 80px', width: 620 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Logo size={72} />
            <div style={{ display: 'flex', marginLeft: 20, fontSize: 44, fontWeight: 700, color: 'white' }}>Trailmap</div>
          </div>
          <div style={{ display: 'flex', marginTop: 40, fontSize: 60, fontWeight: 800, lineHeight: 1.1, color: 'white' }}>
            Build and share learning roadmaps
          </div>
          <div style={{ display: 'flex', marginTop: 24, fontSize: 28, lineHeight: 1.4, color: 'rgba(255,255,255,0.6)' }}>
            Plan the steps, follow the trail, tick them off as you go.
          </div>
        </div>

        {/* Right: a small trail, drawn like the canvas */}
        <svg width="1200" height="630" style={{ position: 'absolute', left: 0, top: 0 }}>
          <path d="M 905 158 C 905 210, 820 200, 820 262" fill="none" stroke={EMERALD} strokeWidth="5" />
          <path d="M 820 352 C 820 410, 960 400, 960 452" fill="none" stroke="#94a3b8" strokeWidth="4" />
        </svg>
        <Card x={790} y={70} title="HTTP basics" state="done" />
        <Card x={705} y={262} title="SQL basics" state="next" />
        <Card x={845} y={452} title="Build a REST API" state="locked" />
        <NextUpTag x={705} y={222} />
      </div>
    ),
    size,
  )
}
