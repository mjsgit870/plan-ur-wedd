import * as React from 'react'
import { createPortal } from 'react-dom'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn, formatDate } from '../../lib/utils'

export interface DatePickerProps {
  value: string | null | undefined
  onChange: (value: string) => void
  label?: string
  error?: string
  placeholder?: string
  disabled?: boolean
  className?: string
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

const DAYS_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

export function DatePicker({
  value,
  onChange,
  label,
  error,
  placeholder = 'Pilih tanggal...',
  disabled,
  className,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const popoverRef = React.useRef<HTMLDivElement>(null)
  const [coords, setCoords] = React.useState<{
    top: number
    left: number
    placeAbove: boolean
  } | null>(null)

  // Current view year & month
  const initialDate = value ? new Date(value) : new Date()
  const [viewYear, setViewYear] = React.useState(initialDate.getFullYear())
  const [viewMonth, setViewMonth] = React.useState(initialDate.getMonth())

  // Keep view in sync when value changes externally
  React.useEffect(() => {
    if (value) {
      const d = new Date(value)
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear())
        setViewMonth(d.getMonth())
      }
    }
  }, [value])

  const updatePosition = React.useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const popoverEstimatedHeight = 290
    const placeAbove = spaceBelow < popoverEstimatedHeight && rect.top > popoverEstimatedHeight

    // Ensure left does not overflow right viewport
    let left = rect.left
    const popoverWidth = 280
    if (left + popoverWidth > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - popoverWidth - 12)
    }

    setCoords({
      top: placeAbove ? rect.top - 6 : rect.bottom + 6,
      left,
      placeAbove,
    })
  }, [])

  React.useEffect(() => {
    if (isOpen) {
      updatePosition()
    }
  }, [isOpen, updatePosition])

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

  // Click outside to close
  React.useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Days in month calculation
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay()

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(viewYear - 1)
    } else {
      setViewMonth(viewMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(viewYear + 1)
    } else {
      setViewMonth(viewMonth + 1)
    }
  }

  const handleSelectDay = (day: number) => {
    const m = String(viewMonth + 1).padStart(2, '0')
    const d = String(day).padStart(2, '0')
    onChange(`${viewYear}-${m}-${d}`)
    setIsOpen(false)
  }

  const handleSetToday = () => {
    const today = new Date()
    const y = today.getFullYear()
    const m = String(today.getMonth() + 1).padStart(2, '0')
    const d = String(today.getDate()).padStart(2, '0')
    onChange(`${y}-${m}-${d}`)
    setViewYear(y)
    setViewMonth(today.getMonth())
    setIsOpen(false)
  }

  const handleClear = () => {
    onChange('')
    setIsOpen(false)
  }

  // Selected date components
  let selectedYear: number | null = null
  let selectedMonth: number | null = null
  let selectedDay: number | null = null

  if (value) {
    const parts = value.split('-')
    if (parts.length === 3) {
      selectedYear = parseInt(parts[0], 10)
      selectedMonth = parseInt(parts[1], 10) - 1
      selectedDay = parseInt(parts[2], 10)
    }
  }

  const today = new Date()
  const isCurrentMonthToday = today.getFullYear() === viewYear && today.getMonth() === viewMonth

  const calendarPopover = isOpen && coords && typeof document !== 'undefined' ? (
    createPortal(
      <div
        ref={popoverRef}
        style={{
          position: 'fixed',
          top: coords.placeAbove ? 'auto' : `${coords.top}px`,
          bottom: coords.placeAbove ? `${window.innerHeight - coords.top}px` : 'auto',
          left: `${coords.left}px`,
          zIndex: 9999,
        }}
        className="p-3.5 bg-white border border-gray-200 rounded-xl shadow-2xl w-[280px] animate-fade-in select-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-xs font-bold text-gray-800">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>

          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Days of Week */}
        <div className="grid grid-cols-7 gap-1 text-center mb-1">
          {DAYS_SHORT.map((d) => (
            <span key={d} className="text-[11px] font-semibold text-gray-400 py-0.5">
              {d}
            </span>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Blank leading days */}
          {Array.from({ length: firstDayIndex }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}

          {/* Days in month */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const isSelected =
              selectedYear === viewYear &&
              selectedMonth === viewMonth &&
              selectedDay === day
            const isToday = isCurrentMonthToday && today.getDate() === day

            return (
              <button
                key={day}
                type="button"
                onClick={() => handleSelectDay(day)}
                className={cn(
                  'h-7 w-7 text-xs rounded-lg flex items-center justify-center font-medium transition-all duration-100 cursor-pointer mx-auto',
                  isSelected
                    ? 'bg-rose-600 text-white font-bold shadow-xs'
                    : isToday
                    ? 'border border-rose-400 text-rose-600 font-bold hover:bg-rose-50'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                {day}
              </button>
            )
          })}
        </div>

        {/* Footer Shortcuts */}
        <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs font-semibold">
          <button
            type="button"
            onClick={handleSetToday}
            className="text-rose-600 hover:text-rose-700 transition-colors cursor-pointer"
          >
            Hari Ini
          </button>
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>,
      document.body
    )
  ) : null

  return (
    <div className={cn('relative w-full', className)}>
      {label && (
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          {label}
        </label>
      )}

      {/* Input button trigger */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            updatePosition()
            setIsOpen(!isOpen)
          }
        }}
        className={cn(
          'w-full flex items-center justify-between px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg shadow-xs transition-all duration-150 text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500',
          isOpen && 'border-rose-500 ring-2 ring-rose-500/20',
          error && 'border-red-500 focus:ring-red-500',
          disabled && 'opacity-50 cursor-not-allowed bg-gray-50'
        )}
      >
        <div className="flex items-center gap-2 truncate">
          <CalendarIcon className="w-4 h-4 text-gray-400 shrink-0" />
          <span className={value ? 'text-gray-900 font-medium' : 'text-gray-400'}>
            {value ? formatDate(value) : placeholder}
          </span>
        </div>

        {value && !disabled ? (
          <span
            onClick={(e) => {
              e.stopPropagation()
              handleClear()
            }}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-md transition-colors"
            title="Hapus"
          >
            <X className="w-3.5 h-3.5" />
          </span>
        ) : null}
      </button>

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      {calendarPopover}
    </div>
  )
}
