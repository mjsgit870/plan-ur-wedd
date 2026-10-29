import * as React from 'react'
import { cn } from '../../lib/utils'

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  label?: string
  error?: string
  value?: number | string | null
  onChange?: (value: number) => void
  prefix?: string
}

function formatNumberWithDots(val: number | string | null | undefined): string {
  if (val === undefined || val === null || val === '') return ''
  const num = typeof val === 'string' ? Number(val.replace(/\D/g, '')) : val
  if (isNaN(num)) return ''
  return new Intl.NumberFormat('id-ID').format(num)
}

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, label, error, id, value, onChange, prefix = 'Rp', placeholder = '0', disabled, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    const [displayVal, setDisplayVal] = React.useState<string>(() => {
      if (value === 0 || value === '0') return '0'
      return formatNumberWithDots(value)
    })

    // Sync state if external value changes (e.g. form reset)
    React.useEffect(() => {
      if (value === undefined || value === null || value === '') {
        setDisplayVal('')
      } else {
        const rawNum = typeof value === 'number' ? value : Number(String(value).replace(/\D/g, ''))
        setDisplayVal(isNaN(rawNum) ? '' : new Intl.NumberFormat('id-ID').format(rawNum))
      }
    }, [value])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/\D/g, '')
      if (!raw) {
        setDisplayVal('')
        onChange?.(0)
        return
      }
      const num = Number(raw)
      setDisplayVal(new Intl.NumberFormat('id-ID').format(num))
      onChange?.(num)
    }

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-gray-700 mb-1">
            {label}
          </label>
        )}
        <div className="relative rounded-lg shadow-xs">
          {prefix && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400 text-xs font-semibold">{prefix}</span>
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            type="text"
            inputMode="numeric"
            value={displayVal}
            onChange={handleChange}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              'w-full py-2 text-sm bg-white border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all duration-150',
              prefix ? 'pl-9 pr-3' : 'px-3',
              error && 'border-red-500 focus:ring-red-500 focus:border-red-500',
              disabled && 'bg-gray-50 text-gray-500 cursor-not-allowed',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    )
  }
)
CurrencyInput.displayName = 'CurrencyInput'
