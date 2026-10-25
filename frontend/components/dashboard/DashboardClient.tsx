'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createPortal } from 'react-dom'
import {
  Plus, MoreVertical, Copy, Trash2, Pencil, Globe, Lock, Link2, X, Loader2,
  Play, MapPin, StickyNote, Trophy, Boxes, Map, CheckCircle2, Activity, Flame, ArrowRight,
} from 'lucide-react'
import {
  useRoadmaps,
  useProgressSummary,
  useCreateRoadmap,
  useDeleteRoadmap,
  useDuplicateRoadmap,
  useUpdateRoadmap,
} from '@/hooks/use-roadmaps'
import type { ProgressSummary, RoadmapSummary, Visibility } from '@/lib/api-client'
import { UserMenu } from '@/components/auth/UserMenu'
import { useCountUp } from '@/hooks/use-motion'
import { CircularProgress } from './CircularProgress'

const VIS_META: Record<Visibility, { icon: typeof Lock; label: string }> = {
  private: { icon: Lock, label: 'Private' },
  unlisted: { icon: Link2, label: 'Unlisted' },
  public: { icon: Globe, label: 'Public' },
}

export function DashboardClient() {
  const { data: roadmaps, isLoading, isError } = useRoadmaps()
  const { data: summary } = useProgressSummary()
  const [creating, setCreating] = useState(false)

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <header className="tm-fade-up mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Your roadmaps</h1>
          <p className="text-sm text-white/50">Build, organise and share your learning paths</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCreating(true)}
            className="group flex items-center gap-2 whitespace-nowrap rounded-xl bg-white px-4 py-2 text-sm font-medium text-gray-900 transition-all hover:-translate-y-0.5 hover:bg-gray-100 active:translate-y-0"
          >
            <Plus size={16} className="transition-transform duration-300 group-hover:rotate-90" />
            New roadmap
          </button>
          <UserMenu />
        </div>
      </header>

      {summary && (summary.resume || summary.streak > 0 || summary.doneThisWeek > 0) && (
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_15rem]">
          {summary.resume ? <ContinueCard resume={summary.resume} /> : <div className="hidden sm:block" />}
          <StreakCard summary={summary} />
        </div>
      )}

      {roadmaps && roadmaps.length > 0 && <StatsBar roadmaps={roadmaps} />}

      {isLoading && <DashboardSkeleton />}
      {isError && <p className="text-red-400">Couldn’t load your roadmaps.</p>}

      {roadmaps && roadmaps.length === 0 && (
        <div className="tm-fade-up rounded-2xl border border-dashed border-white/15 p-12 text-center">
          <EmptyTrail />
          <p className="mt-4 text-white/60">No roadmaps yet. Every journey starts with a first step.</p>
          <button
            onClick={() => setCreating(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
          >
            <Plus size={16} /> Create your first roadmap
          </button>
        </div>
      )}

      {roadmaps && roadmaps.length > 0 && (
        <div className="space-y-3">
          {roadmaps.map((r, i) => (
            <div
              key={r.id}
              className="tm-fade-up"
              style={{ '--tm-delay': `${Math.min(i, 8) * 60 + 120}ms` } as React.CSSProperties}
            >
              <RoadmapRow roadmap={r} />
            </div>
          ))}
        </div>
      )}

      {creating && <CreateRoadmapModal onClose={() => setCreating(false)} />}
    </main>
  )
}

function StatsBar({ roadmaps }: { roadmaps: RoadmapSummary[] }) {
  const total = roadmaps.length
  const isComplete = (r: RoadmapSummary) => (r.totalSteps ?? 0) > 0 && (r.doneSteps ?? 0) >= (r.totalSteps ?? 0)
  const isStarted = (r: RoadmapSummary) => (r.doneSteps ?? 0) > 0 && !isComplete(r)
  const completed = roadmaps.filter(isComplete).length
  const inProgress = roadmaps.filter(isStarted).length

  return (
    <div className="mb-6 grid grid-cols-3 gap-3">
      <StatCard icon={Map} label="Roadmaps created" value={total} />
      <StatCard icon={CheckCircle2} label="Completed" value={completed} accent />
      <StatCard icon={Activity} label="In progress" value={inProgress} />
    </div>
  )
}

