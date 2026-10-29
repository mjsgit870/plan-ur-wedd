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
  const [mounted, setMounted] = React.useState(isOpen)
  const [isClosing, setIsClosing] = React.useState(false)

  // Handle open/close mounting
  React.useEffect(() => {
    let timer: number
    if (isOpen) {
      setIsClosing(false)
      setMounted(true)
    } else if (mounted) {
      setIsClosing(true)
      timer = window.setTimeout(() => {
        setMounted(false)
        setIsClosing(false)
      }, 190) // matches exit animation duration
    }
    return () => clearTimeout(timer)
  }, [isOpen, mounted])

  // Handle ESC key and scroll lock
  React.useEffect(() => {
    if (!mounted) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow || 'unset'
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/60 backdrop-blur-xs',
          isClosing ? 'animate-backdrop-out' : 'animate-backdrop-in'
        )}
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Dialog box */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative w-full bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col z-10 will-change-transform',
          widths[maxWidth],
          isClosing ? 'animate-modal-out' : 'animate-modal-in'
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
            type="button"
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
