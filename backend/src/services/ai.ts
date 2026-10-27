import { ChatOpenAI } from '@langchain/openai'
import { z } from 'zod'
import type { AiGenerateInput } from '../lib/validators'
import type { AiResult } from '../middleware/rate-limit'

/**
 * AI roadmap generation via LangChain + OpenRouter structured output.
 *
 * OpenRouter is OpenAI-API-compatible, so we keep LangChain's ChatOpenAI client
 * and just repoint it at OpenRouter's base URL with an OpenRouter key. The model
 * is a free OpenRouter model (override via OPENROUTER_MODEL).
 *
 * Guardrail: the model only produces step titles/descriptions — never URLs.
 * Real resources are attached later via the YouTube/link flows. Blocks are
 * returned empty so the user fills them in, or uses find-resources, which only
 * ever returns search queries.
 */

// Strict structured-output: every field must be required (use `.nullable()`
// rather than `.optional()`), and array min/max constraints aren't supported —
// those counts are expressed in the system prompt instead.
const aiRoadmapSchema = z.object({
  nodes: z.array(
    z.object({
      id: z.string().describe('stable short id like "n1", referenced by edges'),
      type: z.enum(['step', 'milestone']),
      title: z.string(),
      description: z.string().nullable(),
      estMinutes: z.number().nullable(),
    }),
  ),
  edges: z.array(z.object({ source: z.string(), target: z.string() })),
})

export type AiRoadmap = z.infer<typeof aiRoadmapSchema>

const SYSTEM_PROMPT = `You are an expert curriculum designer for Trailmap, a visual learning-roadmap tool.
Given a learning goal, produce a sequenced roadmap as a directed acyclic graph.

Rules:
- 6–15 nodes. Use "step" for normal learning steps and "milestone" for major checkpoints (include 1–3 milestones).
- Order steps from fundamentals to advanced. Edges express prerequisites (source must come before target).
- The graph MUST be acyclic.
- Node ids are short and stable (n1, n2, …) and are what edges reference.
- NEVER invent URLs or link to specific resources. Titles and descriptions only.
- estMinutes is a rough time estimate per step.`

function userPrompt(input: AiGenerateInput): string {
  const parts = [`Goal: ${input.goal}`]
  if (input.level) parts.push(`Learner level: ${input.level}`)
  if (input.timeBudget) parts.push(`Time budget: ${input.timeBudget}`)
  return parts.join('\n')
}

function chatModel(maxTokens: number) {
  return new ChatOpenAI({
    model: process.env.OPENROUTER_MODEL ?? 'nvidia/nemotron-3-super-120b-a12b:free',
    temperature: 0.4,
    apiKey: process.env.OPENROUTER_API_KEY,
    maxTokens,
    configuration: {
      baseURL: 'https://openrouter.ai/api/v1',
    },
  })
}

/** Calls the model for structured output, keeping the token counts for cost tracking. */
async function structuredCall<T extends z.ZodTypeAny>(
  schema: T,
  name: string,
  maxTokens: number,
  system: string,
  user: string,
): Promise<AiResult<z.infer<T>>> {
  const structured = chatModel(maxTokens).withStructuredOutput(schema, { name, includeRaw: true })
  const { raw, parsed } = (await structured.invoke([
    { role: 'system', content: system },
    { role: 'user', content: user },
  ])) as { raw: { usage_metadata?: { input_tokens?: number; output_tokens?: number } }; parsed: z.infer<T> }
  return { value: parsed, tokenIn: raw.usage_metadata?.input_tokens, tokenOut: raw.usage_metadata?.output_tokens }
}

export function generateRoadmap(input: AiGenerateInput) {
  return structuredCall(aiRoadmapSchema, 'roadmap', 2000, SYSTEM_PROMPT, userPrompt(input))
}

// ── Suggest next ──────────────────────────────────────────────────────────

const suggestionsSchema = z.object({
  suggestions: z.array(
    z.object({
      type: z.enum(['step', 'milestone']),
      title: z.string(),
      description: z.string().nullable(),
      estMinutes: z.number().nullable(),
    }),
  ),
})

export type AiSuggestions = z.infer<typeof suggestionsSchema>

const SUGGEST_PROMPT = `You help learners extend a roadmap in Trailmap, a visual learning-roadmap tool.
Given the roadmap so far and the step the learner is looking at, suggest exactly 3 steps that should come right after it.

Rules:
- Each suggestion builds directly on the given step and doesn't repeat a step already in the roadmap.
- Titles are short (under 50 characters). Descriptions are one sentence.
- Use "milestone" only for a real checkpoint (a project or exam); otherwise "step".
- NEVER invent URLs or name specific links. Titles and descriptions only.
- estMinutes is a rough time estimate.`

export function suggestNextSteps(ctx: { roadmapTitle: string; steps: string[]; current: string }) {
  const user = [
    `Roadmap: ${ctx.roadmapTitle}`,
    `Steps so far (in order): ${ctx.steps.map((s) => `"${s}"`).join(', ') || '(none)'}`,
    `Current step: "${ctx.current}"`,
  ].join('\n')
  return structuredCall(suggestionsSchema, 'suggestions', 500, SUGGEST_PROMPT, user)
}

// ── Find resources ────────────────────────────────────────────────────────

const resourcesSchema = z.object({
  resources: z.array(
    z.object({
      kind: z.enum(['video', 'article', 'docs', 'course', 'practice']),
      title: z.string().describe('what to look for, e.g. "Intro to CSS Grid (video)"'),
      query: z.string().describe('a search query that finds it, no URL'),
    }),
  ),
})

export type AiResources = z.infer<typeof resourcesSchema>

const RESOURCES_PROMPT = `You help learners find study material for one step of a learning roadmap.
Suggest 4–6 resources to look for: a mix of videos, articles or official docs, and hands-on practice.

Rules:
- NEVER output URLs, domains or links. Give a short title and a search query someone can paste into a search engine or YouTube.
- Prefer well-known, free, official sources (name them in the query, e.g. "MDN flexbox guide").
- Queries are under 80 characters.`

export function findResources(ctx: { roadmapTitle?: string; title: string; description?: string }) {
  const user = [
    ctx.roadmapTitle ? `Roadmap: ${ctx.roadmapTitle}` : null,
    `Step: ${ctx.title}`,
    ctx.description ? `About this step: ${ctx.description}` : null,
  ]
    .filter(Boolean)
    .join('\n')
  return structuredCall(resourcesSchema, 'resources', 500, RESOURCES_PROMPT, user)
}
