// Server-side reads of the public explore listing (used by /explore and the sitemap).
import { backendFetch } from './backend'

export interface ExploreRoadmap {
  title: string
  description?: string
  tags: string[]
  shareSlug: string
  viewCount: number
  forkCount: number
  steps: number
  milestones: number
  isTemplate: boolean
  updatedAt: string
}

export type ExploreSort = 'popular' | 'recent'

async function get<T>(path: string, revalidate: number): Promise<T | null> {
  try {
    // Cached and shared across visitors, so it's made on nobody's behalf.
    const res = await backendFetch(`/api/explore${path}`, { next: { revalidate } }, { clientIp: null })
    return res.ok ? ((await res.json()) as T) : null
  } catch {
    return null
  }
}

export function listExplore(params: { q?: string; tag?: string; sort: ExploreSort; page: number; templates?: boolean }) {
  const qs = new URLSearchParams({ sort: params.sort, page: String(params.page) })
  if (params.q) qs.set('q', params.q)
  if (params.tag) qs.set('tag', params.tag)
  if (params.templates) qs.set('templates', '1')
  return get<{ roadmaps: ExploreRoadmap[]; page: number; hasMore: boolean }>(`?${qs}`, 60)
}

export function listExploreTags() {
  return get<{ tags: { tag: string; count: number }[] }>('/tags', 60)
}

export function listSitemapRoadmaps() {
  return get<{ roadmaps: { shareSlug: string; updatedAt: string }[] }>('/sitemap', 3600)
}
