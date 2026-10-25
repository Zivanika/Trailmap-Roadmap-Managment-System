import type { CanvasEdge, CanvasNode, ContentBlock } from '@/types'

interface TemplateStep {
  title: string
  estMinutes?: number
  milestone?: boolean
  link?: { url: string; title: string }
}

export interface RoadmapTemplate {
  id: string
  title: string
  description: string
  emoji: string
  /** Each row is laid out side by side; every step in a row depends on every step in the row above. */
  rows: TemplateStep[][]
}

export const TEMPLATES: RoadmapTemplate[] = [
  {
    id: 'web',
    title: 'Web development basics',
    description: 'HTML, CSS and JavaScript up to your first deployed site.',
    emoji: '🌐',
    rows: [
      [{ title: 'How the web works', estMinutes: 45, link: { url: 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Getting_started/Web_standards/How_the_web_works', title: 'MDN: How the web works' } }],
      [
        { title: 'HTML fundamentals', estMinutes: 180, link: { url: 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Structuring_content', title: 'MDN: Structuring content with HTML' } },
        { title: 'CSS fundamentals', estMinutes: 240, link: { url: 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics', title: 'MDN: CSS styling basics' } },
      ],
      [{ title: 'JavaScript essentials', estMinutes: 480, link: { url: 'https://javascript.info/first-steps', title: 'javascript.info: Fundamentals' } }],
      [{ title: 'Deploy a personal site', estMinutes: 300, milestone: true }],
    ],
  },
  {
    id: 'data',
    title: 'Data analysis with Python',
    description: 'From Python basics to a small analysis project.',
    emoji: '📊',
    rows: [
      [{ title: 'Python basics', estMinutes: 360, link: { url: 'https://docs.python.org/3/tutorial/', title: 'The Python tutorial' } }],
      [
        { title: 'NumPy arrays', estMinutes: 120, link: { url: 'https://numpy.org/doc/stable/user/absolute_beginners.html', title: 'NumPy for absolute beginners' } },
        { title: 'pandas DataFrames', estMinutes: 240, link: { url: 'https://pandas.pydata.org/docs/getting_started/intro_tutorials/', title: 'pandas getting-started tutorials' } },
      ],
      [{ title: 'Charts with matplotlib', estMinutes: 120, link: { url: 'https://matplotlib.org/stable/tutorials/pyplot.html', title: 'Pyplot tutorial' } }],
      [{ title: 'Analyse a real dataset', estMinutes: 360, milestone: true }],
    ],
  },
  {
    id: 'habit',
    title: 'Learn anything in 30 days',
    description: 'A simple weekly structure you can fill in for any skill.',
    emoji: '🗓️',
    rows: [
      [{ title: 'Week 1: map the basics', estMinutes: 300 }],
      [{ title: 'Week 2: practise daily', estMinutes: 300 }],
      [{ title: 'Week 3: build something', estMinutes: 300 }],
      [{ title: 'Week 4: share your work', estMinutes: 180, milestone: true }],
    ],
  },
]

const COL_GAP = 280
const ROW_GAP = 190

/** Turns a template into canvas nodes/edges, centred on x = 0. */
export function buildTemplate(t: RoadmapTemplate): { nodes: CanvasNode[]; edges: CanvasEdge[] } {
  const nodes: CanvasNode[] = []
  const edges: CanvasEdge[] = []
  let prevRow: string[] = []

  t.rows.forEach((row, r) => {
    const ids = row.map((step, c) => {
      const id = `${t.id}-${r}-${c}`
      const blocks: ContentBlock[] = step.link
        ? [{ id: crypto.randomUUID(), type: 'link', url: step.link.url, title: step.link.title }]
        : []
      nodes.push({
        id,
        type: step.milestone ? 'milestone' : 'step',
        position: { x: (c - (row.length - 1) / 2) * COL_GAP, y: r * ROW_GAP },
        data: { title: step.title, estMinutes: step.estMinutes, blocks, color: 'green' },
      })
      return id
    })
    for (const source of prevRow) for (const target of ids) edges.push({ id: `${source}>${target}`, source, target })
    prevRow = ids
  })

  return { nodes, edges }
}
