'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type RoadmapSummary } from '@/lib/api-client'

export const roadmapKeys = {
  all: ['roadmaps'] as const,
  summary: ['progress-summary'] as const,
  detail: (id: string) => ['roadmap', id] as const,
}

/** List the signed-in user's roadmaps. */
export function useRoadmaps() {
  return useQuery({
    queryKey: roadmapKeys.all,
    queryFn: async () => (await api.listRoadmaps()).roadmaps,
    // Completion stats change in the editor without touching this cache.
    refetchOnMount: 'always',
  })
}

/** Streak, weekly activity and the roadmap to resume. Always refetched on mount, since
 *  progress is toggled outside React Query (see progress-store). */
export function useProgressSummary() {
  return useQuery({
    queryKey: roadmapKeys.summary,
    queryFn: async () => (await api.getProgressSummary()).summary,
    staleTime: 0,
  })
}

/** Load a single roadmap (with graph). */
export function useRoadmap(id: string) {
  return useQuery({
    queryKey: roadmapKeys.detail(id),
    queryFn: async () => (await api.getRoadmap(id)).roadmap,
    enabled: !!id,
  })
}

export function useCreateRoadmap() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (title?: string) => (await api.createRoadmap(title)).roadmap,
    onSuccess: () => qc.invalidateQueries({ queryKey: roadmapKeys.all }),
  })
}

export function useDeleteRoadmap() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteRoadmap(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: roadmapKeys.all }),
  })
}

export function useUpdateRoadmap() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof api.updateRoadmap>[1] }) =>
      api.updateRoadmap(id, patch),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: roadmapKeys.all })
      qc.invalidateQueries({ queryKey: roadmapKeys.detail(id) })
    },
  })
}

/**
 * Duplicate a roadmap. Uses the fork endpoint, which clones the graph with
 * freshly-remapped node/edge ids server-side (copying source ids verbatim would
 * collide on the global PKs), then renames the copy.
 */
export function useDuplicateRoadmap() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (source: RoadmapSummary) => {
      const forked = (await api.forkRoadmap(source.id)).roadmap
      const renamed = (await api.updateRoadmap(forked.id, { title: `Copy of ${source.title}` })).roadmap
      return renamed
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: roadmapKeys.all }),
  })
}
