import { useEffect } from 'react'
import { useCanvasStore } from '@/store/canvas-store'
import { clearCloudDraft, saveCloudDraft, saveRoadmap } from '@/lib/local-db'
import { api, ApiError } from '@/lib/api-client'
import { toast } from '@/store/toast-store'
import type { CanvasEdge, CanvasNode } from '@/types'

const DEBOUNCE_MS = 800
const MAX_RETRY_MS = 30_000
const DRAFT_DEBOUNCE_MS = 250

export type AutosaveMode = 'local' | 'cloud' | 'none'

interface Snapshot {
  roadmapId: string
  nodes: CanvasNode[]
  edges: CanvasEdge[]
}

/**
 * Debounced autosave driven by the canvas store's `isDirty` flag.
 *  - 'local' → IndexedDB (Dexie), for anonymous users.
 *  - 'cloud' → PATCH /roadmaps/:id/graph via the backend proxy, for signed-in users.
 *  - 'none'  → disabled (read-only views).
 *
 * Each save sends the whole graph, so saves run one at a time: two in flight
 * could land out of order and leave the older graph on the server. A save
 * still pending when the canvas unmounts is sent straight away, before the next
 * roadmap replaces the store's contents. Failures retry with backoff and set
 * `saveFailed` so the UI can say so.
 *
 * Cloud saves also:
 *  - name the version they were built on; a 409 (saved elsewhere since) stops
 *    saving and sets `conflict` for the editor to resolve;
 *  - keep a draft on this device until the server has it, so a crash, a closed
 *    tab or a failed save never loses the edits. The draft is written shortly
 *    after each change, well before the save, since a tab can close any time.
 */
export function useAutosave(mode: AutosaveMode = 'local') {
  useEffect(() => {
    if (mode === 'none') return

    let timer: ReturnType<typeof setTimeout> | null = null
    let draftTimer: ReturnType<typeof setTimeout> | null = null
    let queue: Promise<void> = Promise.resolve()
    let failures = 0
    let disposed = false

    async function writeCloud({ roadmapId, nodes, edges }: Snapshot) {
      // Read at write time, not when queued: the previous save may have just bumped it.
      const baseVersion = useCanvasStore.getState().version
      const savedAt = Date.now()
      await saveCloudDraft({ roadmapId, nodes, edges, baseVersion, savedAt }).catch(() => {})
      const { version } = await api.saveGraph(roadmapId, nodes, edges, { baseVersion })
      const now = useCanvasStore.getState()
      if (now.roadmapId === roadmapId) now.setVersion(version)
      // Keep the draft if there are newer edits than what was just saved; the next save replaces it.
      // (If the editor has moved on to another roadmap, there can't be newer edits to this one.)
      if (now.roadmapId !== roadmapId || (now.nodes === nodes && now.edges === edges)) {
        await clearCloudDraft(roadmapId, savedAt).catch(() => {})
      }
    }

    function write(snap: Snapshot) {
      if (mode === 'cloud') return writeCloud(snap)
      return saveRoadmap({
        id: snap.roadmapId,
        title: 'Untitled roadmap',
        nodes: snap.nodes,
        edges: snap.edges,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    }

    function save() {
      timer = null
      const { roadmapId, nodes, edges, isDirty, conflict } = useCanvasStore.getState()
      // While a conflict is open, saving would just be refused again.
      if (!isDirty || !roadmapId || conflict) return
      const snap = { roadmapId, nodes, edges }
      queue = queue.then(async () => {
        try {
          await write(snap)
          const now = useCanvasStore.getState()
          // Only clean if nothing changed while the request was in flight.
          if (now.roadmapId === snap.roadmapId && now.nodes === snap.nodes && now.edges === snap.edges) {
            now.markClean()
          }
          if (failures > 0) toast.dismissKey('autosave')
          failures = 0
          if (now.saveFailed) now.setSaveFailed(false)
        } catch (err) {
          if (err instanceof ApiError && err.status === 409) {
            const now = useCanvasStore.getState()
            if (now.roadmapId === snap.roadmapId) now.setConflict(true)
            return
          }
          console.error('[autosave] failed', err)
          failures++
          if (disposed) return
          useCanvasStore.getState().setSaveFailed(true)
          if (failures === 1) {
            toast.error('Couldn’t save your latest changes. Retrying; they’re kept on this device meanwhile.', {
              key: 'autosave',
              durationMs: 0,
            })
          }
          schedule(Math.min(MAX_RETRY_MS, 2000 * 2 ** (failures - 1)))
        }
      })
    }

    function scheduleDraft() {
      if (mode !== 'cloud') return
      if (draftTimer) clearTimeout(draftTimer)
      draftTimer = setTimeout(() => {
        draftTimer = null
        const { roadmapId, nodes, edges, isDirty, version } = useCanvasStore.getState()
        if (!isDirty || !roadmapId) return
        saveCloudDraft({ roadmapId, nodes, edges, baseVersion: version, savedAt: Date.now() }).catch(() => {})
      }, DRAFT_DEBOUNCE_MS)
    }

    function schedule(delay = DEBOUNCE_MS) {
      if (timer) clearTimeout(timer)
      timer = setTimeout(save, delay)
    }

    const unsubscribe = useCanvasStore.subscribe((state, prev) => {
      if (!state.isDirty || !state.roadmapId) return
      // Selecting a node doesn't change the graph; don't push the save back for it.
      if (prev.isDirty && state.nodes === prev.nodes && state.edges === prev.edges) return
      scheduleDraft()
      schedule()
    })

    // Closing the tab mid-save would drop the last edits; ask first.
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (useCanvasStore.getState().isDirty) e.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)

    return () => {
      disposed = true
      unsubscribe()
      window.removeEventListener('beforeunload', onBeforeUnload)
      toast.dismissKey('autosave')
      if (draftTimer) clearTimeout(draftTimer)
      if (timer) {
        clearTimeout(timer)
        save()
      }
    }
  }, [mode])
}
