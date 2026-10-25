import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
  return {
    // Private pages also send noindex; this just saves crawlers the trip.
    rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/dashboard', '/roadmap/'] },
    sitemap: new URL('/sitemap.xml', SITE_URL).toString(),
  }
}
