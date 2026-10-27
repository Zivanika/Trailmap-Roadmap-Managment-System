'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { BellPlus, BellRing, Copy, GitFork, Loader2 } from 'lucide-react'
import { toast } from '@/store/toast-store'
import { useCanvasStore } from '@/store/canvas-store'
import { useProgressStore } from '@/store/progress-store'
import { api } from '@/lib/api-client'
import type { RoadmapFull } from '@/lib/api-client'
import { ExportMenu } from './ExportMenu'
import { Canvas } from './Canvas'

export function PublicRoadmapView({ roadmap }: { roadmap: RoadmapFull }) {
  const router = useRouter()
  const pathname = usePathname()
  const { status } = useSession()
  const [follow, setFollow] = useState<{ following: boolean; followers: number; isOwner: boolean } | null>(null)
  const [followBusy, setFollowBusy] = useState(false)
  const setRoadmapId = useCanvasStore((s) => s.setRoadmapId)
  const loadRoadmap = useCanvasStore((s) => s.loadRoadmap)
  const loadedRef = useRef(false)
  const [forking, setForking] = useState(false)

  useEffect(() => {
    if (loadedRef.current) return
    loadedRef.current = true
    setRoadmapId(roadmap.id)
    loadRoadmap(roadmap.nodes ?? [], roadmap.edges ?? [])
    useCanvasStore.temporal.getState().clear()
  }, [roadmap, setRoadmapId, loadRoadmap])

  // Signed-in viewers can track their own progress on a shared roadmap, and follow it.
  useEffect(() => {
    if (status === 'authenticated') {
      useProgressStore.getState().load(roadmap.id)
      api.followStatus(roadmap.id).then(setFollow).catch(() => {})
    } else useProgressStore.getState().reset()
  }, [status, roadmap.id])

  async function toggleFollow() {
    if (!follow) return
    setFollowBusy(true)
    try {
      const next = await api.setFollow(roadmap.id, !follow.following)
      setFollow({ ...follow, ...next })
      if (next.following) toast.success('Following. It’s on your dashboard now.')
    } catch {
      toast.error('Couldn’t update follow. Please try again.')
    } finally {
      setFollowBusy(false)
    }
  }

  async function fork() {
    setForking(true)
    try {
      const { roadmap: copy } = await api.forkRoadmap(roadmap.id)
      router.push(`/roadmap/${copy.id}`)
    } catch {
      setForking(false)
      toast.error('Couldn’t make a copy. Please try again.')
    }
  }

  return (
    <div className="flex h-full flex-1 flex-col">
      <header className="relative z-50 flex items-center justify-between gap-3 border-b border-white/10 bg-neutral-950/60 px-5 py-3 backdrop-blur">
        <div className="flex min-w-0 items-center gap-3">
          {/* Visitors arriving by link can find more roadmaps from here. */}
          <Link href="/explore" title="Explore more roadmaps" className="shrink-0 text-lg font-bold text-emerald-400 hover:text-emerald-300">
            ▲<span className="sr-only">Explore more roadmaps on Trailmap</span>
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold text-white">{roadmap.title}</h1>
            <p className="truncate text-xs text-white/40">
              Read-only · {roadmap.viewCount.toLocaleString('en')} view{roadmap.viewCount === 1 ? '' : 's'}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ExportMenu title={roadmap.title} />
          {follow && !follow.isOwner && (
            <button
              onClick={toggleFollow}
              disabled={followBusy}
              aria-pressed={follow.following}
              title={follow.following ? 'Unfollow' : 'Follow: keep it on your dashboard'}
              className={
                follow.following
                  ? 'flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-60'
                  : 'flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 disabled:opacity-60'
              }
            >
              {follow.following ? <BellRing size={13} /> : <BellPlus size={13} />}
              <span className="hidden sm:inline">{follow.following ? 'Following' : 'Follow'}</span>
              {follow.followers > 0 && <span className="text-white/50">{follow.followers}</span>}
            </button>
          )}
          {status === 'authenticated' ? (
            <button
              onClick={fork}
              disabled={forking}
              className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-gray-900 hover:bg-gray-100 disabled:opacity-60"
            >
              {forking ? <Loader2 size={13} className="animate-spin" /> : roadmap.isTemplate ? <Copy size={13} /> : <GitFork size={13} />}
              {forking ? 'Copying…' : roadmap.isTemplate ? 'Use this template' : 'Fork'}
            </button>
          ) : (
            <Link
              href={`/login?callbackUrl=${encodeURIComponent(pathname)}`}
              className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-gray-900 hover:bg-gray-100"
            >
              {roadmap.isTemplate ? 'Sign in to use' : 'Sign in to fork'}
            </Link>
          )}
        </div>
      </header>
      <div className="min-h-0 flex-1">
        <Canvas localInit={false} autosaveMode="none" readOnly />
      </div>
    </div>
  )
}
