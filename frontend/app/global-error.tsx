'use client'

/** Last resort when the root layout itself fails; it replaces the whole document. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#06130d', color: 'white', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center', padding: 16 }}>
          <p style={{ fontSize: 36, color: '#34d399', margin: 0 }}>▲</p>
          <h1 style={{ fontSize: 24 }}>Trailmap hit an unexpected error</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)' }}>Please try again. If it keeps happening, reload the page.</p>
          <button
            onClick={reset}
            style={{ marginTop: 12, background: '#10b981', color: '#022c22', border: 0, borderRadius: 12, padding: '10px 18px', fontWeight: 600, cursor: 'pointer' }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
