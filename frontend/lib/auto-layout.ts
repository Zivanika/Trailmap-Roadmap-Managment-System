import type { CanvasEdge, CanvasNode } from '@/types'

const COL_GAP = 60
const ROW_GAP = 90
const DEFAULT_SIZE = { width: 220, height: 90 }

/**
 * "Tidy up": a layered layout for the roadmap graph (top to bottom by
 * prerequisite depth), dependency-free.
 *
 * 1. Layer each node by its longest chain of prerequisites.
 * 2. Order each layer to reduce edge crossings: start from the current x
 *    order, then a few up/down sweeps placing nodes at the average position
 *    of their neighbours in the adjacent layer (barycentre heuristic).
 * 3. Space rows by the tallest card in each, columns by card width, and keep
 *    the graph roughly where it was on the canvas.
 *
 * Groups, and notes with no connections, are left where they are: they're
 * annotations around the trail, not part of it.
 */
export function autoLayout(nodes: CanvasNode[], edges: CanvasEdge[]): CanvasNode[] {
  const connected = new Set(edges.flatMap((e) => [e.source, e.target]))
  const movable = nodes.filter(
    (n) => n.type !== 'group' && !n.parentId && (n.type !== 'note' || connected.has(n.id)),
  )
  if (movable.length < 2) return nodes
  const ids = new Set(movable.map((n) => n.id))
  const links = edges.filter((e) => ids.has(e.source) && ids.has(e.target) && e.source !== e.target)

  const size = (n: CanvasNode) => ({
    width: n.measured?.width ?? n.width ?? DEFAULT_SIZE.width,
    height: n.measured?.height ?? n.height ?? DEFAULT_SIZE.height,
  })

  // 1. Longest-path layering (Kahn's order; the graph is a DAG, cycles are refused on connect).
  const out = new Map<string, string[]>()
  const inn = new Map<string, string[]>()
  const indeg = new Map<string, number>(movable.map((n) => [n.id, 0]))
  for (const e of links) {
    out.set(e.source, [...(out.get(e.source) ?? []), e.target])
    inn.set(e.target, [...(inn.get(e.target) ?? []), e.source])
    indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1)
  }
  const layerOf = new Map<string, number>(movable.map((n) => [n.id, 0]))
  const queue = movable.filter((n) => indeg.get(n.id) === 0).map((n) => n.id)
  while (queue.length) {
    const u = queue.shift()!
    for (const v of out.get(u) ?? []) {
      layerOf.set(v, Math.max(layerOf.get(v)!, layerOf.get(u)! + 1))
      indeg.set(v, indeg.get(v)! - 1)
      if (indeg.get(v) === 0) queue.push(v)
    }
  }

  const byId = new Map(movable.map((n) => [n.id, n]))
  const layerCount = Math.max(...layerOf.values()) + 1
  const layers: string[][] = Array.from({ length: layerCount }, () => [])
  for (const n of [...movable].sort((a, b) => a.position.x - b.position.x)) layers[layerOf.get(n.id)!].push(n.id)

  // 2. Barycentre sweeps: order by the mean index of neighbours in the layer above (down) or below (up).
  const indexIn = (layer: string[]) => new Map(layer.map((id, i) => [id, i]))
  const reorder = (layer: string[], ref: Map<string, number>, neighbours: Map<string, string[]>) => {
    const score = new Map<string, number>()
    layer.forEach((id, i) => {
      const ns = (neighbours.get(id) ?? []).filter((x) => ref.has(x))
      score.set(id, ns.length ? ns.reduce((s, x) => s + ref.get(x)!, 0) / ns.length : i)
    })
    layer.sort((a, b) => score.get(a)! - score.get(b)!)
  }
  for (let sweep = 0; sweep < 4; sweep++) {
    for (let l = 1; l < layerCount; l++) reorder(layers[l], indexIn(layers[l - 1]), inn)
    for (let l = layerCount - 2; l >= 0; l--) reorder(layers[l], indexIn(layers[l + 1]), out)
  }

  // 3. Coordinates: each row centred on x = 0, rows as tall as their tallest card.
  const placed = new Map<string, { x: number; y: number }>()
  let y = 0
  for (const layer of layers) {
    const widths = layer.map((id) => size(byId.get(id)!).width)
    const total = widths.reduce((a, b) => a + b, 0) + COL_GAP * (layer.length - 1)
    let x = -total / 2
    layer.forEach((id, i) => {
      placed.set(id, { x, y })
      x += widths[i] + COL_GAP
    })
    y += Math.max(...layer.map((id) => size(byId.get(id)!).height)) + ROW_GAP
  }

  // Keep the trail anchored where it was: same top, same horizontal centre.
  const before = movable.map((n) => n.position)
  const after = [...placed.values()]
  const centre = (ps: { x: number }[]) => (Math.min(...ps.map((p) => p.x)) + Math.max(...ps.map((p) => p.x))) / 2
  const dx = centre(before) - centre(after)
  const dy = Math.min(...before.map((p) => p.y)) - Math.min(...after.map((p) => p.y))

  return nodes.map((n) => {
    const p = placed.get(n.id)
    return p ? { ...n, position: { x: Math.round(p.x + dx), y: Math.round(p.y + dy) } } : n
  })
}
