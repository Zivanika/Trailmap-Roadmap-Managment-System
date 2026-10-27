'use client'

import { useState } from 'react'
import { BookOpen, Dumbbell, ExternalLink, FileText, GraduationCap, Lightbulb, Loader2, Plus, Search, Sparkles, Video } from 'lucide-react'
import { api, ApiError, type ResourceIdea, type StepSuggestion } from '@/lib/api-client'
import { resourceSearchUrl } from '@/lib/url'
import { useCanvasStore } from '@/store/canvas-store'
import type { CanvasNode } from '@/types'

const KIND_ICON: Record<ResourceIdea['kind'], typeof Video> = {
  video: Video,
  article: FileText,
  docs: BookOpen,
  course: GraduationCap,
  practice: Dumbbell,
}

function message(err: unknown) {
  if (err instanceof ApiError) {
    if (err.status === 401) return 'Sign in to use AI.'
    return err.message || 'Something went wrong. Please try again.'
  }
  return 'Something went wrong. Please try again.'
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * AI help for one step: suggest what comes next (added as connected steps
 * below it) and find study material (as search links; the model never writes URLs).
 */
export function NodeAiTools({ node }: { node: CanvasNode }) {
  const roadmapId = useCanvasStore((s) => s.roadmapId)
  const [suggestions, setSuggestions] = useState<StepSuggestion[] | null>(null)
  const [resources, setResources] = useState<ResourceIdea[] | null>(null)
  const [busy, setBusy] = useState<'suggest' | 'resources' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [added, setAdded] = useState(0)

  const title = node.data.title.trim()

  async function run(kind: 'suggest' | 'resources') {
    if (!roadmapId || !title) return
    setBusy(kind)
    setError(null)
    try {
      if (kind === 'suggest') setSuggestions((await api.suggestNext(roadmapId, node.id, title)).suggestions)
      else setResources((await api.findResources(roadmapId, node.id, title)).resources)
    } catch (err) {
      setError(message(err))
    } finally {
      setBusy(null)
    }
  }

  function addSuggestion(s: StepSuggestion, i: number) {
    const { nodes, addConnectedNode } = useCanvasStore.getState()
    // Fan out below the current step, stepping past anything already there.
    let x = node.position.x + (added - 1) * 260
    const y = node.position.y + 190
    while (nodes.some((n) => Math.abs(n.position.x - x) < 120 && Math.abs(n.position.y - y) < 60)) x += 260
    const next: CanvasNode = {
      id: crypto.randomUUID(),
      type: s.type,
      position: { x, y },
      data: {
        title: s.title,
        color: node.data.color ?? 'blue',
        ...(s.estMinutes ? { estMinutes: s.estMinutes } : {}),
        blocks: s.description ? [{ id: crypto.randomUUID(), type: 'text', html: `<p>${escapeHtml(s.description)}</p>` }] : [],
      },
    }
    addConnectedNode(node.id, next)
    setAdded((n) => n + 1)
    setSuggestions((list) => list?.filter((_, j) => j !== i) ?? null)
  }

  function addResource(r: ResourceIdea, i: number) {
    const current = useCanvasStore.getState().nodes.find((n) => n.id === node.id)
    if (!current) return
    useCanvasStore.getState().updateNodeData(node.id, {
      blocks: [...current.data.blocks, { id: crypto.randomUUID(), type: 'link', url: resourceSearchUrl(r.kind, r.query), title: r.title }],
    })
    setResources((list) => list?.filter((_, j) => j !== i) ?? null)
  }

  return (
    <div className="rounded-xl border border-violet-400/20 bg-violet-500/[0.06] p-3">
      <p className="flex items-center gap-1.5 text-xs font-medium text-violet-200">
        <Sparkles size={13} /> AI help
      </p>
      {!title && <p className="mt-2 text-xs text-white/50">Give this step a title to get suggestions.</p>}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          onClick={() => run('suggest')}
          disabled={!title || busy !== null}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-white/5 px-2 py-2 text-xs font-medium text-white hover:bg-white/10 disabled:opacity-40"
        >
          {busy === 'suggest' ? <Loader2 size={13} className="animate-spin" /> : <Lightbulb size={13} />} Suggest next steps
        </button>
        <button
          onClick={() => run('resources')}
          disabled={!title || busy !== null}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-white/5 px-2 py-2 text-xs font-medium text-white hover:bg-white/10 disabled:opacity-40"
        >
          {busy === 'resources' ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />} Find resources
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}

      {suggestions && (
        <ul className="mt-3 space-y-1.5" aria-label="Suggested next steps">
          {suggestions.length === 0 && <li className="text-xs text-white/50">All added.</li>}
          {suggestions.map((s, i) => (
            <li key={`${s.title}-${i}`} className="flex items-start gap-2 rounded-lg bg-white/5 px-2.5 py-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white">{s.type === 'milestone' ? '🏆 ' : ''}{s.title}</p>
                {s.description && <p className="mt-0.5 text-xs text-white/50">{s.description}</p>}
              </div>
              <button
                onClick={() => addSuggestion(s, i)}
                aria-label={`Add “${s.title}” after this step`}
                className="flex shrink-0 items-center gap-1 rounded-md bg-violet-500/20 px-2 py-1 text-xs text-violet-100 hover:bg-violet-500/30"
              >
                <Plus size={12} /> Add
              </button>
            </li>
          ))}
        </ul>
      )}

      {resources && (
        <ul className="mt-3 space-y-1.5" aria-label="Resource ideas">
          {resources.length === 0 && <li className="text-xs text-white/50">No more ideas.</li>}
          {resources.map((r, i) => {
            const Icon = KIND_ICON[r.kind] ?? FileText
            return (
              <li key={`${r.query}-${i}`} className="flex items-start gap-2 rounded-lg bg-white/5 px-2.5 py-2">
                <Icon size={14} className="mt-0.5 shrink-0 text-white/50" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white">{r.title}</p>
                  <a
                    href={resourceSearchUrl(r.kind, r.query)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 inline-flex items-center gap-1 text-xs text-sky-300 hover:underline"
                  >
                    Search “{r.query}” <ExternalLink size={10} />
                  </a>
                </div>
                <button
                  onClick={() => addResource(r, i)}
                  aria-label={`Add “${r.title}” as a resource`}
                  className="flex shrink-0 items-center gap-1 rounded-md bg-violet-500/20 px-2 py-1 text-xs text-violet-100 hover:bg-violet-500/30"
                >
                  <Plus size={12} /> Add
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <p className="mt-2 text-[11px] text-white/35">AI can be wrong. Resources are search links, so check what you find.</p>
    </div>
  )
}
