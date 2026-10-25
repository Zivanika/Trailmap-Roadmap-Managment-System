import { create } from 'zustand'
import { api, type ProgressStatus } from '@/lib/api-client'

interface ProgressState {
  /** Roadmap progress is currently loaded for (null = tracking disabled, e.g. local canvas). */
  roadmapId: string | null
  statuses: Record<string, ProgressStatus>
  /** True once the server's statuses for `roadmapId` have arrived (or failed to). */
  loaded: boolean

  load: (roadmapId: string) => Promise<void>
  toggleDone: (nodeId: string) => Promise<void>
  reset: () => void
}

// Each node's status writes are sent one after another, so a quick double
// click can't reach the server in the wrong order and leave it disagreeing with the UI.
const nodeQueues = new Map<string, Promise<unknown>>()

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

  toggleDone: async (nodeId) => {
    const { roadmapId, statuses } = get()
    if (!roadmapId) return
    const prev = statuses[nodeId]
    const next: ProgressStatus = prev === 'done' ? 'todo' : 'done'

    // Optimistic update.
    set({ statuses: { ...statuses, [nodeId]: next } })
    const request = (nodeQueues.get(nodeId) ?? Promise.resolve()).then(() => api.setProgress(roadmapId, nodeId, next))
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
