import { serializeGraph } from './api-client'
import type { CanvasEdge, CanvasNode } from '@/types'

/** JSON with object keys sorted: Postgres jsonb reorders keys, so plain JSON.stringify can't compare. */
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .filter((k) => (value as Record<string, unknown>)[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${stable((value as Record<string, unknown>)[k])}`)
      .join(',')}}`
  }
  return JSON.stringify(value ?? null)
}

/** Whether two graphs hold the same saved content, ignoring order and React Flow's runtime fields. */
export function sameGraph(a: { nodes: CanvasNode[]; edges: CanvasEdge[] }, b: { nodes: CanvasNode[]; edges: CanvasEdge[] }) {
  const norm = (g: { nodes: CanvasNode[]; edges: CanvasEdge[] }) => {
    const s = serializeGraph(g.nodes, g.edges)
    return stable({
      nodes: [...s.nodes].sort((x, y) => x.id.localeCompare(y.id)),
      edges: [...s.edges].sort((x, y) => x.id.localeCompare(y.id)),
    })
  }
  return norm(a) === norm(b)
}
