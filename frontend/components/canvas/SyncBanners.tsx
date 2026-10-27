'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, History, Loader2 } from 'lucide-react'
import { api } from '@/lib/api-client'
import { clearCloudDraft, type CloudDraft } from '@/lib/local-db'
import { roadmapKeys } from '@/hooks/use-roadmaps'
import { useCanvasStore } from '@/store/canvas-store'
import { toast } from '@/store/toast-store'

function Banner({ tone, icon, children }: { tone: 'warn' | 'info'; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className={`flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-4 py-2.5 text-sm ${
        tone === 'warn' ? 'border-amber-400/20 bg-amber-400/10 text-amber-100' : 'border-sky-400/20 bg-sky-400/10 text-sky-100'
      }`}
    >
      {icon}
      {children}
    </div>
  )
}

const BUTTON = 'rounded-lg px-3 py-1 text-xs font-medium disabled:opacity-50'

/**
 * A save was refused because the roadmap was saved somewhere else since this
 * tab loaded it. Saving is paused until the user picks which version to keep.
 */
export function ConflictBanner({ roadmapId }: { roadmapId: string }) {
  const qc = useQueryClient()
  const [busy, setBusy] = useState<'load' | 'keep' | null>(null)

  async function loadLatest() {
    setBusy('load')
    try {
      const { roadmap } = await api.getRoadmap(roadmapId)
      qc.setQueryData(roadmapKeys.detail(roadmapId), roadmap)
      const s = useCanvasStore.getState()
      s.loadRoadmap(roadmap.nodes ?? [], roadmap.edges ?? [])
      s.setVersion(roadmap.version ?? null)
      useCanvasStore.temporal.getState().clear()
      await clearCloudDraft(roadmapId)
    } catch {
      toast.error('Couldn’t load the latest version. Please try again.')
    } finally {
      setBusy(null)
    }
  }

  async function keepMine() {
    setBusy('keep')
    try {
      const s = useCanvasStore.getState()
      const { nodes, edges } = s
      const { version } = await api.saveGraph(roadmapId, nodes, edges, { force: true })
      const now = useCanvasStore.getState()
      now.setVersion(version)
      now.setConflict(false)
      if (now.nodes === nodes && now.edges === edges) {
        now.markClean()
        await clearCloudDraft(roadmapId)
      } else {
        now.markDirty() // newer edits arrived meanwhile; let autosave send them
      }
    } catch {
      toast.error('Couldn’t save your version. Please try again.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <Banner tone="warn" icon={<AlertTriangle size={16} className="shrink-0 text-amber-300" />}>
      <p className="min-w-0 flex-1">
        This roadmap was changed in another tab or on another device. Your changes here aren’t saved yet.
      </p>
      <div className="flex gap-2">
        <button onClick={loadLatest} disabled={busy !== null} className={`${BUTTON} bg-white/10 text-white hover:bg-white/20`}>
          {busy === 'load' ? <Loader2 size={12} className="animate-spin" /> : 'Load latest (discard mine)'}
        </button>
        <button onClick={keepMine} disabled={busy !== null} className={`${BUTTON} bg-amber-300 text-amber-950 hover:bg-amber-200`}>
          {busy === 'keep' ? <Loader2 size={12} className="animate-spin" /> : 'Keep my version'}
        </button>
      </div>
    </Banner>
  )
}

/** Unsaved edits left on this device (crash, closed tab, failed save) for the roadmap being opened. */
export function DraftBanner({ draft, onDone }: { draft: CloudDraft; onDone: () => void }) {
  function restore() {
    const s = useCanvasStore.getState()
    s.loadRoadmap(draft.nodes, draft.edges)
    // Saving from the draft's own base version means that if the roadmap has
    // been saved elsewhere since, the save is refused and the conflict banner asks.
    s.setVersion(draft.baseVersion)
    s.markDirty()
    useCanvasStore.temporal.getState().clear()
    onDone()
  }
  async function discard() {
    await clearCloudDraft(draft.roadmapId)
    onDone()
  }
  const when = new Date(draft.savedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  return (
    <Banner tone="info" icon={<History size={16} className="shrink-0 text-sky-300" />}>
      <p className="min-w-0 flex-1">You have changes from {when} on this device that weren’t saved.</p>
      <div className="flex gap-2">
        <button onClick={discard} className={`${BUTTON} bg-white/10 text-white hover:bg-white/20`}>
          Discard
        </button>
        <button onClick={restore} className={`${BUTTON} bg-sky-300 text-sky-950 hover:bg-sky-200`}>
          Restore them
        </button>
      </div>
    </Banner>
  )
}
