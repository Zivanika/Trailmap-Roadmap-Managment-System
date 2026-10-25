import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowRight, MapPin, Share2, Sparkles, Trophy, Video, Workflow, CheckCircle2,
} from 'lucide-react'
import { Reveal } from '@/components/motion/Reveal'
import { HeroTrail } from './HeroTrail'

const delay = (ms: number) => ({ '--tm-delay': `${ms}ms` }) as React.CSSProperties

export function LandingPage() {
  return (
    <main className="flex-1 overflow-y-auto bg-[#06130d] text-white">
      {/* ambient green glow, slowly drifting */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="tm-drift absolute -inset-[10%] bg-[radial-gradient(60%_50%_at_50%_0%,rgba(21,128,61,0.18),transparent)]" />
        <div
          className="tm-drift absolute -right-1/4 top-1/3 h-[50vh] w-[50vw] rounded-full bg-emerald-500/[0.06] blur-3xl"
          style={{ animationDelay: '-9s' }}
        />
      </div>

      {/* Nav */}
      <nav className="tm-fade-up relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2 text-lg font-bold">
          <Image src="/icon.svg" alt="Trailmap" width={28} height={28} className="rounded-md" /> Trailmap
        </div>
        <div className="flex items-center gap-2">
          <Link href="/try" className="rounded-lg px-4 py-2 text-sm font-medium text-white/70 hover:text-white">
            Try the canvas
          </Link>
          <Link
            href="/login"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
          >
            Sign in
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 pb-20 pt-16 text-center">
        
        <h1 style={delay(100)} className="tm-fade-up mx-auto mt-6 max-w-3xl text-5xl font-extrabold leading-[1.1] tracking-tight sm:text-6xl">
          Map your learning journey,{' '}
          <span
            className="animate-[tm-shimmer_6s_linear_infinite] bg-gradient-to-r from-emerald-400 via-lime-300 to-emerald-400 bg-[length:200%_100%] bg-clip-text text-transparent"
          >
            visually
          </span>
          .
        </h1>
        <p style={delay(200)} className="tm-fade-up mx-auto mt-6 max-w-2xl text-lg text-white/60">
          Build sequenced roadmaps of steps, milestones and resources on an infinite canvas.
          Share them, fork them, and track your progress — all in one place.
        </p>
        <div style={delay(300)} className="tm-fade-up mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/login"
            className="group flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/40 transition-all hover:-translate-y-0.5 hover:bg-emerald-500"
          >
            Get started — free <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/try"
            className="rounded-xl border border-white/15 px-6 py-3 text-sm font-semibold text-white/90 transition-colors hover:bg-white/5"
          >
            Try the canvas
          </Link>
        </div>

        {/* animated mock canvas */}
        <div style={delay(450)} className="tm-fade-up relative mx-auto mt-16 max-w-3xl">
          <HeroTrail />
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-16">
        <Reveal className="text-center">
          <h2 className="text-3xl font-bold">How it works</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/55">
            From an empty canvas to a shareable roadmap in four steps.
          </p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Step
            delay={0}
            n={1}
            icon={MapPin}
            title="Add steps & milestones"
            body="Drop a node onto the canvas for each thing to learn, plus milestones for the big wins."
          />
          <Step
            delay={100}
            n={2}
            icon={Workflow}
            title="Connect the path"
            body="Link nodes into a prerequisite flow. Trailmap keeps it acyclic so the order always makes sense."
          />
          <Step
            delay={200}
            n={3}
            icon={Video}
            title="Attach resources"
            body="Add videos, links, rich notes, images and checklists to any node — or let AI draft the whole roadmap."
          />
          <Step
            delay={300}
            n={4}
            icon={Trophy}
            title="Track & share"
            body="Mark steps done, watch your completion climb, then publish a read-only link anyone can follow or fork."
          />
        </div>
      </section>

      {/* Feature strip */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Feature delay={0} icon={Sparkles} title="AI generation" body="Describe a goal and get an editable roadmap in seconds." />
          <Feature delay={100} icon={CheckCircle2} title="Progress tracking" body="Per-step completion with a live percentage on your dashboard." />
          <Feature delay={200} icon={Share2} title="Share & fork" body="Publish a public roadmap; others can fork it into their own." />
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 py-20 text-center">
        <Reveal className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-900/30 to-[#07190f] p-8 sm:p-12">
          <h2 className="text-3xl font-bold">Ready to build your first roadmap?</h2>
          <p className="mx-auto mt-3 max-w-md text-white/60">
            It’s free, and you can start on the canvas without even signing up.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
            >
              Get started <ArrowRight size={16} />
            </Link>
            <Link
              href="/try"
              className="rounded-xl border border-white/15 px-6 py-3 text-sm font-semibold text-white/90 hover:bg-white/5"
            >
              Open the canvas
            </Link>
          </div>
        </Reveal>
      </section>

      <footer className="relative z-10 border-t border-white/10 py-8 text-center text-sm text-white/40">
        <span className="inline-flex items-center justify-center gap-2">
          <Image src="/icon.svg" alt="Trailmap" width={20} height={20} className="rounded" />
          Trailmap — build and share learning roadmaps.
        </span>
      </footer>
    </main>
  )
}

function Step({
  n,
  icon: Icon,
  title,
  body,
  delay,
}: {
  delay: number
  n: number
  icon: typeof MapPin
  title: string
  body: string
}) {
  return (
    <Reveal delay={delay} className="h-full">
      <div className="tm-lift group h-full rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:border-emerald-500/30">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110">
            <Icon size={18} />
          </div>
          <span className="text-xs font-semibold text-white/35">STEP {n}</span>
        </div>
        <h3 className="mt-4 font-semibold text-white">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-white/55">{body}</p>
      </div>
    </Reveal>
  )
}

function Feature({
  icon: Icon,
  title,
  body,
  delay,
}: {
  delay: number
  icon: typeof MapPin
  title: string
  body: string
}) {
  return (
    <Reveal delay={delay} className="h-full">
      <div className="tm-lift flex h-full items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:border-emerald-500/30">
        <Icon size={20} className="mt-0.5 shrink-0 text-emerald-400" />
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <p className="mt-1 text-sm text-white/55">{body}</p>
        </div>
      </div>
    </Reveal>
  )
}
