import * as React from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl'
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md',
}: ModalProps) {
  const [mounted, setMounted] = React.useState(false)
  const [visible, setVisible] = React.useState(false)

  // Handle open/close transitions
  React.useEffect(() => {
    let timer: number
    if (isOpen) {
      setMounted(true)
      // Trigger enter transition in next frame
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setVisible(true)
        })
      })
    } else {
      setVisible(false)
      timer = window.setTimeout(() => {
        setMounted(false)
      }, 200) // matches transition duration
    }
    return () => clearTimeout(timer)
  }, [isOpen])

  // Handle ESC key and scroll lock
  React.useEffect(() => {
    if (!mounted) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = 'unset'
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [mounted, onClose])

  if (!mounted || typeof document === 'undefined') return null

  const widths = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  }

  const modalContent = (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all duration-200 ease-out',
        visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      )}
    >
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200 ease-out',
          visible ? 'opacity-100' : 'opacity-0'
        )}
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Dialog box */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative w-full bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col z-10 transition-all duration-200 ease-out',
          widths[maxWidth],
          visible
            ? 'translate-y-0 scale-100 opacity-100'
            : 'translate-y-8 sm:translate-y-2 sm:scale-95 opacity-0'
        )}
      >
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
          <div>
            <h3 className="text-base font-bold text-gray-900">{title}</h3>
            {description && (
              <p className="text-xs text-gray-500 mt-0.5">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
