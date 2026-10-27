import type { Node, Edge } from '@xyflow/react'

export type NodeType = 'step' | 'milestone' | 'note' | 'group'

export type BlockType = 'text' | 'link' | 'video' | 'image' | 'checklist'

export interface TextBlock {
  id: string
  type: 'text'
  html: string
}

export interface LinkBlock {
  id: string
  type: 'link'
  url: string
  title: string
  favicon?: string
}

export interface VideoBlock {
  id: string
  type: 'video'
  url: string
  title: string
  thumbnail?: string
  /** "4:05"; only known with a YouTube Data API key. */
  duration?: string
  /** A whole playlist rather than one video. */
  kind?: 'video' | 'playlist'
  itemCount?: number
}

export interface ImageBlock {
  id: string
  type: 'image'
  url: string
  alt?: string
}

export interface ChecklistItem {
  id: string
  text: string
  done: boolean
}

export interface ChecklistBlock {
  id: string
  type: 'checklist'
  items: ChecklistItem[]
}

export type ContentBlock =
  | TextBlock
  | LinkBlock
  | VideoBlock
  | ImageBlock
  | ChecklistBlock

// `extends Record<string, unknown>` is required by @xyflow/react Node type constraint
export interface NodeData extends Record<string, unknown> {
  title: string
  color?: string
  estMinutes?: number
  blocks: ContentBlock[]
}

// Use @xyflow/react's native Node/Edge types so NodeProps<CanvasNode> resolves correctly
export type CanvasNode = Node<NodeData, NodeType>
export type CanvasEdge = Edge

export interface LocalRoadmap {
  id: string
  title: string
  description?: string
  nodes: CanvasNode[]
  edges: CanvasEdge[]
  createdAt: number
  updatedAt: number
}
