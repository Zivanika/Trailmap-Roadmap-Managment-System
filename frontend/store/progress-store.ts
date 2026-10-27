import { create } from 'zustand'
import { api, ApiError, type ProgressStatus } from '@/lib/api-client'
import { useCanvasStore } from '@/store/canvas-store'

interface ProgressState {
  /** Roadmap progress is currently loaded for (null = tracking disabled, e.g. local canvas). */
  roadmapId: string | null
  statuses: Record<string, ProgressStatus>
  /** True once the server's statuses for `roadmapId` have arrived (or failed to). */
  loaded: boolean

  load: (roadmapId: string) => Promise<void>
  /** One click: done ↔ not done (an in-progress step becomes done). */
  toggleDone: (nodeId: string) => Promise<void>
  setStatus: (nodeId: string, status: ProgressStatus) => Promise<void>
  reset: () => void
}

// Each node's status writes are sent one after another, so a quick double
// click can't reach the server in the wrong order and leave it disagreeing with the UI.
const nodeQueues = new Map<string, Promise<unknown>>()

/** Resolves once the canvas has no unsaved edits (or after a timeout). */
function waitForSave(timeoutMs = 10_000) {
  return new Promise<void>((resolve) => {
    if (!useCanvasStore.getState().isDirty) return resolve()
    const timer = setTimeout(done, timeoutMs)
    const unsubscribe = useCanvasStore.subscribe((s) => !s.isDirty && done())
    function done() {
      clearTimeout(timer)
      unsubscribe()
      resolve()
    }
  })
}

/**
 * A step added moments ago isn't on the server until autosave sends it, so
 * the server says it doesn't exist. Wait for that save and try once more.
 */
async function sendStatus(roadmapId: string, nodeId: string, status: ProgressStatus) {
  try {
    return await api.setProgress(roadmapId, nodeId, status)
  } catch (err) {
    if (!(err instanceof ApiError && err.status === 404) || !useCanvasStore.getState().isDirty) throw err
    await waitForSave()
    return api.setProgress(roadmapId, nodeId, status)
  }
}

export const useProgressStore = create<ProgressState>((set, get) => ({
  roadmapId: null,
  statuses: {},
  loaded: false,

  load: async (roadmapId) => {
    set({ roadmapId, statuses: {}, loaded: false })
    try {
      const { progress } = await api.getProgress(roadmapId)
      const statuses: Record<string, ProgressStatus> = {}
      for (const p of progress) statuses[p.nodeId] = p.status
      // Guard against a race if the roadmap changed mid-fetch.
      if (get().roadmapId === roadmapId) set({ statuses, loaded: true })
    } catch {
      /* leave empty on failure */
      if (get().roadmapId === roadmapId) set({ loaded: true })
    }
  },

  toggleDone: (nodeId) => get().setStatus(nodeId, get().statuses[nodeId] === 'done' ? 'todo' : 'done'),

  setStatus: async (nodeId, next) => {
    const { roadmapId, statuses } = get()
    if (!roadmapId) return
    const prev = statuses[nodeId]
    if (prev === next) return

    // Optimistic update.
    set({ statuses: { ...statuses, [nodeId]: next } })
    const request = (nodeQueues.get(nodeId) ?? Promise.resolve()).then(() => sendStatus(roadmapId, nodeId, next))
    nodeQueues.set(nodeId, request.catch(() => {}))
    try {
      await request
    } catch {
      // Revert on failure, unless the user has toggled again or moved to another roadmap since.
      if (get().roadmapId === roadmapId && get().statuses[nodeId] === next) {
        set((s) => ({ statuses: { ...s.statuses, [nodeId]: prev ?? 'todo' } }))
      }
    }
  },

  reset: () => set({ roadmapId: null, statuses: {}, loaded: false }),
}))