function ContinueCard({ resume }: { resume: NonNullable<ProgressSummary['resume']> }) {
  const pct = resume.totalSteps > 0 ? Math.round((resume.doneSteps / resume.totalSteps) * 100) : 0
  return (
    <Link
      href={resume.href}
      className="tm-fade-up group flex items-center gap-4 rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-900/40 to-emerald-950/10 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-400/40"
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-emerald-300/80">Pick up where you left off</p>
        <h2 className="mt-1 truncate text-lg font-semibold text-white">{resume.title}</h2>
        <p className="mt-0.5 truncate text-sm text-white/60">
          Next: <span className="text-white/85">{resume.nextStep}</span>
        </p>
        <div className="mt-3 flex items-center gap-2">
          <div className="h-1.5 w-full max-w-56 overflow-hidden rounded-full bg-white/10">
            <div className="tm-fill h-full rounded-full bg-emerald-400" style={{ width: `${pct}%` }} />
          </div>
          <span className="whitespace-nowrap text-xs text-white/50">
            {resume.doneSteps}/{resume.totalSteps} done
          </span>
        </div>
      </div>
      <span className="flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition-colors group-hover:bg-emerald-400">
        Continue <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  )
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function StreakCard({ summary }: { summary: ProgressSummary }) {
  const streak = useCountUp(summary.streak)
  const max = Math.max(1, ...summary.week)
  const today = new Date().getDay()
  const onFire = summary.streak > 0
  return (
    <div
      className="tm-fade-up rounded-2xl border border-white/10 bg-white/[0.03] p-5"
      style={{ '--tm-delay': '80ms' } as React.CSSProperties}
    >
      <div className="flex items-center gap-2">
        <Flame size={20} className={onFire ? 'animate-pulse text-orange-400' : 'text-white/25'} />
        <span className="text-2xl font-bold text-white">{streak}</span>
        <span className="text-sm text-white/55">day streak</span>
      </div>
      <p className="mt-1 text-xs text-white/45">
        {summary.doneToday > 0
          ? `${summary.doneToday} done today. Nice.`
          : onFire
            ? 'Finish a step today to keep it going.'
            : 'Finish a step today to start a streak.'}
      </p>
      {/* Steps done on each of the last 7 days */}
      <div className="mt-3 flex h-10 items-end gap-1.5" aria-label={`${summary.doneThisWeek} steps done in the last 7 days`}>
        {summary.week.map((count, i) => (
          <div key={i} className="flex h-full flex-1 flex-col justify-end">
            <div
              className={`tm-grow w-full rounded-sm ${count > 0 ? 'bg-emerald-400' : 'bg-white/10'}`}
              style={{
                height: `${count > 0 ? Math.max(20, (count / max) * 100) : 12}%`,
                '--tm-delay': `${200 + i * 50}ms`,
              } as React.CSSProperties}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1.5 text-center text-[10px] text-white/35">
        {summary.week.map((_, i) => (
          <span key={i} className={`flex-1 ${i === 6 ? 'font-semibold text-white/70' : ''}`}>
            {DAY_LABELS[(today - 6 + i + 7) % 7]}
          </span>
        ))}
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading roadmaps">
      <div className="mb-6 grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="tm-skeleton h-[74px] rounded-xl border border-white/5" />
        ))}
      </div>
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-4 rounded-2xl border border-white/5 p-4">
            <div className="tm-skeleton h-14 w-14 rounded-xl" />
            <div className="flex-1 space-y-2">
              <div className="tm-skeleton h-4 w-2/5 rounded" />
              <div className="tm-skeleton h-3 w-3/5 rounded" />
            </div>
            <div className="tm-skeleton h-14 w-14 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Small looping illustration for the empty dashboard: a trail drawing toward a flag. */
function EmptyTrail() {
  return (
    <svg viewBox="0 0 160 80" className="mx-auto h-20 w-40" aria-hidden>
      <path
        d="M14 64 C 50 64, 50 22, 86 30 S 126 54, 140 20"
        pathLength={1}
        fill="none"
        stroke="rgb(52 211 153)"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="tm-draw"
        style={{ '--tm-delay': '200ms' } as React.CSSProperties}
      />
      <circle cx="14" cy="64" r="5" fill="rgb(52 211 153)" />
      <g className="tm-float">
        <line x1="140" y1="20" x2="140" y2="4" stroke="white" strokeOpacity="0.6" strokeWidth="2" />
        <path d="M140 4 L154 9 L140 14 Z" fill="#FFD233" />
      </g>
    </svg>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Map
  label: string
  value: number
  accent?: boolean
}) {
  const shown = useCountUp(value)
  return (
    <div className="tm-fade-up rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <div className="flex items-center gap-1.5 text-xs text-white/50">
        <Icon size={14} className={accent ? 'text-emerald-400' : 'text-white/40'} />
        {label}
      </div>
      <p className={`mt-1 text-2xl font-bold ${accent ? 'text-emerald-300' : 'text-white'}`}>{shown}</p>
    </div>
  )
}

function CreateRoadmapModal({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const createRoadmap = useCreateRoadmap()
  const [name, setName] = useState('')

  async function create() {
    const title = name.trim()
    if (!title) return
    const created = await createRoadmap.mutateAsync(title)
    router.push(`/roadmap/${created.id}`)
  }

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" onMouseDown={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in-0 duration-200" />
      <div
        className="relative w-full max-w-sm overflow-hidden rounded-2xl animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-200 border border-white/10 bg-neutral-900 shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
          <h3 className="text-sm font-semibold text-white">Name your roadmap</h3>
          <button onClick={onClose} className="rounded-md p-1 text-white/40 hover:bg-white/10 hover:text-white">
            <X size={16} />
          </button>
        </div>
        <div className="space-y-4 p-5">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') create()
              if (e.key === 'Escape') onClose()
            }}
            placeholder="e.g. Become a full-stack developer"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/10"
          />
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/5">
              Cancel
            </button>
            <button
              onClick={create}
              disabled={!name.trim() || createRoadmap.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {createRoadmap.isPending && <Loader2 size={14} className="animate-spin" />}
              Create
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function Stat({ icon: Icon, count, label }: { icon: typeof MapPin; count: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-white/55">
      <Icon size={14} className="text-white/35" />
      {count} {label}
    </span>
  )
}

function RoadmapRow({ roadmap }: { roadmap: RoadmapSummary }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [title, setTitle] = useState(roadmap.title)

  const del = useDeleteRoadmap()
  const dup = useDuplicateRoadmap()
  const update = useUpdateRoadmap()

  const Vis = VIS_META[roadmap.visibility]
  const c = roadmap.counts ?? { step: 0, milestone: 0, note: 0, group: 0 }
  const total = roadmap.totalSteps ?? 0
  const done = roadmap.doneSteps ?? 0
  const pct = total > 0 ? (done / total) * 100 : 0
  const resumeLabel = pct >= 100 ? 'Review' : done > 0 ? 'Resume' : 'Open'

  function commitRename() {
    const next = title.trim()
    setRenaming(false)
    if (next && next !== roadmap.title) update.mutate({ id: roadmap.id, patch: { title: next } })
    else setTitle(roadmap.title)
  }

  return (
    <div className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.05] hover:shadow-lg hover:shadow-black/30">
      {/* Play / open */}
      <Link
        href={`/roadmap/${roadmap.id}`}
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/5 text-emerald-400 transition-colors hover:bg-emerald-500/15"
        aria-label="Open roadmap"
      >
        <Play size={22} className="ml-0.5 transition-transform duration-200 group-hover:scale-110" fill="currentColor" />
      </Link>

      {/* Title + stats */}
      <div className="min-w-0 flex-1">
        {renaming ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') { setTitle(roadmap.title); setRenaming(false) }
            }}
            className="w-full max-w-sm rounded-md border border-white/20 bg-white/10 px-2 py-1 text-base font-semibold text-white focus:outline-none"
          />
        ) : (
          <Link href={`/roadmap/${roadmap.id}`} className="block">
            <h3 className="truncate text-base font-semibold text-white">{roadmap.title}</h3>
          </Link>
        )}

        <p className="mt-1 text-xs text-white/45 sm:hidden">
          {done}/{total} steps · {Vis.label}
        </p>
        <div className="mt-1.5 hidden flex-wrap items-center gap-x-5 gap-y-1 sm:flex">
          <Stat icon={MapPin} count={c.step} label={c.step === 1 ? 'Step' : 'Steps'} />
          <Stat icon={StickyNote} count={c.note} label={c.note === 1 ? 'Note' : 'Notes'} />
          {c.milestone > 0 && (
            <Stat icon={Trophy} count={c.milestone} label={c.milestone === 1 ? 'Milestone' : 'Milestones'} />
          )}
          {c.group > 0 && (
            <Stat icon={Boxes} count={c.group} label={c.group === 1 ? 'Section' : 'Sections'} />
          )}
          <span className="inline-flex items-center gap-1 text-xs text-white/35">
            <Vis.icon size={11} /> {Vis.label}
          </span>
        </div>
      </div>

      {/* Progress + resume */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <CircularProgress value={pct} size={48} />
        <Link
          href={`/roadmap/${roadmap.id}`}
          className="hidden rounded-lg sm:inline-block border border-emerald-500/40 px-5 py-2 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-500/10"
        >
          {resumeLabel}
        </Link>

        {/* Actions menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="rounded-md p-1 text-white/30 transition-opacity hover:bg-white/10 hover:text-white group-hover:opacity-100 focus-visible:opacity-100 sm:opacity-0"
            aria-label="Roadmap actions"
          >
            <MoreVertical size={18} />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-8 z-20 w-40 origin-top-right overflow-hidden rounded-xl border border-white/10 bg-neutral-900 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-150">
                <MenuItem icon={Pencil} label="Rename" onClick={() => { setMenuOpen(false); setRenaming(true) }} />
                <MenuItem icon={Copy} label="Duplicate" onClick={() => { setMenuOpen(false); dup.mutate(roadmap) }} />
                <MenuItem
                  icon={Trash2}
                  label="Delete"
                  destructive
                  onClick={() => {
                    setMenuOpen(false)
                    if (confirm(`Delete “${roadmap.title}”? This cannot be undone.`)) del.mutate(roadmap.id)
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  destructive,
}: {
  icon: typeof Pencil
  label: string
  onClick: () => void
  destructive?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-white/5 ${
        destructive ? 'text-red-400' : 'text-white/80'
      }`}
    >
      <Icon size={14} />
      {label}
    </button>
  )
}
