import type { CanvasNode, CanvasEdge } from '@/types'

/**
 * Typed client for the backend, routed through the same-origin proxy
 * (`/api/proxy/*`) which injects the Bearer token. See app/api/proxy.
 */

const BASE = '/api/proxy'

export type Visibility = 'private' | 'unlisted' | 'public'
export type ProgressStatus = 'todo' | 'in_progress' | 'done'

export interface RoadmapSummary {
  id: string
  title: string
  description?: string
  visibility: Visibility
  shareSlug?: string
  tags: string[]
  coverUrl?: string
  viewCount: number
  /** Graph version; a save must name the version it was built on. */
  version?: number
  /** Featured in the template gallery. */
  isTemplate?: boolean
  /** The signed-in user is an admin and may feature it as a template (owner endpoints only). */
  canFeature?: boolean
  createdAt: string
  updatedAt: string
  /** Completion stats + per-type node counts (present on the list endpoint). */
  totalSteps?: number
  doneSteps?: number
  counts?: { step: number; milestone: number; note: number; group: number }
}

export interface ProgressSummary {
  /** Consecutive days (ending today or yesterday) with at least one step done. */
  streak: number
  doneToday: number
  doneThisWeek: number
  /** Steps completed on each of the last 7 days, oldest first; last entry is today. */
  week: number[]
  /** The most recently active roadmap that still has steps left, if any. */
  resume: {
    roadmapId: string
    title: string
    href: string
    nextStep: string
    totalSteps: number
    doneSteps: number
    lastActiveAt: string
  } | null
}

export interface FollowedRoadmap {
  id: string
  title: string
  description?: string
  shareSlug: string
  visibility: Visibility
  tags: string[]
  viewCount: number
  updatedAt: string
  followedAt: string
  totalSteps: number
  doneSteps: number
}

export interface StepSuggestion {
  type: 'step' | 'milestone'
  title: string
  description: string | null
  estMinutes: number | null
}

export interface ResourceIdea {
  kind: 'video' | 'article' | 'docs' | 'course' | 'practice'
  title: string
  query: string
}

export interface YouTubeMeta {
  kind: 'video' | 'playlist'
  title: string
  thumbnail: string
  author: string
  duration?: string
  itemCount?: number
}

export interface ExploreItem {
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

export interface RoadmapFull extends RoadmapSummary {
  nodes: CanvasNode[]
  edges: CanvasEdge[]
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!res.ok) {
    let msg = res.statusText
    try {
      const body = await res.json()
      msg = body?.error ?? msg
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, msg)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

/** Strip React Flow runtime fields; keep only what the backend persists. */
export function serializeGraph(nodes: CanvasNode[], edges: CanvasEdge[]) {
  // Dedupe by id so a stray duplicate can't trigger a PK collision on save.
  const uniqNodes = [...new Map(nodes.map((n) => [n.id, n])).values()]
  const uniqEdges = [...new Map(edges.map((e) => [e.id, e])).values()]
  return {
    nodes: uniqNodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      width: n.width ?? null,
      height: n.height ?? null,
      parentId: n.parentId ?? null,
      data: n.data,
    })),
    edges: uniqEdges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: typeof e.label === 'string' ? e.label : null,
      style: e.style ?? null,
    })),
  }
}

