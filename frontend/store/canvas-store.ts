import { create } from 'zustand'
import { temporal } from 'zundo'
import type { CanvasNode, CanvasEdge, NodeData } from '@/types'
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from '@xyflow/react'
import { wouldCreateCycle } from '@/lib/dag'

/**
 * Changes React Flow sends that aren't edits: selection, and the size it
 * measures for each node on render. A resize from NodeResizer also arrives as
 * a 'dimensions' change, but with `resizing` set, and that one is an edit.
 */
function isCosmetic(change: NodeChange<CanvasNode> | EdgeChange) {
  return change.type === 'select' || (change.type === 'dimensions' && change.resizing === undefined)
}

interface CanvasState {
  roadmapId: string | null
  nodes: CanvasNode[]
  edges: CanvasEdge[]
  selectedNodeId: string | null
  isDirty: boolean
  /** The last autosave failed (it's being retried). */
  saveFailed: boolean

  setRoadmapId: (id: string) => void
  setNodes: (nodes: CanvasNode[]) => void
  setEdges: (edges: CanvasEdge[]) => void
  onNodesChange: (changes: NodeChange<CanvasNode>[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  addNode: (node: CanvasNode) => void
  /** Adds a whole graph (AI output, a template) with fresh ids, to the right of anything already there. */
  insertGraph: (graph: { nodes: CanvasNode[]; edges: CanvasEdge[] }) => void
  updateNodeData: (id: string, data: Partial<NodeData>) => void
  deleteNode: (id: string) => void
  selectNode: (id: string | null) => void
  markClean: () => void
  /** Flags the graph for saving after a change made outside the actions here (undo/redo). */
  markDirty: () => void
  setSaveFailed: (failed: boolean) => void
  loadRoadmap: (nodes: CanvasNode[], edges: CanvasEdge[]) => void
}
export const useCanvasStore = create<CanvasState>()( 
  // temporal allows us to undo/redo changes to the canvas state, with a limit of 50 snapshots
  temporal(
    (set) => {
      // Apply a change without recording an undo step (unless already paused, e.g. mid-drag).
      const untracked = (fn: () => void) => {
        const t = useCanvasStore.temporal.getState()
        if (!t.isTracking) return fn()
        t.pause()
        fn()
        t.resume()
      }
      return {
      roadmapId: null,
      nodes: [],
      edges: [],
      selectedNodeId: null,
      isDirty: false,
      saveFailed: false,

      setRoadmapId: (id) => set({ roadmapId: id }),

      setNodes: (nodes) => set({ nodes, isDirty: true }),

      setEdges: (edges) => set({ edges, isDirty: true }),

      // Selecting or measuring nodes isn't an edit: it shouldn't trigger a save
      // or become an undo step that seems to do nothing.
      onNodesChange: (changes) => {
        const apply = () => set((state) => ({ nodes: applyNodeChanges(changes, state.nodes) }))
        if (changes.every(isCosmetic)) untracked(apply)
        else set((state) => ({ nodes: applyNodeChanges(changes, state.nodes), isDirty: true }))
      },

      onEdgesChange: (changes) => {
        const apply = () => set((state) => ({ edges: applyEdgeChanges(changes, state.edges) }))
        if (changes.every(isCosmetic)) untracked(apply)
        else set((state) => ({ edges: applyEdgeChanges(changes, state.edges), isDirty: true }))
      },

      onConnect: (connection) =>
        set((state) => {
          if (!connection.source || !connection.target) return state
          if (wouldCreateCycle(state.edges, connection.source, connection.target)) return state
          return { edges: addEdge(connection, state.edges), isDirty: true }
        }),

      addNode: (node) =>
        set((state) => ({ nodes: [...state.nodes, node], isDirty: true })), //here we have made isDirty true because we want to autosave the roadmap when a new node is added. This ensures that any changes made to the canvas are persisted in the local database, providing a seamless user experience and preventing data loss.

      insertGraph: (graph) =>
        set((state) => {
          const offsetX = state.nodes.length ? Math.max(...state.nodes.map((n) => n.position.x)) + 340 : 0
          const idMap = new Map<string, string>()
          const nodes = graph.nodes.map((n) => {
            const id = crypto.randomUUID()
            idMap.set(n.id, id)
            return { ...n, id, position: { x: n.position.x + offsetX, y: n.position.y } }
          })
          const edges = graph.edges.map((e) => ({
            id: crypto.randomUUID(),
            source: idMap.get(e.source) ?? e.source,
            target: idMap.get(e.target) ?? e.target,
          }))
          return { nodes: [...state.nodes, ...nodes], edges: [...state.edges, ...edges], isDirty: true }
        }),

      updateNodeData: (id, data) =>
        set((state) => ({
          nodes: state.nodes.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, ...data } } : n,
          ),
          isDirty: true,
        })),

      deleteNode: (id) =>
        set((state) => ({
          nodes: state.nodes.filter((n) => n.id !== id),
          edges: state.edges.filter((e) => e.source !== id && e.target !== id),
          selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
          isDirty: true,
        })),

      selectNode: (id) => set({ selectedNodeId: id }),

      markClean: () => set({ isDirty: false }),

      markDirty: () => set({ isDirty: true }),

      setSaveFailed: (failed) => set({ saveFailed: failed }),

      loadRoadmap: (nodes, edges) => set({ nodes, edges, isDirty: false, saveFailed: false }),
      }
    },
    {
      limit: 50,
      // Only snapshot nodes+edges — ignore selection, dirty flag, roadmapId
      partialize: (state) => ({ nodes: state.nodes, edges: state.edges }),
      // Without this every set() (selecting a node, marking the graph saved) adds an
      // identical snapshot, and Undo appears to do nothing for several clicks.
      equality: (past, current) => past.nodes === current.nodes && past.edges === current.edges, //partialize tells zundo which slice of state to snapshot for undo/redo history. Here it only snapshots nodes and edges, ignoring other state properties like selectedNodeId, isDirty, and roadmapId. This ensures that undo/redo operations only affect the visual elements of the canvas, while preserving the user's selection and other metadata.
    },
  ),
)
