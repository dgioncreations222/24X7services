'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { APPLIANCE_LABEL, BRAND_LABEL } from '@/lib/catalog'
import { cn } from '@/lib/cn'
import { ago } from '@/lib/format'
import { useStore, useTick } from '@/lib/store'

/** Everything that needs a person, newest first. */
function useAlerts() {
  const s = useStore()
  return useMemo(() => {
    const out: { id: string; tone: 'danger' | 'warning' | 'brand'; title: string; body: string; href: string; at: string }[] = []
    for (const b of s.bookings) {
      if (b.priority === 'emergency' && b.status === 'confirmed')
        out.push({ id: `em-${b.id}`, tone: 'danger', title: 'Emergency waiting for a technician', body: `${b.id} · ${BRAND_LABEL[b.brand]} ${APPLIANCE_LABEL[b.appliance]}, ${b.area}`, href: `/dispatch/?id=${b.id}`, at: b.createdAt })
    }
    for (const t of s.tickets) {
      if (t.status === 'open' && (t.priority === 'urgent' || t.priority === 'high'))
        out.push({ id: `tk-${t.id}`, tone: t.priority === 'urgent' ? 'danger' : 'warning', title: `${t.priority === 'urgent' ? 'Urgent' : 'High priority'} ticket from a ${t.side}`, body: `${t.id} · ${t.subject}`, href: `/support/?id=${t.id}`, at: t.createdAt })
    }
    for (const t of s.technicians) {
      if (t.kyc === 'pending') out.push({ id: `kyc-${t.id}`, tone: 'warning', title: 'Technician application to review', body: `${t.name} · ${t.experienceYears} yrs, ${t.area}`, href: `/technicians/?id=${t.id}`, at: t.joinedAt })
    }
    for (const r of s.reviews) {
      if (r.status === 'flagged') out.push({ id: `rv-${r.id}`, tone: 'warning', title: `${r.rating}★ review flagged`, body: r.text || 'No comment left', href: '/reviews', at: r.at })
    }
    return out.sort((a, b) => b.at.localeCompare(a.at))
  }, [s.bookings, s.tickets, s.technicians, s.reviews])
}
export function Alerts() {
  const store = useStore()
  const router = useRouter()
  const alerts = useAlerts()
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const unseen = alerts.filter((a) => !store.seen.includes(a.id)).length
  useTick(60_000)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-label={`Notifications${unseen ? `, ${unseen} new` : ''}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative grid size-10 place-items-center rounded-lg text-ink-2 hover:bg-canvas"
      >
        <Bell className="size-5" />
        {unseen > 0 && (
          <span className="num absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white ring-2 ring-card">{unseen}</span>
        )}
      </button>
      {open && (
        <div className="animate-fade fixed inset-x-3 top-16 z-50 rounded-xl border border-line bg-card shadow-float sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-96">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-extrabold">Needs attention</p>
            {unseen > 0 && (
              <button type="button" onClick={() => store.markSeen(alerts.map((a) => a.id))} className="text-xs font-bold text-brand hover:underline">
                Mark all as seen
              </button>
            )}
          </div>
          <ul className="max-h-[60dvh] overflow-y-auto p-1.5">
            {alerts.length === 0 && <li className="px-3 py-8 text-center text-sm font-semibold text-muted">All clear — nothing waiting.</li>}
            {alerts.map((a) => {
              const fresh = !store.seen.includes(a.id)
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => {
                      store.markSeen([a.id])
                      setOpen(false)
                      router.push(a.href as Route)
                    }}
                    className="flex w-full gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-canvas"
                  >
                    <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', a.tone === 'danger' ? 'bg-danger' : a.tone === 'warning' ? 'bg-warning' : 'bg-brand', !fresh && 'opacity-30')} />
                    <span className="min-w-0 flex-1">
                      <span className={cn('block text-[13px] font-bold', !fresh && 'text-muted')}>{a.title}</span>
                      <span className="block truncate text-xs font-medium text-muted">{a.body}</span>
                    </span>
                    <span className="shrink-0 text-[11px] font-semibold text-faint">{ago(a.at)}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
