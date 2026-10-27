'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Loader2 } from 'lucide-react'

export default function VerifyPage() {
  return (
    <Suspense>
      <Verify />
    </Suspense>
  )
}

/** Only same-site paths, so a crafted link can't send someone elsewhere after signing in. */
function safePath(path: string | null) {
  return path && path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/\\') ? path : '/dashboard'
}

/**
 * Where a sign-in email's link lands. Redeeming the token is a POST made here,
 * not on page load, so link scanners that open emails don't use it up.
 */
function Verify() {
  const params = useSearchParams()
  const token = params.get('token')
  const callbackUrl = safePath(params.get('callbackUrl'))
  const [failed, setFailed] = useState(!token)
  const started = useRef(false)

  useEffect(() => {
    // Tokens work once; React's dev double-run of effects mustn't spend it twice.
    if (!token || started.current) return
    started.current = true
    signIn('magic-link', { token, redirect: false }).then((res) => {
      if (res?.ok && !res.error) window.location.replace(callbackUrl)
      else setFailed(true)
    })
  }, [token, callbackUrl])

  return (
    <main className="flex flex-1 items-center justify-center bg-[#06130d] p-6 text-white">
      <div className="max-w-sm text-center">
        <p className="text-3xl text-emerald-400">▲</p>
        {failed ? (
          <>
            <h1 className="mt-4 text-xl font-semibold">This sign-in link didn’t work</h1>
            <p className="mt-2 text-sm text-white/60">It may have expired (links last 15 minutes) or already been used.</p>
            <Link
              href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
              className="mt-6 inline-block rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-400"
            >
              Send a new link
            </Link>
          </>
        ) : (
          <p className="mt-4 flex items-center justify-center gap-2 text-white/70">
            <Loader2 size={16} className="animate-spin" /> Signing you in…
          </p>
        )}
      </div>
    </main>
  )
}
