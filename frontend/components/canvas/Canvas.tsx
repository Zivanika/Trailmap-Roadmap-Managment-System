'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  MarkerType,
  ReactFlowProvider,
  useReactFlow,
  type FitViewOptions,
  type NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { useCanvasStore } from '@/store/canvas-store'
import { useUIStore } from '@/store/ui-store'
import { useProgressStore } from '@/store/progress-store'
import { useAutosave } from '@/hooks/use-autosave'
import { PathStateContext, usePathState } from '@/hooks/use-path-state'
import { usePrefersReducedMotion } from '@/hooks/use-motion'
import { GenerateModal } from '@/components/ai/GenerateModal'
import { CanvasToolbar } from './CanvasToolbar'
import { NodePanel } from './NodePanel'
import { EmptyCanvas } from './EmptyCanvas'

import StepNode from '@/components/nodes/StepNode'
import MilestoneNode from '@/components/nodes/MilestoneNode'
import NoteNode from '@/components/nodes/NoteNode'
import GroupNode from '@/components/nodes/GroupNode'
import { MigrationBanner } from './MigrationBanner'

const nodeTypes: NodeTypes = {
  step: StepNode,
  milestone: MilestoneNode,
  note: NoteNode,
  group: GroupNode,
}

const defaultEdgeOptions = {
  markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: '#94a3b8' },
  style: { stroke: '#94a3b8', strokeWidth: 2 },
}

// An edge whose source step is done: the trail so far.
const DONE_EDGE = {
  markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: '#34d399' },
  style: { stroke: '#34d399', strokeWidth: 2.5 },
}

// Extra room at the top so the floating toolbar doesn't sit on the first row of
// nodes; maxZoom stops a lone node being blown up to fill the screen.
const FIT_VIEW_OPTIONS: FitViewOptions = {
  padding: { top: '96px', bottom: '48px', x: '48px' },
  maxZoom: 1,
}

interface CanvasProps {
  /** When true (default), initialise/persist an anonymous roadmap in IndexedDB. */
  localInit?: boolean
  /** Where autosave writes: local IndexedDB, the cloud backend, or disabled. */
  autosaveMode?: 'local' | 'cloud' | 'none'
  /** Hide editing affordances for public read-only view. */
  readOnly?: boolean
}

export function Canvas(props: CanvasProps) {
  // The provider lets the toolbar and empty state (outside <ReactFlow>) read the viewport.
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  )
}

