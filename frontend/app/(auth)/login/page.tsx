'use client'

import { Suspense, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { api, ApiError } from '@/lib/api-client'

const isDev = process.env.NODE_ENV === 'development'

export default function LoginPage() {
  return (
    <Suspense>
      <AuthCard />
    </Suspense>
  )
}

function AuthCard() {
  const params = useSearchParams()
  const callbackUrl = params.get('callbackUrl') ?? '/dashboard'
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(
    params.get('error') ? 'That sign-in didn’t work. Please try again.' : null,
  )

  // New emails get an account automatically, so sign-in and sign-up are the same step.
  async function sendLink(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const address = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setError('Please enter a valid email address.')
      return
    }
    setState('sending')
    try {
      await api.requestMagicLink(address, callbackUrl)
      setState('sent')
    } catch (err) {
      setState('idle')
      setError(err instanceof ApiError && err.message ? err.message : 'Couldn’t send the email. Please try again.')
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-gradient-to-br from-[#06130d] via-[#082016] to-[#0a2a1b] p-6">
      <div className="tm-fade-up relative flex w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl sm:min-h-[420px] sm:flex-row">
        {/* Green diagonal panel (a plain header band on phones) */}
        <div
          className="pointer-events-none absolute inset-0 hidden bg-gradient-to-br from-[#157347] to-[#0c4a2c] sm:block"
          style={{ clipPath: 'polygon(0 0, 60% 0, 0 100%)' }}
        />

        {/* Left — welcome */}
        <div className="relative z-10 flex flex-col justify-start gap-6 bg-gradient-to-br from-[#157347] to-[#0c4a2c] p-8 text-white sm:w-1/2 sm:bg-none sm:p-10 sm:pt-16">
          <div>
            <h2 className="text-4xl font-extrabold tracking-tight">Welcome!</h2>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-white/90">
              Sign in to save your roadmaps
              <br />
              and track your progress.
            </p>
          </div>
        </div>

        {/* Right — sign in */}
        <div className="relative z-10 flex flex-col justify-center p-8 sm:ml-auto sm:w-1/2 sm:p-10">
          <h1 className="text-3xl font-semibold text-gray-700">Sign in</h1>
          <p className="mt-1 text-sm text-gray-500">New here? The same step creates your account.</p>

          {state === 'sent' ? (
            <div role="status" className="mt-6 rounded-2xl bg-green-50 p-4 text-sm text-green-900">
              <p className="font-semibold">Check your inbox</p>
              <p className="mt-1 text-green-800/80">
                We sent a sign-in link to <span className="font-medium">{email.trim()}</span>. It works once and expires in 15 minutes.
              </p>
              <button onClick={() => setState('idle')} className="mt-3 text-xs font-semibold text-green-700 hover:underline">
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={sendLink} className="mt-6 space-y-3">
              <Field label="Email address" value={email} onChange={setEmail} placeholder="you@example.com" type="email" />
              {error && (
                <p role="alert" className="text-xs text-red-500">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={state === 'sending'}
                className="w-full rounded-full bg-green-700 py-2.5 text-sm font-bold text-white transition-colors hover:bg-green-800 disabled:opacity-60"
              >
                {state === 'sending' ? 'Sending…' : 'Email me a sign-in link'}
              </button>
              {isDev && (
                <button
                  type="button"
                  onClick={() => email.trim() && signIn('dev', { email: email.trim(), callbackUrl })}
                  className="w-full text-[11px] text-amber-600 hover:underline"
                >
                  Dev only: sign in instantly with this email
                </button>
              )}
            </form>
          )}

          <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-wide text-gray-400">
            <span className="h-px flex-1 bg-gray-200" />
            or
            <span className="h-px flex-1 bg-gray-200" />
          </div>

          <button
            onClick={() => signIn('google', { callbackUrl })}
            className="flex w-full items-center justify-center gap-2.5 rounded-full border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <p className="mt-4 text-center text-xs text-gray-400">
            Or{' '}
            <Link href="/try" className="font-semibold text-green-700 hover:underline">
              try the canvas without an account
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type,
  required = true,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  type: string
  required?: boolean
}) {
  return (
    <div>
      <label className="mb-1 block text-sm text-gray-600">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-full border border-gray-300 px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600/20"
      />
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22 22-9.8 22-22c0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 4.1 29.6 2 24 2 15.6 2 8.3 6.8 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 46c5.5 0 10.5-2.1 14.3-5.6l-6.6-5.6C29.7 36.6 27 37.6 24 37.6c-5.2 0-9.6-3.3-11.2-7.9l-6.6 5.1C8.2 41.1 15.5 46 24 46z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.4l6.6 5.6C41.4 36.3 46 31 46 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  )
}
