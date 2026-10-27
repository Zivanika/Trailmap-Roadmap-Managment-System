import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Page not found', robots: { index: false } }

/** Branded 404, also used when a shared roadmap is private or doesn't exist. */
export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center bg-[#06130d] px-4 text-white">
      <div className="max-w-md text-center">
        <svg viewBox="0 0 160 80" className="mx-auto h-20 w-40" aria-hidden>
          <path d="M14 64 C 50 64, 50 22, 86 30 S 126 54, 140 20" fill="none" stroke="rgb(52 211 153)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="4 7" />
          <circle cx="14" cy="64" r="5" fill="rgb(52 211 153)" />
          <text x="140" y="26" textAnchor="middle" fontSize="18" fill="#FFD233">?</text>
        </svg>
        <h1 className="mt-4 text-2xl font-bold">This trail doesn’t go anywhere</h1>
        <p className="mt-2 text-white/60">
          The page doesn’t exist, or it’s a roadmap its owner has made private.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/explore" className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-400">
            Explore roadmaps
          </Link>
          <Link href="/" className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-white/5">
            Home
          </Link>
        </div>
      </div>
    </main>
  )
}
