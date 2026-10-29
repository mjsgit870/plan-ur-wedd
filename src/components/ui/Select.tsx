import * as React from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface SelectOption {
  label: string
  value: string | number
}

export interface SelectProps {
  label?: string
  error?: string
  value?: string | number
  onChange?: (e: { target: { value: string; name?: string } }) => void
  options?: SelectOption[]
  placeholder?: string
  disabled?: boolean
  className?: string
  id?: string
  name?: string
  children?: React.ReactNode
}

export function Select({
  label,
  error,
  value,
  onChange,
  options: propsOptions,
  placeholder = 'Pilih opsi...',
  disabled,
  className,
  id,
  name,
  children,
}: SelectProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const menuRef = React.useRef<HTMLDivElement>(null)
  const [coords, setCoords] = React.useState<{
    top: number
    left: number
    width: number
    placeAbove: boolean
  } | null>(null)

  // Extract options from props or children <option> tags
  const options = React.useMemo<SelectOption[]>(() => {
    if (propsOptions && propsOptions.length > 0) {
      return propsOptions
    }
    const extracted: SelectOption[] = []
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child) && child.type === 'option') {
        const childProps = child.props as { value?: string | number; children?: React.ReactNode }
        extracted.push({
          value: childProps.value ?? '',
          label: String(childProps.children ?? childProps.value ?? ''),
        })
      }
    })
    return extracted
  }, [propsOptions, children])

  const updatePosition = React.useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const menuEstimatedHeight = 220
    const placeAbove = spaceBelow < menuEstimatedHeight && rect.top > menuEstimatedHeight
    const menuWidth = Math.max(rect.width, 190)
    const leftPos = Math.max(8, Math.min(rect.left, window.innerWidth - menuWidth - 8))

    setCoords({
      top: placeAbove ? rect.top - 6 : rect.bottom + 6,
      left: leftPos,
      width: menuWidth,
      placeAbove,
    })
  }, [])

  // Update position when opened
  React.useEffect(() => {
    if (isOpen) {
      updatePosition()
    }
  }, [isOpen, updatePosition])

  // Track window resize and container scroll (capture: true catches modal scrolling)
  React.useEffect(() => {
    if (!isOpen) return

    const handleScrollOrResize = () => {
      updatePosition()
    }

    window.addEventListener('resize', handleScrollOrResize)
    window.addEventListener('scroll', handleScrollOrResize, true)

    return () => {
      window.removeEventListener('resize', handleScrollOrResize)
      window.removeEventListener('scroll', handleScrollOrResize, true)
    }
  }, [isOpen, updatePosition])

  // Click outside detection
  React.useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const selectedOption = options.find((opt) => String(opt.value) === String(value))

  const handleSelect = (val: string | number) => {
    if (onChange) {
      onChange({ target: { value: String(val), name } })
    }
    setIsOpen(false)
  }

  const dropdownMenu = isOpen && coords && typeof document !== 'undefined' ? (
    createPortal(
      <div
        ref={menuRef}
        style={{
          position: 'fixed',
          top: coords.placeAbove ? 'auto' : `${coords.top}px`,
          bottom: coords.placeAbove ? `${window.innerHeight - coords.top}px` : 'auto',
          left: `${coords.left}px`,
          width: `${coords.width}px`,
          zIndex: 9999,
        }}
        className="bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto animate-fade-in p-1 select-none"
      >
        {options.map((opt) => {
          const isSelected = String(opt.value) === String(value)
          return (
            <div
              key={String(opt.value)}
              onClick={() => handleSelect(opt.value)}
              className={cn(
                'flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg cursor-pointer transition-colors',
                isSelected
                  ? 'bg-rose-50 text-rose-900 font-bold'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <span className="truncate">{opt.label}</span>
              {isSelected && <Check className="w-3.5 h-3.5 text-rose-600 shrink-0 ml-2" />}
            </div>
          )
        })}
        {options.length === 0 && (
          <div className="px-3 py-2 text-xs text-gray-400 text-center">
            Tidak ada opsi tersedia
          </div>
        )}
      </div>,
      document.body
    )
  ) : null

  return (
    <div className={cn('relative w-full', className)}>
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold text-gray-700 mb-1">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            updatePosition()
            setIsOpen(!isOpen)
          }
        }}
        className={cn(
          'w-full flex items-center justify-between px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm bg-white border border-gray-300 rounded-lg shadow-xs transition-all duration-150 text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500',
          isOpen && 'border-rose-500 ring-2 ring-rose-500/20',
          error && 'border-red-500 focus:ring-red-500',
          disabled && 'opacity-50 cursor-not-allowed bg-gray-50'
        )}
      >
        <span
          className={cn(
            'truncate',
            selectedOption ? 'text-gray-900 font-medium' : 'text-gray-400'
          )}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 transition-transform duration-200 shrink-0 ml-1.5 sm:ml-2',
            isOpen && 'rotate-180 text-rose-600'
          )}
        />
      </button>

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      {dropdownMenu}
    </div>
  )
}
