'use client'

import { createPortal } from 'react-dom'
import { usePrefersReducedMotion } from '@/hooks/use-motion'

const COLORS = ['#6EDEA0', '#7EC8F5', '#FFD233', '#C49FF5', '#FF8FAB', '#FFB347']
const PIECES = 36

/** Deterministic 0..1 noise so the pieces can be computed once, outside render. */
const noise = (i: number, k: number) => {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453
  return x - Math.floor(x)
}

const PIECE_STYLES = Array.from({ length: PIECES }, (_, i) => ({
  color: COLORS[i % COLORS.length],
  x: `${Math.round((noise(i, 1) - 0.5) * 90)}vw`,
  y: `${Math.round(40 + noise(i, 2) * 50)}vh`,
  r: `${Math.round((noise(i, 3) - 0.5) * 1080)}deg`,
  delay: Math.round(noise(i, 4) * 150),
  w: 6 + Math.round(noise(i, 5) * 6),
}))

/** One-shot CSS confetti burst from the top centre of the screen. */
export function Confetti() {
  const reduced = usePrefersReducedMotion()

  if (reduced) return null

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[2000] flex justify-center" aria-hidden>
      {PIECE_STYLES.map((p, i) => (
        <span
          key={i}
          className="absolute top-0 rounded-[2px]"
          style={{
            width: p.w,
            height: p.w * 0.45,
            background: p.color,
            animation: `tm-confetti 1400ms cubic-bezier(0.2, 0.7, 0.4, 1) ${p.delay}ms forwards`,
            '--tm-x': p.x,
            '--tm-y': p.y,
            '--tm-r': p.r,
          } as React.CSSProperties}
        />
      ))}
    </div>,
    document.body,
  )
}
