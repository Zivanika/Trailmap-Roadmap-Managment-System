import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { PublicRoadmapView } from '@/components/canvas/PublicRoadmapView'
import type { RoadmapFull } from '@/lib/api-client'
import { backendFetch } from '@/lib/backend'

// Called from both generateMetadata and the page; Next memoizes identical GET
// fetches within one request, so the backend (and viewCount) sees one hit.
async function fetchRoadmap(slug: string): Promise<RoadmapFull | null> {
  // Forwards the visitor's IP, so the backend counts one view per visitor.
  const res = await backendFetch(`/api/r/${encodeURIComponent(slug)}`, { cache: 'no-store' })
  if (!res.ok) return null
  const { roadmap } = await res.json()
  return roadmap as RoadmapFull
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const roadmap = await fetchRoadmap(slug)
  if (!roadmap) return { title: 'Roadmap not found', robots: { index: false } }
  const steps = (roadmap.nodes ?? []).filter((n) => n.type === 'step' || n.type === 'milestone').length
  const description =
    roadmap.description || `A ${steps}-step learning roadmap on Trailmap. Follow it, or fork it into your own.`
  // The root layout's title template adds " · Trailmap" to the page title;
  // OG/Twitter titles don't go through the template, so they carry it themselves.
  const shareTitle = `${roadmap.title} · Trailmap`
  return {
    title: roadmap.title,
    description,
    alternates: { canonical: `/r/${slug}` },
    // Unlisted means "anyone with the link", not "anyone searching".
    ...(roadmap.visibility !== 'public' ? { robots: { index: false, follow: false } } : {}),
    openGraph: { title: shareTitle, description, type: 'article', url: `/r/${slug}` },
    twitter: { card: 'summary_large_image', title: shareTitle, description },
  }
}

export default async function PublicRoadmapPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const roadmap = await fetchRoadmap(slug)
  if (!roadmap) notFound()
  return <PublicRoadmapView roadmap={roadmap} />
}
