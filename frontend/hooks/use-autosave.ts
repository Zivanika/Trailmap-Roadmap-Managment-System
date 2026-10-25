import { useEffect } from 'react'
import { useCanvasStore } from '@/store/canvas-store'
import { saveRoadmap } from '@/lib/local-db'
import { api } from '@/lib/api-client'
import type { CanvasEdge, CanvasNode } from '@/types'

const DEBOUNCE_MS = 800
const MAX_RETRY_MS = 30_000

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
 */
export function useAutosave(mode: AutosaveMode = 'local') {
  useEffect(() => {
    if (mode === 'none') return

    let timer: ReturnType<typeof setTimeout> | null = null
    let queue: Promise<void> = Promise.resolve()
    let failures = 0
    let disposed = false

    function write({ roadmapId, nodes, edges }: Snapshot) {
      if (mode === 'cloud') return api.saveGraph(roadmapId, nodes, edges).then(() => undefined)
      return saveRoadmap({
        id: roadmapId,
        title: 'Untitled roadmap',
        nodes,
        edges,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    }

    function save() {
      timer = null
      const { roadmapId, nodes, edges, isDirty } = useCanvasStore.getState()
      if (!isDirty || !roadmapId) return
      const snap = { roadmapId, nodes, edges }
      queue = queue.then(async () => {
        try {
          await write(snap)
          failures = 0
          const now = useCanvasStore.getState()
          // Only clean if nothing changed while the request was in flight.
          if (now.roadmapId === snap.roadmapId && now.nodes === snap.nodes && now.edges === snap.edges) {
            now.markClean()
          }
          if (now.saveFailed) now.setSaveFailed(false)
        } catch (err) {
          console.error('[autosave] failed', err)
          failures++
          if (disposed) return
          useCanvasStore.getState().setSaveFailed(true)
          schedule(Math.min(MAX_RETRY_MS, 2000 * 2 ** (failures - 1)))
        }
      })
    }

    function schedule(delay = DEBOUNCE_MS) {
      if (timer) clearTimeout(timer)
      timer = setTimeout(save, delay)
    }

    const unsubscribe = useCanvasStore.subscribe((state, prev) => {
      if (!state.isDirty || !state.roadmapId) return
      // Selecting a node doesn't change the graph; don't push the save back for it.
      if (prev.isDirty && state.nodes === prev.nodes && state.edges === prev.edges) return
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
      if (timer) {
        clearTimeout(timer)
        save()
      }
    }
  }, [mode])
}
