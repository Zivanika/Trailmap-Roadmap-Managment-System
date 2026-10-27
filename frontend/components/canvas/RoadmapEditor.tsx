'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, CloudOff, Loader2, Share2 } from 'lucide-react'
import { useCanvasStore } from '@/store/canvas-store'
import { useProgressStore } from '@/store/progress-store'
import { useRoadmap, useUpdateRoadmap } from '@/hooks/use-roadmaps'
import { UserMenu } from '@/components/auth/UserMenu'
import { ProgressMeter } from './ProgressMeter'
import { ExportMenu } from './ExportMenu'
import { Canvas } from './Canvas'
import { ShareDialog, VISIBILITY_META } from './ShareDialog'
import { ConflictBanner, DraftBanner } from './SyncBanners'
import { clearCloudDraft, getCloudDraft, type CloudDraft } from '@/lib/local-db'
import { sameGraph } from '@/lib/same-graph'
import { toast } from '@/store/toast-store'

export function RoadmapEditor({ id }: { id: string }) {
  const { data: roadmap, isLoading, isError } = useRoadmap(id)
  const setRoadmapId = useCanvasStore((s) => s.setRoadmapId)
  const loadRoadmap = useCanvasStore((s) => s.loadRoadmap)
  const isDirty = useCanvasStore((s) => s.isDirty)
  const saveFailed = useCanvasStore((s) => s.saveFailed)
  const canvasRoadmapId = useCanvasStore((s) => s.roadmapId)
  const conflict = useCanvasStore((s) => s.conflict)
  const [draft, setDraft] = useState<CloudDraft | null>(null)
  const loadedRef = useRef<string | null>(null)

  // Hydrate the canvas store once the roadmap arrives.
  useEffect(() => {
    if (roadmap && loadedRef.current !== roadmap.id) {
      loadedRef.current = roadmap.id
      setRoadmapId(roadmap.id)
      loadRoadmap(roadmap.nodes ?? [], roadmap.edges ?? [])
      useCanvasStore.getState().setVersion(roadmap.version ?? null)
      useCanvasStore.temporal.getState().clear()
      useProgressStore.getState().load(roadmap.id)
      // Unsaved edits left on this device? Offer them back, unless the server already has exactly that.
      getCloudDraft(roadmap.id)
        .then((d) => {
          if (!d) return
          if (sameGraph(d, { nodes: roadmap.nodes ?? [], edges: roadmap.edges ?? [] })) return clearCloudDraft(roadmap.id)
          setDraft(d)
        })
        .catch(() => {})
    }
  }, [roadmap, setRoadmapId, loadRoadmap])

  // The query refetches when the window regains focus. If another tab or device
  // saved a newer version and nothing here is unsaved, show it; with unsaved
  // edits, the next save is refused instead and the conflict banner asks.
  useEffect(() => {
    if (!roadmap || loadedRef.current !== roadmap.id || roadmap.version == null) return
    const s = useCanvasStore.getState()
    if (s.roadmapId !== roadmap.id || s.version == null || roadmap.version <= s.version || s.isDirty || s.conflict) return
    s.loadRoadmap(roadmap.nodes ?? [], roadmap.edges ?? [])
    s.setVersion(roadmap.version)
    useCanvasStore.temporal.getState().clear()
    toast.info('Updated with changes saved in another tab or on another device.')
  }, [roadmap])

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center text-white/50">
        <Loader2 className="animate-spin" size={20} />
      </div>
    )
  }
  if (isError || !roadmap) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <p className="text-white/60">Couldn’t load this roadmap.</p>
        <Link href="/dashboard" className="text-sm text-white/80 underline">
          Back to dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-1 flex-col">
      <EditorTopBar roadmap={roadmap} dirty={isDirty} saveFailed={saveFailed} />
      {conflict && <ConflictBanner roadmapId={roadmap.id} />}
      {draft && !conflict && <DraftBanner draft={draft} onDone={() => setDraft(null)} />}
      <div className="min-h-0 flex-1">
        {/* Wait for the store to hold this roadmap, so the canvas never shows another one's nodes or a false empty state. */}
        {canvasRoadmapId === roadmap.id && <Canvas localInit={false} autosaveMode="cloud" />}
      </div>
    </div>
  )
}

function EditorTopBar({
  roadmap,
  dirty,
  saveFailed,
}: {
  roadmap: NonNullable<ReturnType<typeof useRoadmap>['data']>
  dirty: boolean
  saveFailed: boolean
}) {
  const update = useUpdateRoadmap()
  const [title, setTitle] = useState(roadmap.title)
  const [sharing, setSharing] = useState(false)
  const Vis = VISIBILITY_META[roadmap.visibility]

  function commitTitle() {
    const next = title.trim()
    if (next && next !== roadmap.title) {
      update.mutate({ id: roadmap.id, patch: { title: next } })
    } else {
      setTitle(roadmap.title)
    }
  }

  return (
    <header className="relative z-50 flex items-center gap-2 border-b border-white/10 bg-neutral-950/60 px-3 py-2.5 backdrop-blur sm:gap-3 sm:px-4">
      <Link
        href="/dashboard"
        className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-white/60 hover:bg-white/5 hover:text-white"
      >
        <ArrowLeft size={16} />
      </Link>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={commitTitle}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        className="min-w-0 flex-1 rounded-md bg-transparent px-2 py-1 text-sm font-semibold text-white hover:bg-white/5 focus:bg-white/5 focus:outline-none"
      />

      <ProgressMeter />

      <span
        role="status"
        title={saveFailed ? 'Not saved, retrying' : dirty ? 'Saving' : 'Saved'}
        className={`flex shrink-0 items-center gap-1 text-xs ${saveFailed ? 'text-amber-300' : 'text-white/40'}`}
      >
        {saveFailed ? (
          <>
            <CloudOff size={12} /> <span className="hidden sm:inline">Not saved, retrying…</span>
          </>
        ) : dirty ? (
          <>
            <Loader2 size={12} className="animate-spin" /> <span className="hidden sm:inline">Saving…</span>
          </>
        ) : (
          <>
            <Check size={12} /> <span className="hidden sm:inline">Saved</span>
          </>
        )}
      </span>

      <ExportMenu title={roadmap.title} />

      {/* One button for every visibility; it shows where the roadmap stands now. */}
      <button
        onClick={() => setSharing(true)}
        className={
          roadmap.visibility === 'private'
            ? 'flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-gray-900 hover:bg-gray-100'
            : 'flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-200 hover:bg-emerald-500/25'
        }
      >
        {roadmap.visibility === 'private' ? <Share2 size={13} /> : <Vis.icon size={13} />}
        {roadmap.visibility === 'private' ? 'Share' : Vis.label}
      </button>
      {sharing && <ShareDialog roadmap={roadmap} onClose={() => setSharing(false)} />}

      <UserMenu />
    </header>
  )
}
