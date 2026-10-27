import 'server-only'
import { headers } from 'next/headers'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:4000'

/** The visitor's IP as the hosting platform reports it, or null outside a request (build, sitemap). */
export async function requestClientIp(): Promise<string | null> {
  try {
    const h = await headers()
    return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || null
  } catch {
    return null
  }
}

/**
 * fetch() to the Express backend from the Next.js server. Adds PROXY_SECRET
 * and the visitor's IP, so the backend's per-IP limits and view counts apply
 * to the visitor rather than to this server. Pass `clientIp: null` for calls
 * made on nobody's behalf (sitemap, OG images); the backend doesn't limit those.
 */
export async function backendFetch(path: string, init: RequestInit & { next?: { revalidate?: number } } = {}, opts: { clientIp?: string | null } = {}) {
  const headersOut = new Headers(init.headers)
  const secret = process.env.PROXY_SECRET
  if (secret) {
    headersOut.set('x-trailmap-proxy-secret', secret)
    const ip = opts.clientIp === undefined ? await requestClientIp() : opts.clientIp
    if (ip) headersOut.set('x-trailmap-client-ip', ip)
  }
  return fetch(`${BACKEND_URL}${path}`, { ...init, headers: headersOut })
}
