'use client'

import { useState } from 'react'
import { Download, FileJson, Image as ImageIcon, FileText } from 'lucide-react'
import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'
import { getNodesBounds, getViewportForBounds } from '@xyflow/react'
import { useCanvasStore } from '@/store/canvas-store'
import type { CanvasNode } from '@/types'

function slugify(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'roadmap'
}

function downloadUrl(url: string, filename: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
}

/** Render the whole graph (all nodes, not just the visible viewport) to a PNG data URL. */
async function renderPng(nodes: CanvasNode[]): Promise<string | null> {
  const viewportEl = document.querySelector('.react-flow__viewport') as HTMLElement | null
  if (!viewportEl || nodes.length === 0) return null

  const bounds = getNodesBounds(nodes)
  const pad = 80
  const width = Math.min(Math.max(Math.ceil(bounds.width) + pad * 2, 640), 4096)
  const height = Math.min(Math.max(Math.ceil(bounds.height) + pad * 2, 480), 4096)
  const vp = getViewportForBounds(bounds, width, height, 0.2, 2, 0.1)

  return toPng(viewportEl, {
    backgroundColor: '#0f172a',
    width,
    height,
    style: {
      width: `${width}px`,
      height: `${height}px`,
      transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})`,
    },
  })
}

export function ExportMenu({ title }: { title: string }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  async function run(fn: () => Promise<void> | void) {
    setOpen(false)
    setBusy(true)
    try {
      await fn()
    } catch (err) {
      console.error('[export] failed', err)
    } finally {
      setBusy(false)
    }
  }

  function exportJson() {
    const { nodes, edges } = useCanvasStore.getState()
    const blob = new Blob([JSON.stringify({ title, nodes, edges }, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    downloadUrl(url, `${slugify(title)}.json`)
    URL.revokeObjectURL(url)
  }

  async function exportPng() {
    const dataUrl = await renderPng(useCanvasStore.getState().nodes)
    if (dataUrl) downloadUrl(dataUrl, `${slugify(title)}.png`)
  }

  async function exportPdf() {
    const { nodes } = useCanvasStore.getState()
    const dataUrl = await renderPng(nodes)
    if (!dataUrl) return
    const img = new window.Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = reject
      img.src = dataUrl
    })
    const pdf = new jsPDF({
      orientation: img.width >= img.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [img.width, img.height],
    })
    pdf.addImage(dataUrl, 'PNG', 0, 0, img.width, img.height)
    pdf.save(`${slugify(title)}.pdf`)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={busy}
        className="flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-white/20 disabled:opacity-50 sm:px-3"
        title="Export"
        aria-label="Export"
      >
        <Download size={13} />
        {/* Icon only on phones, where the header is short of room. */}
        <span className="hidden sm:inline">{busy ? 'Exporting…' : 'Export'}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-50 w-40 origin-top-right overflow-hidden rounded-xl animate-in fade-in-0 zoom-in-95 duration-150 border border-white/10 bg-neutral-900 shadow-2xl">
            <ExportItem icon={ImageIcon} label="PNG image" onClick={() => run(exportPng)} />
            <ExportItem icon={FileText} label="PDF" onClick={() => run(exportPdf)} />
            <ExportItem icon={FileJson} label="JSON" onClick={() => run(exportJson)} />
          </div>
        </>
      )}
    </div>
  )
}

function ExportItem({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof FileJson
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-white/80 transition-colors hover:bg-white/5"
    >
      <Icon size={14} />
      {label}
    </button>
  )
}
