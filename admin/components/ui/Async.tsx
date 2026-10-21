'use client'

import { RotateCcw, WifiOff } from 'lucide-react'
import type { Query } from '@/lib/data'
import { cn } from '@/lib/cn'
import { Button } from './Button'

/** Grey bars where rows will be, while a lib/data query loads. */
export function SkeletonRows({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-3 p-5', className)} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="size-10 shrink-0 animate-pulse rounded-lg bg-canvas" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 animate-pulse rounded bg-canvas" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-canvas" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ErrorState({ onRetry, title = 'Couldn’t load this' }: { onRetry: () => void; title?: string }) {
  return (
    <div role="alert" className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-3 grid size-12 place-items-center rounded-full bg-danger-soft text-danger">
        <WifiOff className="size-5" aria-hidden />
      </div>
      <p className="font-bold">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-muted">Check your connection and try again.</p>
      <Button variant="secondary" className="mt-4" onClick={onRetry}>
        <RotateCcw /> Try again
      </Button>
    </div>
  )
}

/**
 * Renders a lib/data query in its three states so no page forgets one: a
 * skeleton while loading, an error with Try again, the `empty` view when
 * there is nothing, and `children(data)` otherwise.
 */
export function Async<T>({
  query,
  children,
  loading = <SkeletonRows />,
  empty = null,
  isEmpty = (d) => Array.isArray(d) && d.length === 0,
}: {
  query: Query<T>
  children: (data: T) => React.ReactNode
  loading?: React.ReactNode
  empty?: React.ReactNode
  isEmpty?: (data: T) => boolean
}) {
  if (query.error) return <ErrorState onRetry={query.refetch} />
  if (query.loading || query.data === undefined) return <>{loading}</>
  if (isEmpty(query.data)) return <>{empty}</>
  return <>{children(query.data)}</>
}
