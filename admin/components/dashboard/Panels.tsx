'use client'

import Link from 'next/link'
import type { Route } from 'next'
import { ChevronRight, CircleCheck } from 'lucide-react'
import { BOOKING_STATUS, slot } from '@/components/bookings/status'
import { BarChart, HBars } from '@/components/charts'
import { Avatar, Card, CardHeader, Chip, Rating } from '@/components/ui'
import type { DashboardData } from '@/lib/data'
import { cn } from '@/lib/cn'

const rupees = (p: number) => '₹' + Math.round(p / 100).toLocaleString('en-IN')
const more = (href: Route, label: string) => (
  <Link href={href} className="text-xs font-bold text-brand hover:underline">
    {label}
  </Link>
)

export function BookingsChart({ d }: { d: DashboardData }) {
  return (
    <Card>
      <CardHeader title="Bookings · last 14 days" sub="By service date. Hover a bar for revenue." action={<span className="num text-sm font-bold text-muted">{d.days.reduce((s, x) => s + x.bookings, 0)} total</span>} />
      <div className="p-5">
        <BarChart name="Bookings per day" labelEvery={2} data={d.days.map((x) => ({ label: x.label, value: x.bookings, detail: `${rupees(x.revenue)} revenue` }))} />
      </div>
    </Card>
  )
}

/** What needs a person now, worst first. */
export function NeedsAttention({ d }: { d: DashboardData }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader title="Needs attention" sub={d.attention.length ? `${d.attention.length} waiting on someone` : 'Nothing waiting'} />
      {d.attention.length === 0 ? (
        <p className="flex items-center gap-2 px-5 py-6 text-sm font-semibold text-success">
          <CircleCheck className="size-4" /> All clear.
        </p>
      ) : (
        <ul className="max-h-[340px] divide-y divide-line overflow-y-auto">
          {d.attention.map((a) => (
            <li key={a.id}>
              <Link href={a.href as Route} className="flex items-center gap-3 px-5 py-3 hover:bg-canvas/60">
                <span className={cn('size-2 shrink-0 rounded-full', a.tone === 'danger' ? 'bg-danger' : 'bg-warning')} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-bold">{a.title}</span>
                  <span className="block truncate text-xs text-muted">{a.body}</span>
                </span>
                <ChevronRight className="size-4 text-faint" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

export function RevenueByCategory({ d }: { d: DashboardData }) {
  return (
    <Card>
      <CardHeader title="Revenue by category" sub="Completed jobs · last 30 days" />
      <div className="p-5">
        <HBars format={rupees} rows={d.byCategory.map((c) => ({ key: c.id, label: c.name, value: c.revenue, note: `${c.jobs} jobs` }))} />
      </div>
    </Card>
  )
}

export function TopTechnicians({ d }: { d: DashboardData }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader title="Top technicians · 30 days" sub="By revenue from completed jobs" action={more('/technicians', 'All technicians')} />
      <ul className="divide-y divide-line">
        {d.topTechs.map((t, i) => (
          <li key={t.id}>
            <Link href={`/technicians?id=${t.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-canvas/60">
              <span className="num w-4 text-sm font-bold text-faint">{i + 1}</span>
              <Avatar name={t.name} size={32} side="technician" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{t.name}</span>
                <span className="block text-xs text-muted">{t.jobs} jobs</span>
              </span>
              <Rating value={t.rating} />
              <span className="num w-20 text-right text-sm font-extrabold">{rupees(t.revenue)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  )
}

export function Upcoming({ d }: { d: DashboardData }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader title="Coming up" sub="Next jobs not started yet" action={more('/bookings', 'All bookings')} />
      {d.upcoming.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">Nothing scheduled.</p>
      ) : (
        <ul className="divide-y divide-line">
          {d.upcoming.map((b) => (
            <li key={b.id}>
              <Link href={`/bookings?id=${b.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-canvas/60">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">
                    <span className="num">{b.displayId}</span> · {b.serviceName}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {slot(b.slotStart)} · {b.area}
                  </span>
                </span>
                <Chip tone={BOOKING_STATUS[b.status].tone}>{BOOKING_STATUS[b.status].label}</Chip>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
