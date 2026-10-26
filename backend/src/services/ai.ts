import { ChatOpenAI } from '@langchain/openai'
import { z } from 'zod'
import type { AiGenerateInput } from '../lib/validators'

/**
 * AI roadmap generation via LangChain + OpenAI structured output.
 *
 * Uses OpenAI's API directly (ChatOpenAI's default base URL) with an OpenAI key.
 * The default model (gpt-4o-mini) supports structured output and is cheap;
 * override via OPENAI_MODEL.
 *
 * Guardrail: the model only produces step titles/descriptions — never URLs.
 * Real resources are attached later via the YouTube/link flows. Blocks are
 * returned empty so the user fills them in (or uses find-resources in Phase 2).
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

export async function generateRoadmap(input: AiGenerateInput): Promise<AiRoadmap> {
  const model = new ChatOpenAI({
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    temperature: 0.4,
    apiKey: process.env.OPENAI_API_KEY ?? process.env.OPENROUTER_API_KEY,
    maxTokens: 2000,
  })
  const structured = model.withStructuredOutput(aiRoadmapSchema, { name: 'roadmap' })
  return structured.invoke([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userPrompt(input) },
  ])
}
