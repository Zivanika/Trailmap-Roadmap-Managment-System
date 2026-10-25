'use client'

import { useEffect, useRef, useState } from 'react'
import { Trophy } from 'lucide-react'
import { Confetti } from '@/components/motion/Confetti'
import { useCanvasStore } from '@/store/canvas-store'
import { useProgressStore } from '@/store/progress-store'

/** Compact "% · done/total" meter for step + milestone completion. */
export function ProgressMeter() {
  const nodes = useCanvasStore((s) => s.nodes)
  const canvasRoadmapId = useCanvasStore((s) => s.roadmapId)
  const roadmapId = useProgressStore((s) => s.roadmapId)
  const statuses = useProgressStore((s) => s.statuses)
  const loaded = useProgressStore((s) => s.loaded)

  const active = loaded && roadmapId !== null && roadmapId === canvasRoadmapId
  const trackable = nodes.filter((n) => n.type === 'step' || n.type === 'milestone')
  const total = trackable.length
  const done = trackable.filter((n) => statuses[n.id] === 'done').length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  // Celebrate when the roadmap goes from unfinished to 100% while open,
  // not when one that's already complete is loaded.
  const prevPct = useRef<number | null>(null)
  const [celebrate, setCelebrate] = useState(0)
  useEffect(() => {
    if (!active || total === 0) {
      prevPct.current = null
      return
    }
    if (prevPct.current !== null && prevPct.current < 100 && pct === 100) setCelebrate((n) => n + 1)
    prevPct.current = pct
  }, [active, total, pct])
  useEffect(() => {
    if (!celebrate) return
    const t = setTimeout(() => setCelebrate(0), 1800)
    return () => clearTimeout(t)
  }, [celebrate])

  if (!active || total === 0) return null

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="flex items-center gap-1 whitespace-nowrap text-xs text-white/50">
        {pct === 100 && <Trophy size={12} className="tm-check text-amber-300" />}
        {pct}% · {done}/{total}
      </span>
      {celebrate > 0 && <Confetti key={celebrate} />}
    </div>
  )
}
