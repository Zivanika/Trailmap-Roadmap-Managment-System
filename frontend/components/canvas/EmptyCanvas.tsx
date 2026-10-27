'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, LayoutTemplate, Loader2, MapPin, Sparkles } from 'lucide-react'
import { api, type ExploreItem } from '@/lib/api-client'
import { toast } from '@/store/toast-store'
import { useCanvasStore } from '@/store/canvas-store'
import { useUIStore } from '@/store/ui-store'
import { TEMPLATES, buildTemplate, type RoadmapTemplate } from '@/lib/templates'
import { useAddNodeAtCenter } from './CanvasToolbar'

/** Shown in the middle of a roadmap with no nodes, so a blank canvas has an obvious first move. */
export function EmptyCanvas() {
  const [picking, setPicking] = useState(false)
  // Featured templates from the gallery, fetched when the picker opens (null = loading).
  const [gallery, setGallery] = useState<ExploreItem[] | null>(null)
  const [applying, setApplying] = useState<string | null>(null)
  const addNode = useAddNodeAtCenter()
  const setGenerateOpen = useUIStore((s) => s.setGenerateOpen)

  function applyTemplate(t: RoadmapTemplate) {
    useCanvasStore.getState().insertGraph(buildTemplate(t))
    useUIStore.getState().requestFitView()
  }

  function openPicker() {
    setPicking(true)
    if (gallery === null) {
      api
        .listTemplates()
        .then(({ roadmaps }) => setGallery(roadmaps.slice(0, 6)))
        .catch(() => setGallery([]))
    }
  }

  async function applyGalleryTemplate(t: ExploreItem) {
    setApplying(t.shareSlug)
    try {
      const { roadmap } = await api.getSharedGraph(t.shareSlug)
      // insertGraph gives everything fresh ids, so the copy is independent of the template.
      useCanvasStore.getState().insertGraph({ nodes: roadmap.nodes ?? [], edges: roadmap.edges ?? [] })
      useUIStore.getState().requestFitView()
    } catch {
      toast.error('Couldn’t load that template. Please try again.')
    } finally {
      setApplying(null)
    }
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center p-4">
      <div className="tm-fade-up pointer-events-auto max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-emerald-400/15 bg-[#0b2116]/90 p-5 shadow-2xl backdrop-blur-md">
        {picking ? (
          <>
            <button
              onClick={() => setPicking(false)}
              className="mb-3 flex items-center gap-1 text-xs text-white/50 hover:text-white"
            >
              <ArrowLeft size={13} /> Back
            </button>
            <h2 className="text-sm font-semibold text-white">Start from a template</h2>
            <ul className="mt-3 space-y-2">
              {TEMPLATES.map((t, i) => (
                <li key={t.id} className="tm-fade-up" style={{ '--tm-delay': `${i * 60}ms` } as React.CSSProperties}>
                  <button
                    onClick={() => applyTemplate(t)}
                    className="flex w-full items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left transition-colors hover:border-emerald-400/40 hover:bg-emerald-400/10"
                  >
                    <span className="text-lg leading-none">{t.emoji}</span>
                    <span>
                      <span className="block text-sm font-medium text-white">{t.title}</span>
                      <span className="block text-xs text-white/50">{t.description}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {gallery === null ? (
              <p className="mt-3 flex items-center gap-2 text-xs text-white/40">
                <Loader2 size={12} className="animate-spin" /> Loading the template gallery…
              </p>
            ) : (
              gallery.length > 0 && (
                <>
                  <h3 className="mt-4 text-xs font-medium uppercase tracking-wide text-white/40">From the gallery</h3>
                  <ul className="mt-2 space-y-2">
                    {gallery.map((t) => (
                      <li key={t.shareSlug}>
                        <button
                          onClick={() => applyGalleryTemplate(t)}
                          disabled={applying !== null}
                          className="flex w-full items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left transition-colors hover:border-emerald-400/40 hover:bg-emerald-400/10 disabled:opacity-60"
                        >
                          {applying === t.shareSlug ? (
                            <Loader2 size={16} className="mt-0.5 shrink-0 animate-spin text-emerald-300" />
                          ) : (
                            <LayoutTemplate size={16} className="mt-0.5 shrink-0 text-amber-200" />
                          )}
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-white">{t.title}</span>
                            <span className="block text-xs text-white/50">
                              {t.steps} steps{t.milestones ? ` · ${t.milestones} milestone${t.milestones === 1 ? '' : 's'}` : ''}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <Link href="/explore?templates=1" className="mt-3 inline-block text-xs text-emerald-300 hover:underline">
                    Browse the template gallery
                  </Link>
                </>
              )
            )}
          </>
        ) : (
          <>
            <h2 className="text-center text-base font-semibold text-white">Plan your first trail</h2>
            <p className="mt-1 text-center text-xs text-white/50">Add steps, link them in order, then tick them off as you go.</p>
            <div className="mt-4 space-y-2">
              <EmptyOption
                icon={<MapPin size={16} />}
                title="Add your first step"
                hint="Start from a blank card"
                onClick={() => addNode('step')}
              />
              <EmptyOption
                icon={<Sparkles size={16} />}
                title="Generate with AI"
                hint="Describe a goal, get a roadmap"
                onClick={() => setGenerateOpen(true)}
                accent="text-violet-300"
              />
              <EmptyOption
                icon={<LayoutTemplate size={16} />}
                title="Start from a template"
                hint="Starter roadmaps and the gallery"
                onClick={openPicker}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function EmptyOption({
  icon,
  title,
  hint,
  onClick,
  accent = 'text-emerald-300',
}: {
  icon: React.ReactNode
  title: string
  hint: string
  onClick: () => void
  accent?: string
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left transition-colors hover:border-emerald-400/40 hover:bg-emerald-400/10"
    >
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 ${accent}`}>{icon}</span>
      <span>
        <span className="block text-sm font-medium text-white">{title}</span>
        <span className="block text-xs text-white/50">{hint}</span>
      </span>
    </button>
  )
}
