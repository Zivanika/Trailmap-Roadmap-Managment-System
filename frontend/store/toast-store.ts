import { create } from 'zustand'

export type ToastKind = 'error' | 'success' | 'info'

export interface Toast {
  id: number
  kind: ToastKind
  message: string
  action?: { label: string; onClick: () => void }
}

interface ToastState {
  toasts: Toast[]
  push: (toast: Omit<Toast, 'id'>, opts?: { durationMs?: number; key?: string }) => void
  dismiss: (id: number) => void
}

let nextId = 1
// A key lets a repeating message (e.g. "couldn't save") replace itself instead of stacking.
const byKey = new Map<string, number>()

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (toast, { durationMs = 5000, key } = {}) => {
    if (key && byKey.has(key)) get().dismiss(byKey.get(key)!)
    const id = nextId++
    if (key) byKey.set(key, id)
    set((s) => ({ toasts: [...s.toasts.slice(-3), { ...toast, id }] }))
    if (durationMs > 0) setTimeout(() => get().dismiss(id), durationMs)
  },
  dismiss: (id) => {
    for (const [k, v] of byKey) if (v === id) byKey.delete(k)
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
  },
}))

/** Show a toast from anywhere (stores, hooks, event handlers). */
export const toast = {
  error: (message: string, opts?: { key?: string; durationMs?: number; action?: Toast['action'] }) =>
    useToastStore.getState().push({ kind: 'error', message, action: opts?.action }, opts),
  success: (message: string, opts?: { key?: string; durationMs?: number; action?: Toast['action'] }) =>
    useToastStore.getState().push({ kind: 'success', message, action: opts?.action }, opts),
  info: (message: string, opts?: { key?: string; durationMs?: number; action?: Toast['action'] }) =>
    useToastStore.getState().push({ kind: 'info', message, action: opts?.action }, opts),
  dismissKey: (key: string) => {
    const id = byKey.get(key)
    if (id) useToastStore.getState().dismiss(id)
  },
}
