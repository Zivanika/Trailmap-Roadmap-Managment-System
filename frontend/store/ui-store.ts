import { create } from 'zustand'

interface UIState {
  sidebarOpen: boolean
  activePanelNodeId: string | null
  generateOpen: boolean
  /** Bumped to ask the canvas to fit everything into view (e.g. after a template is added). */
  fitViewRequest: number

  openSidebar: (nodeId: string) => void
  closeSidebar: () => void
  toggleSidebar: () => void
  setGenerateOpen: (open: boolean) => void
  requestFitView: () => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  activePanelNodeId: null,
  generateOpen: false,
  fitViewRequest: 0,

  openSidebar: (nodeId) => set({ sidebarOpen: true, activePanelNodeId: nodeId }),
  closeSidebar: () => set({ sidebarOpen: false, activePanelNodeId: null }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setGenerateOpen: (open) => set({ generateOpen: open }),
  requestFitView: () => set((s) => ({ fitViewRequest: s.fitViewRequest + 1 })),
}))
