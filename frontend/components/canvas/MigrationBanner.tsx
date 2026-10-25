'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { X, Cloud, Loader2, Check } from 'lucide-react'
import { listRoadmaps, db } from '@/lib/local-db'
import { api } from '@/lib/api-client'
import { uploadToCloudinary } from '@/lib/upload'
import type { LocalRoadmap, CanvasNode } from '@/types'

/**
 * Rewrites local `localblob:` image URLs to Cloudinary secure URLs so images
 * survive the move to the cloud. Blobs that can't be uploaded are left as-is.
 */
async function reuploadBlobs(roadmap: LocalRoadmap): Promise<LocalRoadmap> {
  const nodes: CanvasNode[] = await Promise.all(
    roadmap.nodes.map(async (n) => {
      const blocks = await Promise.all(
        (n.data.blocks ?? []).map(async (b) => {
          if (b.type !== 'image' || !b.url.startsWith('localblob:')) return b
          const row = await db.blobs.get(b.url.slice('localblob:'.length))
          if (!row) return b
          const url = await uploadToCloudinary(row.blob)
          return url ? { ...b, url } : b
        }),
      )
      return { ...n, data: { ...n.data, blocks } }
    }),
  )
  return { ...roadmap, nodes }
}

const DISMISSED_KEY = 'trailmap:migration-banner-dismissed'
const MIGRATED_KEY = 'trailmap:migrated'

/**
 * Local roadmap id → its `updatedAt` when it was last synced. Per roadmap (it
 * used to be one flag) so work done on this device after a sync is offered again.
 */
function readMigrated(locals: LocalRoadmap[]): Record<string, number> {
  const raw = localStorage.getItem(MIGRATED_KEY)
  if (raw === '1') {
    // Old all-or-nothing flag: count what exists now as synced.
    const migrated = Object.fromEntries(locals.map((r) => [r.id, r.updatedAt]))
    localStorage.setItem(MIGRATED_KEY, JSON.stringify(migrated))
    return migrated
  }
  try {
    return raw ? (JSON.parse(raw) as Record<string, number>) : {}
  } catch {
    return {}
  }
}

export function MigrationBanner() {
  const { status } = useSession()
  const [dismissed, setDismissed] = useState(
    () => typeof window !== 'undefined' && localStorage.getItem(DISMISSED_KEY) === '1',
  )
  const [locals, setLocals] = useState<LocalRoadmap[]>([])
  const [state, setState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle')

  // Load non-empty local roadmaps that changed since they were last synced, once.
  useEffect(() => {
    listRoadmaps().then((rows) => {
      const migrated = readMigrated(rows)
      setLocals(rows.filter((r) => r.nodes.length > 0 && migrated[r.id] !== r.updatedAt))
    })
  }, [])

  if (dismissed || locals.length === 0) return null

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, '1')
    setDismissed(true)
  }

  async function migrate() {
    setState('saving')
    try {
      // Re-upload any local image blobs to Cloudinary first so they aren't lost.
      const prepared = await Promise.all(locals.map(reuploadBlobs))
      await api.importRoadmaps(
        prepared.map((r) => ({
          localId: r.id,
          title: r.title,
          description: r.description,
          nodes: r.nodes,
          edges: r.edges,
        })),
      )
      const migrated = readMigrated([])
      for (const r of locals) migrated[r.id] = r.updatedAt
      localStorage.setItem(MIGRATED_KEY, JSON.stringify(migrated))
      setState('done')
    } catch {
      setState('error')
    }
  }

  const count = locals.length
  const plural = count === 1 ? 'roadmap' : 'roadmaps'

  return (
    <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 animate-in fade-in-0 slide-in-from-bottom-4 duration-500 items-center gap-3 rounded-2xl border border-white/10 bg-neutral-900/95 px-4 py-2.5 text-sm shadow-xl backdrop-blur">
      <Cloud size={16} className="shrink-0 text-blue-400" />

      {status !== 'authenticated' ? (
        <span className="text-white/80">
          {count} local {plural} saved on this device.{' '}
          <Link href="/login" className="font-semibold text-white underline">
            Sign in to sync
          </Link>
        </span>
      ) : state === 'done' ? (
        <span className="flex items-center gap-1.5 text-emerald-300">
          <Check size={15} /> Synced!{' '}
          <Link href="/dashboard" className="font-semibold underline">
            Open dashboard
          </Link>
        </span>
      ) : (
        <>
          <span className="text-white/80">
            Save {count} local {plural} to your account?
          </span>
          <button
            onClick={migrate}
            disabled={state === 'saving'}
            className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1 text-xs font-medium text-gray-900 hover:bg-gray-100 disabled:opacity-60"
          >
            {state === 'saving' && <Loader2 size={13} className="animate-spin" />}
            {state === 'saving' ? 'Saving…' : 'Save to account'}
          </button>
          {state === 'error' && <span className="text-xs text-red-400">Failed — try again</span>}
        </>
      )}

      <button
        onClick={dismiss}
        className="ml-1 text-white/40 hover:text-white/70"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  )
}
