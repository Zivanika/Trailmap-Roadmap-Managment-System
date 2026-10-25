// Building blocks for the next/og share images. Satori needs inline styles
// and `display: flex` on every multi-child element.

export const EMERALD = '#34d399'

/** Full-size dark canvas with the editor's dot grid. */
export const BACKDROP: React.CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  position: 'relative',
  background: '#07190f',
  backgroundImage: 'radial-gradient(circle, #1e4535 1.5px, transparent 1.5px)',
  backgroundSize: '28px 28px',
  fontFamily: 'sans-serif',
}

/** The app icon (same drawing as app/icon.svg). */
export function Logo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <rect width="64" height="64" rx="14" fill="#0b2116" />
      <path d="M8 50 L32 12 L56 50 Z" fill={EMERALD} stroke={EMERALD} strokeWidth="4" strokeLinejoin="round" />
      <path d="M22 50 C 22 42, 40 42, 38 34 C 36 27, 28 28, 31 19" fill="none" stroke="#0b2116" strokeWidth="4.5" strokeLinecap="round" />
    </svg>
  )
}

export function NextUpTag({ x, y }: { x: number; y: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        display: 'flex',
        padding: '4px 14px',
        borderRadius: 999,
        background: EMERALD,
        color: '#022c22',
        fontSize: 18,
        fontWeight: 700,
      }}
    >
      Next up
    </div>
  )
}

type CardState = 'done' | 'next' | 'locked' | 'plain'

/** A sticky-note card like the ones on the canvas. */
export function Card({
  x,
  y,
  title,
  state,
  milestone = false,
}: {
  x: number
  y: number
  title: string
  state: CardState
  milestone?: boolean
}) {
  const label = milestone ? 'Milestone' : 'Step'
  const ink = milestone ? '#451a03' : '#172554'
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: 230,
        display: 'flex',
        flexDirection: 'column',
        padding: '18px 20px',
        borderRadius: 6,
        background: milestone ? '#FFD233' : '#7EC8F5',
        opacity: state === 'done' ? 0.6 : state === 'locked' ? 0.45 : 1,
        boxShadow: state === 'next' ? `0 0 0 4px ${EMERALD}, 0 0 44px rgba(52,211,153,0.6)` : '6px 10px 0 rgba(0,0,0,0.28)',
      }}
    >
      {/* Glyphs drawn as SVG: emoji or symbols missing from the default font make next/og fetch fonts at build time. */}
      <div style={{ display: 'flex', alignItems: 'center', fontSize: 16, color: ink, opacity: 0.55, fontWeight: 600 }}>
        <svg width="18" height="18" viewBox="0 0 18 18">
          <circle cx="9" cy="9" r="7.5" fill="none" stroke={ink} strokeWidth="1.8" />
          {state === 'done' && <path d="M5.5 9.2 L8 11.6 L12.6 6.6" fill="none" stroke={ink} strokeWidth="1.8" />}
        </svg>
        <div style={{ display: 'flex', marginLeft: 8 }}>{state === 'locked' ? `${label} · locked` : label}</div>
      </div>
      <div
        style={{
          display: 'flex',
          marginTop: 6,
          fontSize: 24,
          fontWeight: 700,
          color: ink,
          textDecoration: state === 'done' ? 'line-through' : 'none',
        }}
      >
        {truncate(title, 24)}
      </div>
    </div>
  )
}

export function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text
}
