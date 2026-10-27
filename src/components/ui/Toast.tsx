import { create } from 'zustand'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { cn } from '../../lib/utils'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastItem {
  id: string
  title: string
  message?: string
  type: ToastType
  duration?: number
}

interface ToastStore {
  toasts: ToastItem[]
  addToast: (toast: Omit<ToastItem, 'id'>) => void
  removeToast: (id: string) => void
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast: ToastItem = { ...toast, id }
    set((state) => ({ toasts: [...state.toasts, newToast] }))

    const timeout = toast.duration ?? 3500
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
    }, timeout)
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}))

export const toast = {
  success: (title: string, message?: string) =>
    useToastStore.getState().addToast({ title, message, type: 'success' }),
  error: (title: string, message?: string) =>
    useToastStore.getState().addToast({ title, message, type: 'error' }),
  info: (title: string, message?: string) =>
    useToastStore.getState().addToast({ title, message, type: 'info' }),
}

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none p-2 sm:p-0">
      {toasts.map((t) => {
        const icons = {
          success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
          error: <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />,
          info: <Info className="w-5 h-5 text-sky-500 shrink-0" />,
        }

        const borders = {
          success: 'border-emerald-200 bg-emerald-50/90 text-emerald-950',
          error: 'border-red-200 bg-red-50/90 text-red-950',
          info: 'border-sky-200 bg-sky-50/90 text-sky-950',
        }

        return (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-lg backdrop-blur-md transition-all duration-200 animate-fade-in',
              borders[t.type]
            )}
          >
            {icons[t.type]}
            <div className="flex-1 min-w-0">
              <h5 className="text-xs font-bold leading-tight">{t.title}</h5>
              {t.message && (
                <p className="text-[11px] opacity-80 mt-0.5 leading-snug">{t.message}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="p-1 rounded-md opacity-60 hover:opacity-100 transition-opacity cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
