'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, CloudOff, Globe, Loader2, Share2 } from 'lucide-react'
import { useCanvasStore } from '@/store/canvas-store'
import { useProgressStore } from '@/store/progress-store'
import { useRoadmap, useUpdateRoadmap } from '@/hooks/use-roadmaps'
import { UserMenu } from '@/components/auth/UserMenu'
import { ProgressMeter } from './ProgressMeter'
import { ExportMenu } from './ExportMenu'
import { Canvas } from './Canvas'

export function RoadmapEditor({ id }: { id: string }) {
  const { data: roadmap, isLoading, isError } = useRoadmap(id)
  const setRoadmapId = useCanvasStore((s) => s.setRoadmapId)
  const loadRoadmap = useCanvasStore((s) => s.loadRoadmap)
  const isDirty = useCanvasStore((s) => s.isDirty)
  const saveFailed = useCanvasStore((s) => s.saveFailed)
  const canvasRoadmapId = useCanvasStore((s) => s.roadmapId)
  const loadedRef = useRef<string | null>(null)

  // Hydrate the canvas store once the roadmap arrives.
  useEffect(() => {
    if (roadmap && loadedRef.current !== roadmap.id) {
      loadedRef.current = roadmap.id
      setRoadmapId(roadmap.id)
      loadRoadmap(roadmap.nodes ?? [], roadmap.edges ?? [])
      useCanvasStore.temporal.getState().clear()
      useProgressStore.getState().load(roadmap.id)
    }
  }, [roadmap, setRoadmapId, loadRoadmap])

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
  const [copied, setCopied] = useState(false)

  const isPublic = roadmap.visibility !== 'private'

  function commitTitle() {
    const next = title.trim()
    if (next && next !== roadmap.title) {
      update.mutate({ id: roadmap.id, patch: { title: next } })
    } else {
      setTitle(roadmap.title)
    }
  }

  function publish() {
    update.mutate({ id: roadmap.id, patch: { visibility: 'public' } })
  }

  async function copyShareLink() {
    if (!roadmap.shareSlug) return
    const url = `${window.location.origin}/r/${roadmap.shareSlug}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <header className="relative z-50 flex items-center gap-3 border-b border-white/10 bg-neutral-950/60 px-4 py-2.5 backdrop-blur">
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

      <span className={`flex items-center gap-1 text-xs ${saveFailed ? 'text-amber-300' : 'text-white/40'}`}>
        {saveFailed ? (
          <>
            <CloudOff size={12} /> Not saved, retrying…
          </>
        ) : dirty ? (
          <>
            <Loader2 size={12} className="animate-spin" /> Saving…
          </>
        ) : (
          <>
            <Check size={12} /> Saved
          </>
        )}
      </span>

      <ExportMenu title={roadmap.title} />

      {isPublic ? (
        <button
          onClick={copyShareLink}
          className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20"
        >
          {copied ? <Check size={13} /> : <Share2 size={13} />}
          {copied ? 'Copied!' : 'Share'}
        </button>
      ) : (
        <button
          onClick={publish}
          disabled={update.isPending}
          className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-gray-900 hover:bg-gray-100 disabled:opacity-50"
        >
          <Globe size={13} />
          Publish
        </button>
      )}

      <UserMenu />
    </header>
  )
}
