'use client'

import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { useToastStore, type ToastKind } from '@/store/toast-store'
import { cn } from '@/lib/utils'

const STYLE: Record<ToastKind, { icon: typeof Info; tone: string }> = {
  error: { icon: AlertCircle, tone: 'text-red-300' },
  success: { icon: CheckCircle2, tone: 'text-emerald-300' },
  info: { icon: Info, tone: 'text-sky-300' },
}

/** Bottom-centre stack of toasts; announced to screen readers. */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[2000] flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((t) => {
        const { icon: Icon, tone } = STYLE[t.kind]
        return (
          <div
            key={t.id}
            role={t.kind === 'error' ? 'alert' : 'status'}
            className="tm-fade-up pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border border-white/10 bg-[#0b1a12]/95 px-4 py-3 text-sm text-white shadow-2xl backdrop-blur"
          >
            <Icon size={16} className={cn('mt-0.5 shrink-0', tone)} />
            <p className="min-w-0 flex-1 text-white/85">{t.message}</p>
            {t.action && (
              <button
                onClick={() => {
                  t.action!.onClick()
                  dismiss(t.id)
                }}
                className="shrink-0 font-medium text-emerald-300 hover:text-emerald-200"
              >
                {t.action.label}
              </button>
            )}
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="shrink-0 text-white/40 hover:text-white">
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
