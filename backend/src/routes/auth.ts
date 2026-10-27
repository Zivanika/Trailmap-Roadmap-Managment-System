import { Router } from 'express'
import { createHash, randomBytes } from 'crypto'
import { z } from 'zod'
import { prisma } from '../db/prisma'
import { magicLinkLimit, magicLinkVerifyLimit } from '../middleware/limits'
import { EmailNotConfiguredError, sendEmail } from '../services/email'

const router = Router()

const TOKEN_TTL_MS = 15 * 60 * 1000
const MAX_PER_EMAIL_PER_HOUR = 5

const hash = (token: string) => createHash('sha256').update(token).digest('hex')

/** Only same-site paths: an absolute URL here would turn the email into an open redirect. */
function safeCallback(path: string | undefined) {
  return path && path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/\\') ? path : '/dashboard'
}

const requestSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  callbackUrl: z.string().max(500).optional(),
})

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * POST /api/auth/magic-link { email, callbackUrl? } — emails a one-time sign-in
 * link. Always answers the same way, so it can't be used to probe which emails
 * have accounts.
 */
router.post('/magic-link', magicLinkLimit, async (req, res, next) => {
  try {
    const { email, callbackUrl } = requestSchema.parse(req.body ?? {})

    const recent = await prisma.magicLinkToken.count({
      where: { email, createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) } },
    })
    if (recent < MAX_PER_EMAIL_PER_HOUR) {
      const token = randomBytes(32).toString('base64url')
      const row = await prisma.magicLinkToken.create({
        data: { email, tokenHash: hash(token), expiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
      })
      const origin = process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000'
      const link = `${origin}/verify?${new URLSearchParams({ token, callbackUrl: safeCallback(callbackUrl) })}`
      try {
        await sendEmail({
          to: email,
          subject: 'Your Trailmap sign-in link',
          text: `Sign in to Trailmap:\n${link}\n\nThe link works once and expires in 15 minutes. If you didn’t ask for it, ignore this email.`,
          html: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;padding:24px;color:#0b2116">
  <p style="font-size:18px;font-weight:700;margin:0 0 16px"><img src="${origin}/icon-192.png" alt="Trailmap" width="24" height="24" style="vertical-align:middle;border-radius:6px;margin-right:6px" />Trailmap</p>
  <p>Click the button to sign in. The link works once and expires in 15 minutes.</p>
  <p style="margin:24px 0"><a href="${escapeHtml(link)}" style="background:#10b981;color:#022c22;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">Sign in to Trailmap</a></p>
  <p style="font-size:13px;color:#555">If you didn’t ask for this, you can ignore this email.</p>
</div>`,
        })
      } catch (err) {
        // A failed send must not burn the sender's rate-limit budget or leave a
        // dead token behind, so drop the row before surfacing the error.
        await prisma.magicLinkToken.delete({ where: { id: row.id } }).catch(() => {})
        throw err
      }
    }
    res.json({ ok: true })
  } catch (err) {
    if (err instanceof EmailNotConfiguredError) {
      return res.status(503).json({ error: 'Email sign-in isn’t available right now. Please use Google.' })
    }
    next(err)
  }
})

/**
 * POST /api/auth/magic-link/verify { token } → { email } — redeems a link,
 * once. Called by the frontend's NextAuth provider when the link is opened.
 */
router.post('/magic-link/verify', magicLinkVerifyLimit, async (req, res, next) => {
  try {
    const { token } = z.object({ token: z.string().min(20).max(200) }).parse(req.body ?? {})
    const row = await prisma.magicLinkToken.findUnique({ where: { tokenHash: hash(token) } })
    if (!row || row.usedAt || row.expiresAt < new Date()) {
      return res.status(400).json({ error: 'This sign-in link has expired or was already used.' })
    }
    // Conditional update: two clicks racing on one link can't both sign in.
    const claimed = await prisma.magicLinkToken.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } })
    if (claimed.count === 0) return res.status(400).json({ error: 'This sign-in link has expired or was already used.' })
    res.json({ email: row.email })
  } catch (err) {
    next(err)
  }
})

export default router
