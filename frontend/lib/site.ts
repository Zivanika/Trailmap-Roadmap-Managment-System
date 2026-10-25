// Canonical origin for absolute URLs in metadata (OG images, sitemap). Set
// NEXT_PUBLIC_SITE_URL in production; Vercel's own production domain is the fallback.
export const SITE_URL = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : 'http://localhost:3000'),
)

export const SITE_NAME = 'Trailmap'
export const SITE_DESCRIPTION =
  'Map out what you want to learn as a visual roadmap of steps and milestones, track your progress, and share it with anyone.'
