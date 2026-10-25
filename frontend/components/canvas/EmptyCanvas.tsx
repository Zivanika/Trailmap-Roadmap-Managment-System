'use client'

import { useState } from 'react'
import { ArrowLeft, LayoutTemplate, MapPin, Sparkles } from 'lucide-react'
import { useCanvasStore } from '@/store/canvas-store'
import { useUIStore } from '@/store/ui-store'
import { TEMPLATES, buildTemplate, type RoadmapTemplate } from '@/lib/templates'
import { useAddNodeAtCenter } from './CanvasToolbar'

/** Shown in the middle of a roadmap with no nodes, so a blank canvas has an obvious first move. */
export function EmptyCanvas() {
  const [picking, setPicking] = useState(false)
  const addNode = useAddNodeAtCenter()
  const setGenerateOpen = useUIStore((s) => s.setGenerateOpen)

  function applyTemplate(t: RoadmapTemplate) {
    useCanvasStore.getState().insertGraph(buildTemplate(t))
    useUIStore.getState().requestFitView()
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center p-4">
      <div className="tm-fade-up pointer-events-auto w-full max-w-sm rounded-2xl border border-emerald-400/15 bg-[#0b2116]/90 p-5 shadow-2xl backdrop-blur-md">
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
                hint={`${TEMPLATES.length} starter roadmaps`}
                onClick={() => setPicking(true)}
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