export const api = {
  listRoadmaps: () => request<{ roadmaps: RoadmapSummary[] }>('/roadmaps'),

  createRoadmap: (title?: string) =>
    request<{ roadmap: RoadmapSummary }>('/roadmaps', {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),

  getRoadmap: (id: string) => request<{ roadmap: RoadmapFull }>(`/roadmaps/${id}`),

  updateRoadmap: (
    id: string,
    patch: Partial<Pick<RoadmapSummary, 'title' | 'description' | 'tags' | 'visibility' | 'coverUrl' | 'isTemplate'>>,
  ) =>
    request<{ roadmap: RoadmapSummary }>(`/roadmaps/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),

  deleteRoadmap: (id: string) =>
    request<void>(`/roadmaps/${id}`, { method: 'DELETE' }),

  /**
   * Replaces the whole graph. `baseVersion` is the version it was loaded from:
   * a 409 means someone saved since (another tab or device). `force` overwrites.
   */
  saveGraph: (id: string, nodes: CanvasNode[], edges: CanvasEdge[], opts: { baseVersion?: number | null; force?: boolean } = {}) =>
    request<{ ok: boolean; nodeCount: number; edgeCount: number; version: number }>(
      `/roadmaps/${id}/graph`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          ...serializeGraph(nodes, edges),
          ...(opts.baseVersion != null ? { baseVersion: opts.baseVersion } : {}),
          ...(opts.force ? { force: true } : {}),
        }),
      },
    ),

  importRoadmaps: (
    roadmaps: {
      localId: string
      title?: string
      description?: string
      nodes: CanvasNode[]
      edges: CanvasEdge[]
    }[],
  ) =>
    request<{ idMap: Record<string, string> }>('/roadmaps/import', {
      method: 'POST',
      body: JSON.stringify({
        roadmaps: roadmaps.map((r) => ({
          localId: r.localId,
          title: r.title,
          description: r.description,
          ...serializeGraph(r.nodes, r.edges),
        })),
      }),
    }),

  generateRoadmap: (input: { goal: string; level?: string; timeBudget?: string }) =>
    request<{ nodes: CanvasNode[]; edges: CanvasEdge[]; cached: boolean }>('/ai/generate', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  signUpload: () =>
    request<{
      signature: string
      timestamp: number
      folder: string
      apiKey: string
      cloudName: string
      uploadUrl: string
    }>('/uploads/sign', { method: 'POST' }),

  youtubeMetadata: (url: string) => request<YouTubeMeta>(`/youtube/metadata?url=${encodeURIComponent(url)}`),

  suggestNext: (roadmapId: string, nodeId: string, title: string) =>
    request<{ suggestions: StepSuggestion[]; cached: boolean }>('/ai/suggest-next', {
      method: 'POST',
      body: JSON.stringify({ roadmapId, nodeId, title }),
    }),

  findResources: (roadmapId: string, nodeId: string, title: string) =>
    request<{ resources: ResourceIdea[]; cached: boolean }>('/ai/find-resources', {
      method: 'POST',
      body: JSON.stringify({ roadmapId, nodeId, title }),
    }),

  listFollowing: () => request<{ roadmaps: FollowedRoadmap[] }>('/roadmaps/following'),

  followStatus: (id: string) => request<{ following: boolean; followers: number; isOwner: boolean }>(`/roadmaps/${id}/follow`),

  setFollow: (id: string, following: boolean) =>
    request<{ following: boolean; followers: number }>(`/roadmaps/${id}/follow`, { method: following ? 'POST' : 'DELETE' }),

  requestMagicLink: (email: string, callbackUrl?: string) =>
    request<{ ok: true }>('/auth/magic-link', { method: 'POST', body: JSON.stringify({ email, callbackUrl }) }),

  /** Public: templates featured in the gallery. */
  listTemplates: () => request<{ roadmaps: ExploreItem[] }>('/explore?templates=1&sort=popular'),

  /** Public: a shared roadmap's graph, without counting a view. */
  getSharedGraph: (slug: string) => request<{ roadmap: RoadmapFull }>(`/r/${encodeURIComponent(slug)}?preview=1`),

  getProgress: (roadmapId: string) =>
    request<{ progress: { nodeId: string; status: ProgressStatus; completedAt: string | null }[] }>(
      `/progress/${roadmapId}`,
    ),

  getProgressSummary: () =>
    request<{ summary: ProgressSummary }>(`/progress/summary?tz=${new Date().getTimezoneOffset()}`),

  setProgress: (roadmapId: string, nodeId: string, status: ProgressStatus) =>
    request<{ progress: { nodeId: string; status: ProgressStatus; completedAt: string | null } }>(
      '/progress',
      { method: 'POST', body: JSON.stringify({ roadmapId, nodeId, status }) },
    ),

  forkRoadmap: (id: string) =>
    request<{ roadmap: RoadmapSummary }>(`/roadmaps/${id}/fork`, { method: 'POST' }),
}
