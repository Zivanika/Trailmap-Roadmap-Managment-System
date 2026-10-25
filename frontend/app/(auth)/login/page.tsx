'use client'

import { Suspense, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

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
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const isLogin = mode === 'login'

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email.trim()) {
      setError('Please enter your email.')
      return
    }
    // Real password auth isn't wired to the backend yet. In development the
    // email signs you in via the dev provider; in production use Google below.
    if (isDev) {
      signIn('dev', { email: email.trim(), callbackUrl })
      return
    }
    setError('Email/password sign-in isn’t enabled yet — continue with Google.')
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-gradient-to-br from-[#06130d] via-[#082016] to-[#0a2a1b] p-6">
      <div className={`tm-fade-up relative flex w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl sm:flex-row ${isDev ? 'sm:min-h-[500px]' : 'sm:min-h-[380px]'}`}>
        {/* Green diagonal panel (a plain header band on phones) */}
        <div
          className="pointer-events-none absolute inset-0 hidden bg-gradient-to-br from-[#157347] to-[#0c4a2c] sm:block"
          style={{ clipPath: 'polygon(0 0, 60% 0, 0 100%)' }}
        />

        {/* Left — welcome / toggle */}
        <div className="relative z-10 flex flex-col justify-start gap-6 bg-gradient-to-br from-[#157347] to-[#0c4a2c] p-8 text-white sm:w-1/2 sm:bg-none sm:p-10 sm:pt-16">
          <div>
            <h2 key={mode} className="tm-fade-up text-4xl font-extrabold tracking-tight">
              {isLogin ? 'Welcome!' : 'Hello!'}
            </h2>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-white/90">
              {!isDev ? (
                <>
                  Sign in to save your roadmaps
                  <br />
                  and track your progress.
                </>
              ) : isLogin ? (
                <>
                  Create your account.
                  <br />
                  For Free!
                </>
              ) : (
                <>
                  Already have
                  <br />
                  an account?
                </>
              )}
            </p>
          </div>
          {isDev && (
            <button
              onClick={() => { setMode(isLogin ? 'signup' : 'login'); setError(null) }}
              className="w-fit rounded-full border-2 border-white px-8 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/15"
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          )}
        </div>

        {/* Right — form */}
        <div className="relative z-10 flex flex-col justify-center p-8 sm:ml-auto sm:w-1/2 sm:p-10">
          <h1 className="text-3xl font-semibold text-gray-700">{!isDev || isLogin ? 'Sign in' : 'Sign Up'}</h1>

          {/* Email/password isn't wired to the backend yet, so production shows only
              Google. The form stays for the dev provider. */}
          {isDev && (
            <>
              <form onSubmit={submit} className="mt-6 space-y-4">
                {!isLogin && (
                  <Field label="Full name" value={name} onChange={setName} placeholder="Your name" type="text" required={false} />
                )}
                <Field label="Username/Email address" value={email} onChange={setEmail} placeholder="Username or Email" type="email" />
                <Field label="Password" value={password} onChange={setPassword} placeholder="Password" type="password" />

                {error && <p className="text-xs text-red-500">{error}</p>}

                <button
                  type="submit"
                  className="w-full rounded-full border-2 border-green-700 py-2.5 text-sm font-bold text-green-800 transition-colors hover:bg-green-50"
                >
                  {isLogin ? 'Sign In' : 'Create account'}
                </button>
              </form>

              <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-wide text-gray-400">
                <span className="h-px flex-1 bg-gray-200" />
                or
                <span className="h-px flex-1 bg-gray-200" />
              </div>
            </>
          )}

          <button
            onClick={() => signIn('google', { callbackUrl })}
            className={`${isDev ? '' : 'mt-6 '}flex w-full items-center justify-center gap-2.5 rounded-full border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50`}
          >
            <GoogleIcon />
            Continue with Google
          </button>

          {!isDev && (
            <p className="mt-4 text-center text-xs text-gray-400">
              Or{' '}
              <Link href="/try" className="font-semibold text-green-700 hover:underline">
                try the canvas without an account
              </Link>
            </p>
          )}
          {isDev && isLogin && (
            <p className="mt-4 cursor-pointer text-sm font-semibold text-green-700 hover:underline">
              Forgot password?
            </p>
          )}
          {isDev && (
            <p className="mt-3 text-[11px] text-amber-600">Dev: any email signs you in.</p>
          )}
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
