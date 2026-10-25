import { Router } from 'express'
import { prisma } from '../db/prisma'
import { requireAuth } from '../middleware/auth'
import { progressSchema } from '../lib/validators'
import { currentStreak, dayIndex, pickNextStep } from '../lib/next-step'

const router = Router()
router.use(requireAuth)

/**
 * GET /api/progress/summary?tz=<minutes> — dashboard engagement stats:
 * daily streak, completions over the last 7 days, and where to pick up next.
 * `tz` is the client's Date#getTimezoneOffset() so days match the user's calendar.
 * Declared before /:roadmapId so "summary" isn't read as a roadmap id.
 */
router.get('/summary', async (req, res, next) => {
  try {
    const userId = req.user!.id
    const tz = Math.max(-840, Math.min(840, Number(req.query.tz) || 0))
    const today = dayIndex(new Date(), tz)

    const completions = await prisma.nodeProgress.findMany({
      where: { userId, status: 'done', completedAt: { not: null } },
      select: { roadmapId: true, completedAt: true },
    })

    const activeDays = new Set<number>()
    const week = [0, 0, 0, 0, 0, 0, 0] // oldest → today
    const lastDoneByRoadmap = new Map<string, number>()
    for (const c of completions) {
      const at = c.completedAt!
      const day = dayIndex(at, tz)
      activeDays.add(day)
      const ago = today - day
      if (ago >= 0 && ago < 7) week[6 - ago]++
      const t = at.getTime()
      if (t > (lastDoneByRoadmap.get(c.roadmapId) ?? 0)) lastDoneByRoadmap.set(c.roadmapId, t)
    }

    // Candidates to resume: the user's own roadmaps plus ones they track progress on.
    const roadmaps = await prisma.roadmap.findMany({
      where: { OR: [{ ownerId: userId }, { id: { in: [...lastDoneByRoadmap.keys()] } }] },
      select: { id: true, title: true, ownerId: true, visibility: true, shareSlug: true, updatedAt: true },
    })
    const ranked = roadmaps
      .map((r) => ({
        ...r,
        // Other people's edits don't count as the user's own activity.
        lastActive: Math.max(lastDoneByRoadmap.get(r.id) ?? 0, r.ownerId === userId ? r.updatedAt.getTime() : 0),
      }))
      .filter((r) => r.ownerId === userId || (r.visibility !== 'private' && r.shareSlug))
      .sort((a, b) => b.lastActive - a.lastActive)

    // Resume the most recent roadmap that still has something left to do.
    let resume = null
    for (const r of ranked.slice(0, 5)) {
      const [nodes, edges, done] = await Promise.all([
        prisma.node.findMany({
          where: { roadmapId: r.id, type: { in: ['step', 'milestone'] } },
          select: { id: true, type: true, positionX: true, positionY: true, data: true },
        }),
        prisma.edge.findMany({ where: { roadmapId: r.id }, select: { sourceNodeId: true, targetNodeId: true } }),
        prisma.nodeProgress.findMany({ where: { userId, roadmapId: r.id, status: 'done' }, select: { nodeId: true } }),
      ])
      const doneIds = new Set(done.map((d) => d.nodeId))
      const nextNode = pickNextStep(nodes, edges, doneIds)
      if (!nextNode) continue
      const title = (nextNode.data as { title?: unknown })?.title
      resume = {
        roadmapId: r.id,
        title: r.title,
        href: r.ownerId === userId ? `/roadmap/${r.id}` : `/r/${r.shareSlug}`,
        nextStep: typeof title === 'string' && title.trim() ? title.trim() : 'Untitled step',
        totalSteps: nodes.length,
        doneSteps: nodes.filter((n) => doneIds.has(n.id)).length,
        lastActiveAt: new Date(r.lastActive).toISOString(),
      }
      break
    }

    res.json({
      summary: {
        streak: currentStreak(activeDays, today),
        doneToday: activeDays.has(today) ? week[6] : 0,
        doneThisWeek: week.reduce((a, b) => a + b, 0),
        week,
        resume,
      },
    })
  } catch (err) {
    next(err)
  }
})

/** GET /api/progress/:roadmapId — the signed-in user's node statuses for a roadmap. */
router.get('/:roadmapId', async (req, res, next) => {
  try {
    const rows = await prisma.nodeProgress.findMany({
      where: { userId: req.user!.id, roadmapId: req.params.roadmapId },
      select: { nodeId: true, status: true, completedAt: true },
    })
    res.json({ progress: rows })
  } catch (err) {
    next(err)
  }
})

/** POST /api/progress — upsert one node's status for the current user. */
router.post('/', async (req, res, next) => {
  try {
    const { roadmapId, nodeId, status } = progressSchema.parse(req.body ?? {})
    // The node must be in that roadmap, and the roadmap one the user can see:
    // their own, or one that's been shared.
    const node = await prisma.node.findFirst({
      where: { id: nodeId, roadmapId, roadmap: { OR: [{ ownerId: req.user!.id }, { visibility: { not: 'private' } }] } },
      select: { id: true },
    })
    if (!node) return res.status(404).json({ error: 'Not found' })
    const completedAt = status === 'done' ? new Date() : null
    const row = await prisma.nodeProgress.upsert({
      where: { userId_nodeId: { userId: req.user!.id, nodeId } },
      update: { status, roadmapId, completedAt },
      create: { userId: req.user!.id, nodeId, roadmapId, status, completedAt },
      select: { nodeId: true, status: true, completedAt: true },
    })
    res.json({ progress: row })
  } catch (err) {
    next(err)
  }
})

export default router
