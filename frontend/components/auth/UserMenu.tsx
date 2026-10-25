'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { LogOut, User as UserIcon, LayoutDashboard } from 'lucide-react'

export function UserMenu() {
  const { data: session, status } = useSession()
  const [open, setOpen] = useState(false)
  const [imgError, setImgError] = useState(false)

  if (status === 'loading') {
    return <div className="h-9 w-9 animate-pulse rounded-full bg-white/10" />
  }

  if (!session?.user) {
    return (
      <Link
        href="/login"
        className="rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-gray-900 shadow-lg transition-colors hover:bg-white"
      >
        Sign in
      </Link>
    )
  }

  const { name, email, image } = session.user
  const initial = (name ?? email ?? '?').charAt(0).toUpperCase()

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-white/10 text-sm font-semibold text-white shadow-lg ring-1 ring-white/15 transition-colors hover:bg-white/20"
        aria-label="Account menu"
      >
        {image && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            // Google avatars (lh3.googleusercontent.com) 403 when a referrer is sent.
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          initial
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-50 w-56 origin-top-right overflow-hidden rounded-xl animate-in fade-in-0 zoom-in-95 duration-150 border border-white/10 bg-neutral-900 shadow-2xl">
            <div className="flex items-center gap-2 border-b border-white/10 px-3 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70">
                <UserIcon size={16} />
              </div>
              <div className="min-w-0">
                {name && <p className="truncate text-sm font-medium text-white">{name}</p>}
                <p className="truncate text-xs text-white/50">{email}</p>
              </div>
            </div>
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-white/80 transition-colors hover:bg-white/5"
            >
              <LayoutDashboard size={15} />
              Dashboard
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="flex w-full items-center gap-2 border-t border-white/10 px-3 py-2.5 text-left text-sm text-white/80 transition-colors hover:bg-white/5"
            >
              <LogOut size={15} />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  )
}
