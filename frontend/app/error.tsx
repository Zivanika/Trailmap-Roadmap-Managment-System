'use client'

import { useEffect } from 'react'
import Link from 'next/link'

/** Error boundary for every route: a crash shows this instead of a blank page. */
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[route error]', error)
  }, [error])

  return (
    <main className="flex flex-1 items-center justify-center bg-[#06130d] px-4 text-white">
      <div className="max-w-md text-center">
        <p className="text-4xl text-emerald-400">▲</p>
        <h1 className="mt-4 text-2xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-white/60">
          This page hit an unexpected error. Your saved work is safe; anything not yet saved on this device is kept and offered
          back when you reopen the roadmap.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-400"
          >
            Try again
          </button>
          <Link href="/dashboard" className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-white/5">
            Go to dashboard
          </Link>
        </div>
        {error.digest && <p className="mt-6 text-xs text-white/30">Error reference: {error.digest}</p>}
      </div>
    </main>
  )
}
