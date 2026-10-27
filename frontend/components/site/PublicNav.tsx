import Link from 'next/link'
import Image from 'next/image'
import { UserMenu } from '@/components/auth/UserMenu'

/** Top bar for pages anyone can open without signing in (explore). */
export function PublicNav() {
  return (
    <nav className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
      <Link href="/" className="flex items-center gap-2 text-lg font-bold text-white">
        <Image src="/icon-192.png" alt="Trailmap" width={28} height={28} className="rounded-md" />
        Trailmap
      </Link>
      <div className="flex items-center gap-1 sm:gap-2">
        <Link href="/explore" className="rounded-lg px-3 py-2 text-sm font-medium text-white hover:bg-white/5">
          Explore
        </Link>
        <Link href="/try" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-white/70 hover:text-white sm:block">
          Try the canvas
        </Link>
        <UserMenu />
      </div>
    </nav>
  )
}
