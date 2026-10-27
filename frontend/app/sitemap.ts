import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'
import { listSitemapRoadmaps } from '@/lib/explore'

// Rebuilt at most hourly; public roadmaps come from the backend.
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const listed = await listSitemapRoadmaps()
  return [
    { url: new URL('/', SITE_URL).toString(), changeFrequency: 'weekly', priority: 1 },
    { url: new URL('/explore', SITE_URL).toString(), changeFrequency: 'daily', priority: 0.9 },
    { url: new URL('/try', SITE_URL).toString(), changeFrequency: 'monthly', priority: 0.8 },
    { url: new URL('/login', SITE_URL).toString(), changeFrequency: 'yearly', priority: 0.3 },
    ...(listed?.roadmaps ?? []).map((r) => ({
      url: new URL(`/r/${r.shareSlug}`, SITE_URL).toString(),
      lastModified: new Date(r.updatedAt),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
  ]
}
