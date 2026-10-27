import { Router } from 'express'
import { prisma } from '../db/prisma'
import { serializeRoadmap } from '../lib/serialize'
import { clientIp } from '../lib/client-ip'

// One view per visitor per roadmap every 6 hours, so refreshing (or a script)
// doesn't inflate the count. In memory: fine for a single backend instance.
const VIEW_WINDOW_MS = 6 * 60 * 60 * 1000
const MAX_TRACKED = 50_000
const recentViews = new Map<string, number>()

function isNewView(key: string) {
  const now = Date.now()
  const last = recentViews.get(key)
  if (last && now - last < VIEW_WINDOW_MS) return false
  if (recentViews.size >= MAX_TRACKED) {
    // Map keeps insertion order: drop the oldest tenth.
    let n = 0
    for (const k of recentViews.keys()) {
      recentViews.delete(k)
      if (++n >= MAX_TRACKED / 10) break
    }
  }
  recentViews.delete(key)
  recentViews.set(key, now)
  return true
}

const router = Router()

/**
 * GET /api/r/:slug — public, read-only roadmap by share slug. No auth.
 * Only resolves roadmaps whose visibility is not `private`.
 * `?preview=1` fetches without counting a view.
 */
router.get('/:slug', async (req, res, next) => {
  try {
    const roadmap = await prisma.roadmap.findUnique({
      where: { shareSlug: req.params.slug },
      include: { nodes: true, edges: true },
    })
    if (!roadmap || roadmap.visibility === 'private') {
      return res.status(404).json({ error: 'Not found' })
    }

    // Best-effort view count; don't block the response on it. `?preview=1`
    // (the link-preview image) skips it, since crawlers aren't views.
    // Raw SQL so it doesn't bump updated_at: Prisma's @updatedAt fires on any
    // update, and a view isn't an edit (it would reorder "recently updated").
    const ip = clientIp(req)
    if (req.query.preview !== '1' && ip && isNewView(`${ip}:${roadmap.id}`)) {
      prisma.$executeRaw`UPDATE roadmaps SET view_count = view_count + 1 WHERE id = ${roadmap.id}`.catch(() => {})
    }

    res.json({ roadmap: serializeRoadmap(roadmap) })
  } catch (err) {
    next(err)
  }
})

export default router
