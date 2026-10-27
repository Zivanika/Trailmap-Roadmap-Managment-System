import rateLimit, { ipKeyGenerator } from 'express-rate-limit'
import type { Request } from 'express'
import { clientIp } from '../lib/client-ip'

/**
 * Per-IP request limits (in memory: fine for a single backend instance).
 * AI calls also have a daily per-user quota (rate-limit.ts).
 */
function limiter(windowMs: number, limit: number, message: string) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    // Server-side calls from the frontend on nobody's behalf aren't limited.
    skip: (req: Request) => clientIp(req) === null,
    // ipKeyGenerator groups IPv6 addresses by /56, so one user can't rotate through a subnet.
    keyGenerator: (req: Request) => ipKeyGenerator(clientIp(req)!),
    message: { error: message },
  })
}

const MINUTE = 60_000

/** Everything under /api: a ceiling no normal use comes near. */
export const apiLimit = limiter(MINUTE, 600, 'Too many requests. Please slow down.')
/** Public reads anyone can hammer: shared roadmaps and Explore. */
export const publicReadLimit = limiter(MINUTE, 120, 'Too many requests. Please try again in a minute.')
/** The YouTube metadata proxy calls Google on every request. */
export const youtubeLimit = limiter(MINUTE, 30, 'Too many video lookups. Please try again in a minute.')
/** Sign-in emails: each one costs a send and lands in someone's inbox. */
export const magicLinkLimit = limiter(15 * MINUTE, 5, 'Too many sign-in emails requested. Please try again later.')
/** Redeeming links; looser, but stops anyone guessing tokens. */
export const magicLinkVerifyLimit = limiter(15 * MINUTE, 30, 'Too many attempts. Please try again later.')
