'use client'

import { cn } from '@/lib/cn'

/** Underlined tabs with counts — the status filter on every list. */
export function Tabs<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T
  onChange: (v: T) => void
  options: readonly { value: T; label: string; count?: number; alert?: boolean }[]
  className?: string
}) {
  return (
    <div role="tablist" className={cn('no-scrollbar flex gap-1 overflow-x-auto border-b border-line', className)}>
      {options.map((o) => {
        const on = value === o.value
        return (
          <button
            key={o.value}
            role="tab"
            type="button"
            aria-selected={on}
            onClick={() => onChange(o.value)}
            className={cn(
              'relative flex h-11 shrink-0 items-center gap-2 px-3 text-sm font-bold transition-colors',
              on ? 'text-brand' : 'text-muted hover:text-ink'
            )}
          >
            {o.label}
            {o.count !== undefined && (
              <span
                className={cn(
                  'num rounded-md px-1.5 py-0.5 text-[11px] font-bold',
                  o.alert && o.count > 0 ? 'bg-danger text-white' : on ? 'bg-brand-soft text-brand' : 'bg-canvas text-muted'
                )}
              >
                {o.count}
              </span>
            )}
            {on && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand" />}
          </button>
        )
      })}
    </div>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T
  onChange: (v: T) => void
  options: readonly { value: T; label: React.ReactNode }[]
  className?: string
}) {
  return (
    <div role="tablist" className={cn('inline-flex rounded-lg bg-ink/[0.06] p-0.5', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          type="button"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'h-8 rounded-md px-3 text-[13px] font-bold transition-colors',
            value === o.value ? 'bg-card text-ink shadow-card' : 'text-muted hover:text-ink'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
