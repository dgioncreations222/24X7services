'use client'

import { cn } from '@/lib/cn'
import { Button } from './Button'

export function TableWrap({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full min-w-[760px] border-collapse text-left text-sm">{children}</table>
    </div>
  )
}

export const th = 'whitespace-nowrap border-b border-line bg-canvas/60 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.06em] text-faint first:pl-5 last:pr-5'
export const td = 'border-b border-line px-4 py-3 align-middle first:whitespace-nowrap first:pl-5 last:pr-5'
export const tr = 'transition-colors hover:bg-canvas/70'

/** Simple previous/next pager under a long table. */
export function Pager({ page, pages, total, onPage }: { page: number; pages: number; total: number; onPage: (p: number) => void }) {
  if (pages <= 1) return <p className="px-5 py-3 text-xs font-semibold text-muted">{total.toLocaleString('en-IN')} results</p>
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3">
      <p className="text-xs font-semibold text-muted">
        Page <span className="num font-bold text-ink">{page + 1}</span> of <span className="num">{pages}</span> · {total.toLocaleString('en-IN')} results
      </p>
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" disabled={page === 0} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <Button size="sm" variant="secondary" disabled={page >= pages - 1} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  )
}
