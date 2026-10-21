'use client'

import Link from 'next/link'
import type { Route } from 'next'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react'
import { useToast } from '@/components/toast'
import { Chip, PageHeader, th } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { SortDir } from './useTable'

const PAGES: { href: Route; label: string }[] = [
  { href: '/catalog/categories', label: 'Categories' },
  { href: '/catalog/services', label: 'Services' },
  { href: '/catalog/questions', label: 'Questions' },
  { href: '/catalog/rate-card', label: 'Rate card' },
  { href: '/catalog/areas', label: 'Service areas' },
]

/** The catalog's title and its five pages, as tabs that are links. */
export function CatalogHeader({ sub, actions }: { sub: string; actions?: React.ReactNode }) {
  const pathname = usePathname().replace(/\/$/, '')
  return (
    <>
      <PageHeader title="Catalog" sub={sub} actions={actions} />
      <nav aria-label="Catalog" className="no-scrollbar mb-5 flex gap-1 overflow-x-auto border-b border-line">
        {PAGES.map((p) => {
          const on = pathname === p.href
          return (
            <Link
              key={p.href}
              href={p.href}
              aria-current={on ? 'page' : undefined}
              className={cn('relative flex h-11 shrink-0 items-center px-3 text-sm font-bold transition-colors', on ? 'text-brand' : 'text-muted hover:text-ink')}
            >
              {p.label}
              {on && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand" />}
            </Link>
          )
        })}
      </nav>
    </>
  )
}

/** A column header that sorts the table when clicked. */
export function SortTh<S extends string>({
  by,
  label,
  sort,
  onSort,
  className,
}: {
  by: S
  label: string
  sort: { by: S; dir: SortDir }
  onSort: (by: S) => void
  className?: string
}) {
  const on = sort.by === by
  const Icon = on ? (sort.dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown
  return (
    <th className={cn(th, className)} aria-sort={on ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => onSort(by)} className={cn('inline-flex items-center gap-1 uppercase', on ? 'text-ink-2' : 'hover:text-muted')}>
        {label}
        <Icon className="size-3" aria-hidden />
      </button>
    </th>
  )
}

/** Up / down, for tables whose order is what customers see. */
export function Reorder({ onMove, first, last, disabled, label }: { onMove: (dir: -1 | 1) => void; first: boolean; last: boolean; disabled?: boolean; label: string }) {
  const btn = 'grid size-7 place-items-center rounded-md text-muted hover:bg-canvas hover:text-ink disabled:cursor-not-allowed disabled:opacity-30'
  return (
    <span className="inline-flex flex-col">
      <button type="button" aria-label={`Move ${label} up`} disabled={disabled || first} onClick={() => onMove(-1)} className={btn}>
        <ChevronUp className="size-4" />
      </button>
      <button type="button" aria-label={`Move ${label} down`} disabled={disabled || last} onClick={() => onMove(1)} className={btn}>
        <ChevronDown className="size-4" />
      </button>
    </span>
  )
}

export function StatusChip({ active }: { active: boolean }) {
  return <Chip tone={active ? 'success' : 'neutral'}>{active ? 'Live' : 'Hidden'}</Chip>
}

/** Show / Hide: hidden items stay on old bookings but customers stop seeing them. */
export function HideButton({ active, onToggle, disabled }: { active: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-bold text-ink-2 hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40"
    >
      {active ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
      {active ? 'Hide' : 'Show'}
    </button>
  )
}

/**
 * Runs one admin action at a time: a receipt toast when it works, the
 * reason when the form needs fixing, and a plain network message otherwise.
 */
export function useAction() {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function run(action: () => Promise<unknown>, done?: string, then?: () => void) {
    setBusy(true)
    setError(null)
    try {
      await action()
      if (done) toast(done)
      then?.()
      return true
    } catch (e) {
      // Anything but the network is a sentence for the form (CatalogError, PartnerError…).
      const formError = e instanceof Error && e.name !== 'NetworkError'
      const msg = formError ? e.message : 'Couldn’t save. Check your connection and try again.'
      setError(msg)
      if (!formError) toast(msg)
      return false
    } finally {
      setBusy(false)
    }
  }
  return { run, busy, error, setError }
}

export { rupees } from '@/lib/money'

export function FormError({ error }: { error: string | null }) {
  if (!error) return null
  return (
    <p role="alert" className="rounded-lg border border-danger/25 bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">
      {error}
    </p>
  )
}
