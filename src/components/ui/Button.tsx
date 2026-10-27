import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-150 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer'
    
    const variants = {
      primary: 'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500 shadow-xs hover:shadow-sm',
      secondary: 'bg-rose-100 text-rose-800 hover:bg-rose-200 focus:ring-rose-400',
      outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus:ring-rose-500 shadow-xs',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-xs hover:shadow-sm',
      ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-300',
    }

    const sizes = {
      sm: 'px-2.5 py-1.5 text-xs',
      md: 'px-3.5 py-2 text-sm',
      lg: 'px-5 py-2.5 text-base',
    }

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin shrink-0" />}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
