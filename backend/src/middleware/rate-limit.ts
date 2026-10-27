import { createHash } from 'crypto'
import { Prisma, type AiKind } from '@prisma/client'
import { prisma } from '../db/prisma'
import { HttpError } from '../lib/http-error'
import type { AuthUser } from './auth'

// Daily AI quota per plan and kind (no Redis — counted straight from ai_generations).
const DAILY_LIMITS: Record<AiKind, Record<'free' | 'pro', number>> = {
  generate: { free: 10, pro: 100 },
  suggest_next: { free: 30, pro: 300 },
  find_resource: { free: 30, pro: 300 },
  summarize: { free: 30, pro: 300 },
}

export function hashPrompt(obj: unknown): string {
  return createHash('sha256').update(JSON.stringify(obj)).digest('hex')
}

export interface AiResult<T> {
  value: T
  tokenIn?: number
  tokenOut?: number
}

/**
 * Runs one AI request under the user's daily quota and the prompt cache.
 *
 * The quota row is written *before* the model is called, under a per-user
 * advisory lock, so parallel requests can't all pass the count and overspend.
 * A failed call deletes its row and doesn't use up the quota. Identical
 * prompts are answered from the cache (any user's earlier answer) and still count.
 */
export async function runWithAiQuota<T>(opts: {
  user: AuthUser
  kind: AiKind
  promptKey: unknown
  prompt: string
  roadmapId?: string
  run: () => Promise<AiResult<T>>
}): Promise<{ value: T; cached: boolean }> {
  const { user, kind } = opts
  const promptHash = hashPrompt({ kind, ...(opts.promptKey as object) })
  const limit = DAILY_LIMITS[kind][user.plan] ?? DAILY_LIMITS[kind].free

  const row = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`ai:${user.id}`}))`
    const used = await tx.aiGeneration.count({
      where: { userId: user.id, kind, createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    })
    if (used >= limit) throw new HttpError(429, `Daily AI limit reached (${limit}/day). Try again tomorrow.`)
    return tx.aiGeneration.create({
      data: { userId: user.id, kind, promptHash, prompt: opts.prompt.slice(0, 2000), roadmapId: opts.roadmapId },
      select: { id: true },
    })
  })

  try {
    const cached = await prisma.aiGeneration.findFirst({
      where: { promptHash, kind, response: { not: Prisma.DbNull }, id: { not: row.id } },
      orderBy: { createdAt: 'desc' },
      select: { response: true },
    })
    if (cached) {
      await prisma.aiGeneration.update({ where: { id: row.id }, data: { response: cached.response as Prisma.InputJsonValue } })
      return { value: cached.response as T, cached: true }
    }

    const result = await opts.run()
    await prisma.aiGeneration.update({
      where: { id: row.id },
      data: { response: result.value as Prisma.InputJsonValue, tokenIn: result.tokenIn, tokenOut: result.tokenOut },
    })
    return { value: result.value, cached: false }
  } catch (err) {
    await prisma.aiGeneration.delete({ where: { id: row.id } }).catch(() => {})
    throw err
  }
}

/** Maps provider errors to messages a user can act on; anything else is rethrown. */
export function aiProviderError(e: unknown): HttpError | null {
  const err = e as { code?: string; lc_error_code?: string; status?: number }
  const code = err.code
  const lc = err.lc_error_code
  const status = err.status
  if (code === 'insufficient_quota' || code === 'credit_balance_exhausted') {
    return new HttpError(503, 'AI is unavailable: the OpenAI account has no credits.')
  }
  if (code === 'invalid_api_key' || status === 401) {
    return new HttpError(503, 'AI is misconfigured: the OpenAI API key is missing or invalid.')
  }
  if (code === 'model_not_found' || status === 404) {
    return new HttpError(503, 'AI is unavailable: the configured model could not be reached.')
  }
  if (lc === 'MODEL_RATE_LIMIT' || code === 'rate_limit_exceeded' || status === 429) {
    return new HttpError(503, 'AI is busy right now. Please try again shortly.')
  }
  return null
}
