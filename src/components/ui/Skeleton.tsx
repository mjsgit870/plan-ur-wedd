import * as React from 'react'
import { cn } from '../../lib/utils'

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-lg bg-gray-200/80', className)}
      {...props}
    />
  )
}

export function CardSkeleton() {
  return (
    <div className="p-4 bg-white border border-gray-200 rounded-xl space-y-3">
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-6 w-12 rounded-full" />
      </div>
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-2 w-full rounded-full" />
    </div>
  )
}

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-b border-gray-100">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <Skeleton className="h-4 w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  )
}
