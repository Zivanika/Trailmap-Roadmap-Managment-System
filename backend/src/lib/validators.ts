import { z } from 'zod'

export const nodeTypeSchema = z.enum(['step', 'milestone', 'group', 'note'])
export const visibilitySchema = z.enum(['private', 'unlisted', 'public'])

export const createRoadmapSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
})

/** Tags are shown and filtered on the explore page: lowercase, trimmed, unique, a handful at most. */
export const tagsSchema = z
  .array(z.string().trim().toLowerCase().min(1).max(30))
  .max(8)
  .transform((tags) => [...new Set(tags)])

export const updateRoadmapSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  tags: tagsSchema.optional(),
  visibility: visibilitySchema.optional(),
  coverUrl: z.string().url().nullable().optional(),
  /** Admins only: show it in the template gallery. */
  isTemplate: z.boolean().optional(),
})

const graphNodeSchema = z.object({
  id: z.string().min(1),
  type: nodeTypeSchema,
  position: z.object({ x: z.number(), y: z.number() }),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
  parentId: z.string().nullable().optional(),
  data: z.unknown(),
})

const graphEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  label: z.string().nullable().optional(),
  style: z.unknown().optional(),
})

export const graphSchema = z.object({
  nodes: z.array(graphNodeSchema).max(2000),
  edges: z.array(graphEdgeSchema).max(5000),
})

/** PATCH /graph: `baseVersion` is the version the client's graph was loaded from; `force` overwrites a newer one. */
export const graphSaveSchema = graphSchema.extend({
  baseVersion: z.number().int().min(0).optional(),
  force: z.boolean().optional(),
})

export type GraphInput = z.infer<typeof graphSchema>

export const progressSchema = z.object({
  roadmapId: z.string().min(1),
  nodeId: z.string().min(1),
  status: z.enum(['todo', 'in_progress', 'done']),
})

export const aiGenerateSchema = z.object({
  goal: z.string().trim().min(3).max(300),
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  timeBudget: z.string().max(100).optional(),
})

export type AiGenerateInput = z.infer<typeof aiGenerateSchema>

/** Local→cloud migration payload: a batch of locally-stored roadmaps. */
export const importSchema = z.object({
  roadmaps: z
    .array(
      z.object({
        localId: z.string().min(1),
        title: z.string().trim().min(1).max(200).optional(),
        description: z.string().max(2000).optional(),
        nodes: z.array(graphNodeSchema).max(2000),
        edges: z.array(graphEdgeSchema).max(5000),
      }),
    )
    .min(1)
    .max(50),
})

export const exploreQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  tag: z.string().trim().toLowerCase().max(30).optional(),
  sort: z.enum(['popular', 'recent']).default('popular'),
  page: z.coerce.number().int().min(1).max(100).default(1),
  /** "1": only roadmaps featured in the template gallery. */
  templates: z.enum(['1']).optional(),
})

/** suggest-next / find-resources: the step, plus its title in case it hasn't been saved yet. */
export const aiNodeSchema = z.object({
  roadmapId: z.string().min(1),
  nodeId: z.string().min(1),
  title: z.string().trim().max(200).optional(),
})
