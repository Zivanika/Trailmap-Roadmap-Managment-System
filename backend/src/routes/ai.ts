import { Router } from 'express'
import { prisma } from '../db/prisma'
import { requireAuth } from '../middleware/auth'
import { aiProviderError, runWithAiQuota } from '../middleware/rate-limit'
import { aiGenerateSchema, aiNodeSchema } from '../lib/validators'
import { HttpError } from '../lib/http-error'
import { findResources, generateRoadmap, suggestNextSteps } from '../services/ai'
import { layoutAiRoadmap } from '../lib/ai-layout'

const router = Router()
router.use(requireAuth)

/** Rethrows provider failures (no credits, model busy) as messages the user can act on. */
async function callModel<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (e) {
    throw aiProviderError(e) ?? e
  }
}

function plainText(html: string) {
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * The roadmap (owner only: suggestions are added to it) and the step asked
 * about. A step added moments ago may not be saved yet, so the client also
 * sends its title.
 */
async function loadStep(userId: string, roadmapId: string, nodeId: string, fallbackTitle?: string) {
  const roadmap = await prisma.roadmap.findUnique({
    where: { id: roadmapId },
    select: {
      ownerId: true,
      title: true,
      nodes: { where: { type: { in: ['step', 'milestone'] } }, select: { id: true, data: true, positionX: true, positionY: true } },
    },
  })
  if (!roadmap) throw new HttpError(404, 'Not found')
  if (roadmap.ownerId !== userId) throw new HttpError(403, 'Forbidden')

  const titleOf = (data: unknown) => {
    const t = (data as { title?: unknown })?.title
    return typeof t === 'string' ? t.trim() : ''
  }
  const node = roadmap.nodes.find((n) => n.id === nodeId)
  const title = (node && titleOf(node.data)) || fallbackTitle?.trim()
  if (!title) throw new HttpError(400, 'Give this step a title first.')

  const blocks = ((node?.data as { blocks?: { type?: string; html?: string }[] })?.blocks ?? [])
  const description = plainText(blocks.filter((b) => b.type === 'text').map((b) => b.html ?? '').join(' ')).slice(0, 500)
  const steps = [...roadmap.nodes]
    .sort((a, b) => a.positionY - b.positionY || a.positionX - b.positionX)
    .map((n) => titleOf(n.data))
    .filter(Boolean)
    .slice(0, 40)
  return { roadmapTitle: roadmap.title, title, description: description || undefined, steps }
}

/**
 * POST /api/ai/generate — generate a roadmap graph from a goal.
 * Rate-limited per plan; responses cached by prompt hash to cut cost.
 */
router.post('/generate', async (req, res, next) => {
  try {
    const input = aiGenerateSchema.parse(req.body ?? {})
    const { value, cached } = await runWithAiQuota({
      user: req.user!,
      kind: 'generate',
      promptKey: { goal: input.goal.toLowerCase().trim(), level: input.level ?? null, timeBudget: input.timeBudget ?? null },
      prompt: input.goal,
      run: async () => {
        const ai = await callModel(() => generateRoadmap(input))
        return { ...ai, value: layoutAiRoadmap(ai.value) }
      },
    })
    res.json({ ...value, cached })
  } catch (err) {
    next(err)
  }
})

/** POST /api/ai/suggest-next — three steps that could follow the given one. */
router.post('/suggest-next', async (req, res, next) => {
  try {
    const { roadmapId, nodeId, title } = aiNodeSchema.parse(req.body ?? {})
    const ctx = await loadStep(req.user!.id, roadmapId, nodeId, title)
    const { value, cached } = await runWithAiQuota({
      user: req.user!,
      kind: 'suggest_next',
      promptKey: { roadmap: ctx.roadmapTitle, steps: ctx.steps, current: ctx.title },
      prompt: ctx.title,
      roadmapId,
      run: () => callModel(() => suggestNextSteps({ roadmapTitle: ctx.roadmapTitle, steps: ctx.steps, current: ctx.title })),
    })
    res.json({ suggestions: value.suggestions.slice(0, 3), cached })
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/ai/find-resources — what to study for a step, as search queries.
 * The model never returns URLs; the client turns each query into a search link.
 */
router.post('/find-resources', async (req, res, next) => {
  try {
    const { roadmapId, nodeId, title } = aiNodeSchema.parse(req.body ?? {})
    const ctx = await loadStep(req.user!.id, roadmapId, nodeId, title)
    const { value, cached } = await runWithAiQuota({
      user: req.user!,
      kind: 'find_resource',
      promptKey: { roadmap: ctx.roadmapTitle, title: ctx.title, description: ctx.description ?? null },
      prompt: ctx.title,
      roadmapId,
      run: () => callModel(() => findResources({ roadmapTitle: ctx.roadmapTitle, title: ctx.title, description: ctx.description })),
    })
    // Belt and braces for the no-URL rule: drop anything that still looks like a link.
    // (A scheme, "www." or a domain with a path; names like "Socket.IO docs" are fine.)
    const looksLikeUrl = /[a-z][a-z0-9+.-]*:\/\/|www\.|\b[a-z0-9-]+\.[a-z]{2,}\//i
    const resources = value.resources
      .filter((r) => !looksLikeUrl.test(r.query) && !looksLikeUrl.test(r.title))
      .slice(0, 6)
    res.json({ resources, cached })
  } catch (err) {
    next(err)
  }
})

export default router
