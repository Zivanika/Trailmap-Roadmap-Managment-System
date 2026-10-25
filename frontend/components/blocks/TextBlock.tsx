'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import type { TextBlock } from '@/types'
import { useEffect } from 'react'

interface Props {
  block: TextBlock
  onChange: (block: TextBlock) => void
  /** 'paper' for the light sticky-note cards, 'panel' for the dark side panel. */
  tone?: 'paper' | 'panel'
}

const TONE = {
  paper: 'text-black/75 [&_.tiptap_.is-editor-empty:first-child::before]:text-black/35',
  panel: 'text-white/80 [&_.tiptap_.is-editor-empty:first-child::before]:text-white/30',
}

// The key benefit over a plain <textarea> is that TipTap gives you a rich text editor that stores content as HTML. StarterKit alone gives you:

// - Bold, italic, strikethrough via keyboard shortcuts (Ctrl+B, Ctrl+I, etc.)
// - Headings (H1–H6)
// - Bullet and ordered lists
// - Blockquotes and code blocks
// - Hard breaks and horizontal rules
// The tradeoff is that the content is stored as HTML (block.html), not plain text. That's why TextBlock has an html: string field — TipTap serialises its content to HTML on every change via editor.getHTML(), and deserialises it back via setContent(block.html) when the block is loaded.
export function TextBlockComponent({ block, onChange, tone = 'paper' }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Add notes...' }),
    ],
    content: block.html,
    onUpdate({ editor }) {
      onChange({ ...block, html: editor.getHTML() })
    },
  })

  useEffect(() => {
    if (editor && editor.getHTML() !== block.html) {
      editor.commands.setContent(block.html, { emitUpdate: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.id])

  return (
    <div className={`prose prose-sm max-w-none [&_.tiptap]:min-h-[28px] [&_.tiptap]:text-[13px] [&_.tiptap]:leading-snug [&_.tiptap]:outline-none ${TONE[tone]}`}>
      <EditorContent editor={editor} />
    </div>
  )
}
