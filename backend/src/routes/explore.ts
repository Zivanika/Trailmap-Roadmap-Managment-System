import { Router } from 'express'
import type { Prisma } from '@prisma/client'
import { prisma } from '../db/prisma'
import { exploreQuerySchema } from '../lib/validators'

const router = Router()

const PAGE_SIZE = 24

// Listed roadmaps: public ones with at least one step to follow. Unlisted ones
// are reachable by link only and never appear here.
const LISTED: Prisma.RoadmapWhereInput = {
  visibility: 'public',
  shareSlug: { not: null },
  nodes: { some: { type: { in: ['step', 'milestone'] } } },
}

// Listings change slowly; let browsers and the Next.js server cache briefly.
function cacheFor(res: import('express').Response, seconds: number) {
  res.set('Cache-Control', `public, max-age=${seconds}, stale-while-revalidate=${seconds * 5}`)
}

/**
 * GET /api/explore?q=&tag=&sort=popular|recent&page=&templates=1 — public
 * roadmaps for the explore page and template gallery. No auth. `q` matches
 * title, description or a tag.
 */
router.get('/', async (req, res, next) => {
  try {
    const { q, tag, sort, page, templates } = exploreQuerySchema.parse(req.query)
    const where: Prisma.RoadmapWhereInput = {
      ...LISTED,
      ...(templates ? { isTemplate: true } : {}),
      ...(tag ? { tags: { has: tag } } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
              { tags: { has: q.toLowerCase() } },
            ],
          }
        : {}),
    }

    // One extra row tells us whether there's another page.
    const rows = await prisma.roadmap.findMany({
      where,
      orderBy: sort === 'recent' ? [{ updatedAt: 'desc' }] : [{ viewCount: 'desc' }, { updatedAt: 'desc' }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE + 1,
      select: { id: true, title: true, description: true, tags: true, shareSlug: true, viewCount: true, updatedAt: true, isTemplate: true },
    })
    const items = rows.slice(0, PAGE_SIZE)
    const ids = items.map((r) => r.id)

    const [nodeCounts, forkCounts] = await Promise.all([
      ids.length
        ? prisma.node.groupBy({
            by: ['roadmapId', 'type'],
            where: { roadmapId: { in: ids }, type: { in: ['step', 'milestone'] } },
            _count: { _all: true },
          })
        : [],
      ids.length
        ? prisma.roadmap.groupBy({ by: ['forkedFrom'], where: { forkedFrom: { in: ids } }, _count: { _all: true } })
        : [],
    ])
    const count = (id: string, type: string) =>
      nodeCounts.find((c) => c.roadmapId === id && c.type === type)?._count._all ?? 0
    const forks = new Map(forkCounts.map((f) => [f.forkedFrom, f._count._all]))

    cacheFor(res, 60)
    res.json({
      roadmaps: items.map((r) => ({
        title: r.title,
        description: r.description ?? undefined,
        tags: r.tags,
        shareSlug: r.shareSlug!,
        viewCount: r.viewCount,
        forkCount: forks.get(r.id) ?? 0,
        steps: count(r.id, 'step'),
        milestones: count(r.id, 'milestone'),
        isTemplate: r.isTemplate,
        updatedAt: r.updatedAt,
      })),
      page,
      hasMore: rows.length > PAGE_SIZE,
    })
  } catch (err) {
    next(err)
  }
})

/** GET /api/explore/tags — the most used tags on listed roadmaps. */
router.get('/tags', async (_req, res, next) => {
  try {
    const rows = await prisma.$queryRaw<{ tag: string; count: number }[]>`
      SELECT tag, COUNT(*)::int AS count
      FROM roadmaps r, unnest(r.tags) AS tag
      WHERE r.visibility = 'public' AND r.share_slug IS NOT NULL
        AND EXISTS (SELECT 1 FROM nodes n WHERE n.roadmap_id = r.id AND n.type IN ('step', 'milestone'))
      GROUP BY tag
      ORDER BY count DESC, tag
      LIMIT 24`
    cacheFor(res, 60)
    res.json({ tags: rows })
  } catch (err) {
    next(err)
  }
})

/** GET /api/explore/sitemap — slugs of every listed roadmap, for sitemap.xml. */
router.get('/sitemap', async (_req, res, next) => {
  try {
    const rows = await prisma.roadmap.findMany({
      where: LISTED,
      orderBy: { updatedAt: 'desc' },
      take: 10_000,
      select: { shareSlug: true, updatedAt: true },
    })
    cacheFor(res, 3600)
    res.json({ roadmaps: rows.map((r) => ({ shareSlug: r.shareSlug!, updatedAt: r.updatedAt })) })
  } catch (err) {
    next(err)
  }
})

export default router
