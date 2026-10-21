'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { BriefcaseBusiness, Search } from 'lucide-react'
import { APPLIANCE_LABEL, BRAND_LABEL } from '@/lib/catalog'
import { matches } from '@/lib/format'
import { useStore } from '@/lib/store'
import { Avatar, type Side } from '../ui'

/** One box that finds a booking, a customer or a technician by anything about them. */
export function GlobalSearch() {
  const store = useStore()
  const router = useRouter()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDown = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement))) {
        e.preventDefault()
        box.current?.querySelector('input')?.focus()
        setOpen(true)
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  const results = useMemo(() => {
    if (q.trim().length < 2) return null
    const bookings = store.bookings
      .filter((b) => matches([b.id, store.customer(b.customerId)?.name, BRAND_LABEL[b.brand], APPLIANCE_LABEL[b.appliance], b.area, b.issue], q))
      .slice(0, 5)
    const customers = store.customers.filter((c) => matches([c.id, c.name, c.phone.replace(/\s/g, ''), c.email, c.area], q)).slice(0, 4)
    const techs = store.technicians.filter((t) => matches([t.id, t.name, t.phone.replace(/\s/g, ''), t.area], q)).slice(0, 4)
    return { bookings, customers, techs }
  }, [q, store])

  const go = (href: string) => {
    setOpen(false)
    setQ('')
    router.push(href as Route)
  }
  const none = results && !results.bookings.length && !results.customers.length && !results.techs.length

  return (
    <div ref={box} className="relative hidden w-full max-w-md sm:block">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden />
      <input
        type="search"
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search bookings, customers, technicians…"
        aria-label="Search"
        className="h-10 w-full rounded-lg border border-line bg-canvas pl-9 pr-12 text-sm font-medium placeholder:text-faint focus:border-brand focus:bg-card focus:shadow-focus"
      />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-line-strong bg-card px-1.5 text-[10px] font-bold text-faint md:block">Ctrl K</kbd>
      {open && results && (
        <div className="animate-fade absolute inset-x-0 top-12 z-50 max-h-[70dvh] overflow-y-auto rounded-xl border border-line bg-card p-2 shadow-float">
          {none && <p className="px-3 py-6 text-center text-sm font-semibold text-muted">Nothing matches “{q}”</p>}
          {!!results.bookings.length && <ResultGroup label="Bookings" />}
          {results.bookings.map((b) => (
            <ResultRow
              key={b.id}
              onClick={() => go(`/bookings/?id=${b.id}`)}
              title={`${b.id} · ${BRAND_LABEL[b.brand]} ${APPLIANCE_LABEL[b.appliance]}`}
              sub={`${store.customer(b.customerId)?.name} · ${b.area}`}
            />
          ))}
          {!!results.customers.length && <ResultGroup label="Customers" />}
          {results.customers.map((c) => (
            <ResultRow key={c.id} onClick={() => go(`/customers/?id=${c.id}`)} title={c.name} sub={`${c.id} · ${c.area}`} avatar={c.name} side="customer" />
          ))}
          {!!results.techs.length && <ResultGroup label="Technicians" />}
          {results.techs.map((t) => (
            <ResultRow key={t.id} onClick={() => go(`/technicians/?id=${t.id}`)} title={t.name} sub={`${t.id} · ${t.area}`} avatar={t.name} side="technician" />
          ))}
        </div>
      )}
    </div>
  )
}

function ResultGroup({ label }: { label: string }) {
  return <p className="px-3 pb-1 pt-2 text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-faint">{label}</p>
}

function ResultRow({ title, sub, onClick, avatar, side }: { title: string; sub: string; onClick: () => void; avatar?: string; side?: Side }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-canvas">
      {avatar ? <Avatar name={avatar} size={28} side={side} /> : <span className="grid size-7 place-items-center rounded-md bg-brand-soft text-brand"><BriefcaseBusiness className="size-3.5" /></span>}
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold">{title}</span>
        <span className="block truncate text-xs font-medium text-muted">{sub}</span>
      </span>
    </button>
  )
}