function CanvasInner({ localInit = true, autosaveMode = 'local', readOnly = false }: CanvasProps) {
  const nodes = useCanvasStore((s) => s.nodes)
  const edges = useCanvasStore((s) => s.edges)
  const onNodesChange = useCanvasStore((s) => s.onNodesChange)
  const onEdgesChange = useCanvasStore((s) => s.onEdgesChange)
  const onConnect = useCanvasStore((s) => s.onConnect)
  const setRoadmapId = useCanvasStore((s) => s.setRoadmapId)
  const loadRoadmap = useCanvasStore((s) => s.loadRoadmap)
  const selectNode = useCanvasStore((s) => s.selectNode)
  const closeSidebar = useUIStore((s) => s.closeSidebar)
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)
  const generateOpen = useUIStore((s) => s.generateOpen)
  const setGenerateOpen = useUIStore((s) => s.setGenerateOpen)
  const pathState = usePathState()
  // False until the local roadmap has been read from IndexedDB, so the empty
  // state doesn't flash before its nodes arrive.
  const [localReady, setLocalReady] = useState(!localInit)

  // Colour the trail: edges leaving a done step turn green, and the one leading
  // to the next step is animated to point the way.
  const displayEdges = useMemo(() => {
    if (!pathState) return edges
    return edges.map((e) =>
      pathState.status[e.source] === 'done'
        ? { ...e, ...DONE_EDGE, animated: e.target === pathState.nextId }
        : e,
    )
  }, [edges, pathState])

  useAutosave(autosaveMode)

  // Tells the panels what's possible here (AI tools need the cloud).
  useEffect(() => {
    useCanvasStore.getState().setMode(readOnly ? 'readonly' : autosaveMode === 'cloud' ? 'cloud' : 'local')
  }, [readOnly, autosaveMode])

  // The anonymous/local canvas has no per-user progress tracking.
  useEffect(() => {
    if (autosaveMode === 'local') useProgressStore.getState().reset()
  }, [autosaveMode])

  useEffect(() => {
    if (!localInit) return
    const stored = localStorage.getItem('trailmap:activeRoadmapId')
    if (stored) {
      setRoadmapId(stored)
      import('@/lib/local-db')
        .then(({ getRoadmap }) =>
          getRoadmap(stored).then((r) => {
            if (!r) return
            loadRoadmap(r.nodes, r.edges)
            // Loading isn't an edit; don't let undo step back to the blank canvas.
            useCanvasStore.temporal.getState().clear()
          }),
        )
        .finally(() => setLocalReady(true))
    } else {
      const id = crypto.randomUUID()
      localStorage.setItem('trailmap:activeRoadmapId', id)
      setRoadmapId(id)
      queueMicrotask(() => setLocalReady(true))
    }
    // The store may still hold a roadmap from another page (and its undo
    // history); start this canvas blank until the local one has loaded, so
    // that graph is never shown here or autosaved under the local id.
    loadRoadmap([], [])
    useCanvasStore.temporal.getState().clear()
  }, [setRoadmapId, loadRoadmap, localInit])

  // When someone clicks on the canvas pane (not on a node), we want to deselect any selected node and close the sidebar. This is a common UX pattern to allow users to easily exit node editing mode and return to the main canvas view.
  const handlePaneClick = useCallback(() => {
    selectNode(null)
    closeSidebar()
  }, [selectNode, closeSidebar])

  // When a node drag starts, we pause the temporal state to prevent recording intermediate states during the drag operation. This ensures that only the final position of the node is recorded in the undo/redo history.
  const handleNodeDragStart = useCallback(() => {
    useCanvasStore.temporal.getState().pause() 
  }, [])

  // When a node drag stops, we resume the temporal state to allow recording of subsequent changes. This ensures that the final position of the node is captured in the undo/redo history.
  const handleNodeDragStop = useCallback(() => {
    useCanvasStore.temporal.getState().resume()
  }, [])

  return (
    <div className="flex flex-1 h-full overflow-hidden">
      <div className="relative flex-1 h-full">
        {!readOnly && <CanvasToolbar />}
        {!readOnly && autosaveMode === 'local' && <MigrationBanner />}
        {!readOnly && localReady && nodes.length === 0 && <EmptyCanvas />}
        <PathStateContext.Provider value={pathState}>
          <ReactFlow
            nodes={nodes}
            edges={displayEdges}
            nodeTypes={nodeTypes}
            onNodesChange={readOnly ? undefined : onNodesChange}
            onEdgesChange={readOnly ? undefined : onEdgesChange}
            onConnect={readOnly ? undefined : onConnect}
            onPaneClick={handlePaneClick}
            onNodeDragStart={handleNodeDragStart}
            onNodeDragStop={handleNodeDragStop}
            defaultEdgeOptions={defaultEdgeOptions}
            nodesDraggable={!readOnly}
            nodesConnectable={!readOnly}
            elementsSelectable={!readOnly}
            fitView
            fitViewOptions={FIT_VIEW_OPTIONS}
            colorMode="dark"
          >
            <FitViewOnRequest />
            <Background
              variant={BackgroundVariant.Dots}
              gap={20} //dot ke beech ka gap
              size={1} //dot ka size
              color="#1e4535"
              style={{ backgroundColor: '#07190f' }}
            />
            <Controls />
            {/* On a phone the minimap would cover a third of the canvas. */}
            <MiniMap
              className="max-sm:hidden!"
              zoomable
              pannable
              style={{ backgroundColor: '#0f261b' }}
              maskColor="rgba(0,0,0,0.5)"
            />
          </ReactFlow>
        </PathStateContext.Provider>
      </div>
      {sidebarOpen && <NodePanel />}
      {!readOnly && <GenerateModal open={generateOpen} onClose={() => setGenerateOpen(false)} />}
    </div>
  )
}

/** Re-fits the view whenever something asks for it via `requestFitView` (AI generate, templates). */
function FitViewOnRequest() {
  const request = useUIStore((s) => s.fitViewRequest)
  const { fitView } = useReactFlow()
  const reduceMotion = usePrefersReducedMotion()
  useEffect(() => {
    if (request) fitView({ ...FIT_VIEW_OPTIONS, duration: reduceMotion ? 0 : 400 })
  }, [request, fitView, reduceMotion])
  return null
}
