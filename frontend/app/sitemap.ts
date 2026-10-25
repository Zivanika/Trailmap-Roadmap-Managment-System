import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

// Public roadmaps (/r/[slug]) aren't listed yet: there's no endpoint that
// lists them. Add them here once the explore/gallery page exists.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: new URL('/', SITE_URL).toString(), changeFrequency: 'weekly', priority: 1 },
    { url: new URL('/try', SITE_URL).toString(), changeFrequency: 'monthly', priority: 0.8 },
    { url: new URL('/login', SITE_URL).toString(), changeFrequency: 'yearly', priority: 0.3 },
  ]
}
