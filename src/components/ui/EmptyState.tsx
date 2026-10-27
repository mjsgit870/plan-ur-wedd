import type { LucideIcon } from 'lucide-react'
import { Button } from './Button'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="p-8 sm:p-12 text-center bg-white rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center animate-fade-in">
      <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 border border-rose-100 flex items-center justify-center mb-3.5 shadow-2xs">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-bold text-gray-900">{title}</h3>
      <p className="text-xs text-gray-500 max-w-sm mt-1 mb-4 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
