'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Sparkles, X, Loader2 } from 'lucide-react'
import { api, ApiError } from '@/lib/api-client'
import { useCanvasStore } from '@/store/canvas-store'
import { useUIStore } from '@/store/ui-store'

const LEVELS = ['beginner', 'intermediate', 'advanced'] as const

export function GenerateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [goal, setGoal] = useState('')
  const [level, setLevel] = useState<(typeof LEVELS)[number]>('beginner')
  const [timeBudget, setTimeBudget] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  async function handleGenerate() {
    if (goal.trim().length < 3) return
    setLoading(true)
    setError(null)
    try {
      const gen = await api.generateRoadmap({ goal: goal.trim(), level, timeBudget: timeBudget.trim() || undefined })
      useCanvasStore.getState().insertGraph(gen)
      useUIStore.getState().requestFitView()
      onClose()
      setGoal('')
      setTimeBudget('')
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Sign in to use AI generation.')
      } else if (err instanceof ApiError && err.status === 429) {
        setError('Daily AI limit reached. Try again tomorrow.')
      } else if (err instanceof ApiError && err.message) {
        setError(err.message)
      } else {
        setError('Generation failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      onMouseDown={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in-0 duration-200" />
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-200 border border-white/10 bg-neutral-900 shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
            <Sparkles size={16} className="animate-pulse text-violet-400" />
            Generate a roadmap with AI
          </h3>
          <button onClick={onClose} className="rounded-md p-1 text-white/40 hover:bg-white/10 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/60">What do you want to learn?</label>
            <textarea
              autoFocus
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              rows={2}
              placeholder="e.g. Become a backend engineer with Node.js"
              className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/10"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-medium text-white/60">Level</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as (typeof LEVELS)[number])}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm capitalize text-white focus:outline-none"
              >
                {LEVELS.map((l) => (
                  <option key={l} value={l} className="bg-neutral-900 capitalize">
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-medium text-white/60">Time budget (optional)</label>
              <input
                value={timeBudget}
                onChange={(e) => setTimeBudget(e.target.value)}
                placeholder="e.g. 3 months"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none"
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            onClick={handleGenerate}
            disabled={loading || goal.trim().length < 3}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {loading ? 'Generating…' : 'Generate'}
          </button>
          <p className="text-center text-[11px] text-white/30">
            Adds editable nodes to your canvas. Resources aren’t auto-filled.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  )
}
