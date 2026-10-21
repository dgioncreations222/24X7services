'use client'

import { Search } from 'lucide-react'
import { cn } from '@/lib/cn'

export function Toggle({ checked, onChange, label, size = 'md', disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; size?: 'sm' | 'md'; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex shrink-0 items-center rounded-full transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'h-5 w-9' : 'h-6 w-11',
        checked ? 'bg-brand' : 'bg-line-strong'
      )}
    >
      <span
        className={cn(
          'absolute left-0.5 rounded-full bg-white shadow transition-transform duration-200',
          size === 'sm' ? 'size-4' : 'size-5',
          checked && (size === 'sm' ? 'translate-x-4' : 'translate-x-5')
        )}
      />
    </button>
  )
}

export const inputClass =
  'w-full rounded-lg border border-line-strong bg-card px-3 py-2 text-sm text-ink transition-[border-color,box-shadow] focus:border-brand focus:shadow-focus'

export function Field({ label, hint, children, className }: { label: string; hint?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 block text-[13px] font-bold text-ink-2">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  )
}

export function SearchInput({ value, onChange, placeholder, className }: { value: string; onChange: (v: string) => void; placeholder: string; className?: string }) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn(inputClass, 'h-10 pl-9')}
      />
    </div>
  )
}
