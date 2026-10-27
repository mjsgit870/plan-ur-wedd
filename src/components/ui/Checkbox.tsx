import { Check } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface CheckboxProps {
  id?: string
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  description?: string
  disabled?: boolean
  className?: string
}

export function Checkbox({
  id,
  checked,
  onChange,
  label,
  description,
  disabled,
  className,
}: CheckboxProps) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

  return (
    <div
      className={cn(
        'inline-flex items-start gap-2.5 cursor-pointer select-none',
        disabled && 'opacity-50 pointer-events-none',
        className
      )}
      onClick={() => !disabled && onChange(!checked)}
    >
      <div
        id={inputId}
        role="checkbox"
        aria-checked={checked}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault()
            if (!disabled) onChange(!checked)
          }
        }}
        className={cn(
          'w-4.5 h-4.5 mt-0.5 rounded-md border flex items-center justify-center transition-all duration-150 active:scale-90 focus:outline-none focus:ring-2 focus:ring-rose-500/20',
          checked
            ? 'bg-rose-600 border-rose-600 text-white shadow-xs'
            : 'border-gray-300 bg-white hover:border-rose-400'
        )}
      >
        <Check
          className={cn(
            'w-3.5 h-3.5 stroke-[3] transition-all duration-150',
            checked ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
          )}
        />
      </div>

      {(label || description) && (
        <div className="flex flex-col">
          {label && (
            <span className="text-xs font-semibold text-gray-800 leading-tight">
              {label}
            </span>
          )}
          {description && (
            <span className="text-[11px] text-gray-500 mt-0.5 leading-snug">
              {description}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
