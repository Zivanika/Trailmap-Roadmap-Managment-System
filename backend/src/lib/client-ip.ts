import { timingSafeEqual } from 'crypto'
import type { Request } from 'express'

/**
 * Browser traffic reaches the backend through the Next.js proxy, so the
 * connecting IP is the frontend server's, shared by every user. The proxy
 * forwards the real client IP with PROXY_SECRET; the header is only believed
 * when the secret matches, since the backend is reachable directly too.
 */
export function isTrustedServer(req: Request): boolean {
  const secret = process.env.PROXY_SECRET
  const sent = req.get('x-trailmap-proxy-secret')
  if (!secret || !sent || sent.length !== secret.length) return false
  return timingSafeEqual(Buffer.from(sent), Buffer.from(secret))
}

/** The end user's IP, or null for a trusted server-side call made on nobody's behalf (sitemap, OG images). */
export function clientIp(req: Request): string | null {
  if (isTrustedServer(req)) return req.get('x-trailmap-client-ip') || null
  return req.ip ?? req.socket.remoteAddress ?? 'unknown'
}
