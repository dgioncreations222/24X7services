'use client'

import Link from 'next/link'
import type { Route } from 'next'
import { useMemo, useState } from 'react'
import {
  Activity as ActivityIcon,
  ArrowRight,
  BriefcaseBusiness,
  Clock3,
  IndianRupee,
  RadioTower,
  Siren,
  Star,
  UserRoundCheck,
  UserRoundCog,
  Users,
} from 'lucide-react'
import { BookingDrawer, AssignModal } from '@/components/BookingDrawer'
import { BarChart, Donut } from '@/components/charts'
import { ApplianceGlyph } from '@/components/glyphs'
import { Avatar, Button, Card, CardHeader, Chip, Page, PageHeader, PriorityTag, Rating, StatCard, StatusChip, buttonClass, tone, type Side } from '@/components/ui'
import { APPLIANCES, APPLIANCE_LABEL, BRAND_LABEL, inr } from '@/lib/catalog'
import { BRAND } from '@/lib/brand'
import { cn } from '@/lib/cn'
import { ago, compact, isToday, time, withinDays } from '@/lib/format'
import { BOOKING_STATUS, LIVE, PRESENCE } from '@/lib/status'
import { ADMIN, useStore, useTick } from '@/lib/store'
import type { Booking, BookingStatus } from '@/lib/types'

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`

function greeting(h: number) {
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export default function Dashboard() {
  const store = useStore()
  const now = useTick(60_000)
  const [open, setOpen] = useState<string | null>(null)
  const [assign, setAssign] = useState<Booking | null>(null)

  const m = useMemo(() => {
    const b = store.bookings
    const yesterday = (iso: string) => {
      const d = new Date(iso)
      const y = new Date(now - 86_400_000)
      return dayKey(d) === dayKey(y)
    }
    const today = b.filter((x) => isToday(x.scheduledAt))
    const yday = b.filter((x) => yesterday(x.scheduledAt))
    const revenue = (list: Booking[]) => list.filter((x) => x.status === 'completed').reduce((s, x) => s + x.amount, 0)
    const change = (a: number, z: number) => (z ? ((a - z) / z) * 100 : 0)
    const last30 = b.filter((x) => withinDays(x.scheduledAt, 30))
    const rated = last30.filter((x) => x.rating)

    const days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(now - (13 - i) * 86_400_000)
      const list = b.filter((x) => dayKey(new Date(x.scheduledAt)) === dayKey(d))
      return {
        label: i === 13 ? 'Today' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        value: list.length,
        detail: `${list.filter((x) => x.status === 'completed').length} completed · ${inr(revenue(list))}`,
      }
    })

    const pipeline: [string, BookingStatus[], string][] = [
      ['Awaiting payment', ['pending_payment'], 'neutral'],
      ['Unassigned', ['confirmed'], 'warning'],
      ['Assigned', ['assigned'], 'brand'],
      ['On the way', ['en_route'], 'info'],
      ['On site', ['arrived', 'in_progress'], 'violet'],
      ['Completed', ['completed'], 'success'],
      ['Cancelled', ['cancelled', 'refunded'], 'danger'],
    ]

    const verified = store.technicians.filter((t) => t.kyc === 'verified')
    const byTech = verified
      .map((t) => {
        const jobs = last30.filter((x) => x.technicianId === t.id && x.status === 'completed')
        return { t, jobs: jobs.length, revenue: revenue(jobs) }
      })
      .sort((a, z) => z.revenue - a.revenue)

    return {
      today,
      todayCount: today.length,
      todayChange: change(today.length, yday.length),
      revenueToday: revenue(today),
      revenueChange: change(revenue(today), revenue(yday)),
      live: b.filter((x) => LIVE.includes(x.status)),
      unassigned: b.filter((x) => x.status === 'confirmed').sort((x, y) => (x.priority === 'emergency' ? -1 : 0) - (y.priority === 'emergency' ? -1 : 0) || x.scheduledAt.localeCompare(y.scheduledAt)),
      emergencies: b.filter((x) => x.priority === 'emergency' && x.status === 'confirmed'),
      onShift: verified.filter((t) => t.presence !== 'offline'),
      verified,
      rating: rated.length ? rated.reduce((s, x) => s + x.rating!, 0) / rated.length : 0,
      ratedCount: rated.length,
      days,
      pipeline: pipeline.map(([label, st, t]) => ({ label, tone: t, count: today.filter((x) => st.includes(x.status)).length })),
      mix: APPLIANCES.map((a) => ({ label: APPLIANCE_LABEL[a], value: revenue(last30.filter((x) => x.appliance === a)) })).sort((x, y) => y.value - x.value),
      revenue30: revenue(last30),
      top: byTech.slice(0, 6),
      newCustomers: store.customers.filter((c) => withinDays(c.joinedAt, 30)).length,
      repeat: (() => {
        const counts = new Map<string, number>()
        for (const x of last30) counts.set(x.customerId, (counts.get(x.customerId) ?? 0) + 1)
        const all = [...counts.values()]
        return all.length ? Math.round((all.filter((n) => n > 1).length / all.length) * 100) : 0
      })(),
      customerTickets: store.tickets.filter((t) => t.side === 'customer' && t.status !== 'resolved').length,
      techTickets: store.tickets.filter((t) => t.side === 'technician' && t.status !== 'resolved').length,
      refunds30: b.filter((x) => x.status === 'refunded' && withinDays(x.scheduledAt, 30)).length,
      kyc: store.technicians.filter((t) => t.kyc === 'pending').length,
      payoutDue: store.payouts.filter((p) => p.status !== 'paid').reduce((s, p) => s + p.gross - p.commission, 0),
      cash: store.technicians.reduce((s, t) => s + t.cashInHand, 0),
    }
  }, [store.bookings, store.technicians, store.customers, store.tickets, store.payouts, now])

  const pipelineMax = Math.max(...m.pipeline.map((p) => p.count), 1)

  return (
    <Page>
      <PageHeader
        title={`${greeting(new Date(now).getHours())}, ${ADMIN.name.split(' ')[0]}`}
        sub={`Here’s the ${BRAND.name} network right now · ${new Date(now).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}`}
        actions={
          <>
            <Link href="/reports" className={buttonClass('secondary')}>
              Reports
            </Link>
            <Link href="/dispatch" className={buttonClass('primary')}>
              <RadioTower /> Live dispatch
            </Link>
          </>
        }
      />

      {m.emergencies.map((e) => (
        <div key={e.id} className="mb-5 rounded-card border border-danger/30 bg-card p-4 shadow-card ring-1 ring-danger/10 sm:flex sm:items-center sm:gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center sm:gap-4">
            <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-danger-soft text-danger sm:size-11">
              <span className="animate-pulse-ring absolute inset-0 rounded-full bg-danger/25" aria-hidden />
              <Siren className="relative size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold">
                Emergency waiting for a technician <span className="whitespace-nowrap font-semibold text-muted">· {ago(e.createdAt)}</span>
              </p>
              <p className="mt-0.5 line-clamp-2 text-[13px] font-medium text-ink-2 sm:truncate">
                {e.id} · {BRAND_LABEL[e.brand]} {APPLIANCE_LABEL[e.appliance]} — {e.issue} · {e.area}
              </p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-0 sm:flex">
            <Button variant="secondary" size="sm" onClick={() => setOpen(e.id)}>
              View
            </Button>
            <Button variant="danger" size="sm" onClick={() => setAssign(e)}>
              Assign nearest
            </Button>
          </div>
        </div>
      ))}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6 xl:gap-4" aria-label="Today at a glance">
        <StatCard label="Bookings today" value={m.todayCount} icon={<BriefcaseBusiness />} delta={{ value: m.todayChange, label: 'vs yesterday' }} href="/bookings" />
        <StatCard label="Revenue today" value={inr(m.revenueToday)} icon={<IndianRupee />} toneName="success" delta={{ value: m.revenueChange, label: 'vs yesterday' }} href="/payments" />
        <StatCard label="Live jobs" value={m.live.length} icon={<ActivityIcon />} toneName="violet" hint={<span>{m.live.filter((x) => x.status === 'en_route').length} on the way</span>} href="/dispatch" />
        <StatCard
          label="Unassigned"
          value={m.unassigned.length}
          icon={<Clock3 />}
          toneName={m.emergencies.length ? 'danger' : 'warning'}
          hint={<span className={m.emergencies.length ? 'font-bold text-danger' : ''}>{m.emergencies.length} emergency</span>}
          href="/bookings"
        />
        <StatCard
          label="Technicians on shift"
          value={
            <>
              {m.onShift.length}
              <span className="text-base font-bold text-faint">/{m.verified.length}</span>
            </>
          }
          icon={<UserRoundCheck />}
          toneName="info"
          hint={<span>{m.onShift.filter((t) => t.presence === 'on_job').length} on a job</span>}
          href="/technicians"
        />
        <StatCard label="Avg. rating · 30 days" value={m.rating.toFixed(2)} icon={<Star />} toneName="warning" hint={<span>{m.ratedCount} ratings</span>} href="/reviews" />
      </section>

      <div className="mt-5 grid gap-5 [&>*]:min-w-0 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Bookings · last 14 days" sub="By service date. Hover a bar for completions and revenue." action={<span className="num text-sm font-bold text-muted">{m.days.reduce((s, d) => s + d.value, 0)} total</span>} />
          <div className="px-4 pb-4 pt-5 sm:px-5">
            <BarChart data={m.days} name="Bookings per day, last 14 days" labelEvery={2} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Today’s pipeline" sub={`${m.todayCount} bookings scheduled today`} action={<Link href="/bookings" className="text-xs font-bold text-brand hover:underline">Open</Link>} />
          <ul className="space-y-3 px-5 py-4">
            {m.pipeline.map((p) => (
              <li key={p.label}>
                <div className="mb-1 flex items-center justify-between text-[13px]">
                  <span className="flex items-center gap-2 font-semibold text-ink-2">
                    <span className={cn('size-2 rounded-full', tone(p.tone as never).dot)} aria-hidden />
                    {p.label}
                  </span>
                  <span className="num font-bold">{p.count}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-canvas">
                  <div className={cn('h-full rounded-full', tone(p.tone as never).dot)} style={{ width: `${(p.count / pipelineMax) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 [&>*]:min-w-0 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Needs dispatch"
            sub="Paid bookings without a technician, emergencies first"
            action={
              <Link href="/bookings" className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline">
                All bookings <ArrowRight className="size-3.5" />
              </Link>
            }
          />
          {m.unassigned.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm font-semibold text-muted">Every paid booking has a technician.</p>
          ) : (
            <ul className="divide-y divide-line">
              {m.unassigned.slice(0, 6).map((b) => {
                const c = store.customer(b.customerId)
                return (
                  <li key={b.id} className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-canvas/60 sm:items-center sm:px-5">
                    <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', b.priority === 'emergency' ? 'bg-danger-soft text-danger' : 'bg-brand-soft text-brand')}>
                      <ApplianceGlyph appliance={b.appliance} />
                    </span>
                    <button type="button" onClick={() => setOpen(b.id)} className="min-w-0 flex-1 text-left">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-sm font-bold">
                          {BRAND_LABEL[b.brand]} {APPLIANCE_LABEL[b.appliance]}
                        </span>
                        <PriorityTag priority={b.priority} />
                      </span>
                      <span className="mt-0.5 block truncate text-xs font-medium text-muted">
                        {b.id} · {c?.name} · {b.area}
                      </span>
                      <span className="block truncate text-xs font-medium text-ink-2 sm:hidden">{b.issue}</span>
                      <span className="hidden truncate text-xs font-medium text-muted sm:block">{b.issue}</span>
                      <span className="num mt-1 block text-xs font-bold text-ink-2 sm:hidden">
                        {time(b.scheduledAt)} · <span className="font-semibold text-faint">{isToday(b.scheduledAt) ? ago(b.scheduledAt) : 'Tomorrow'}</span>
                      </span>
                    </button>
                    <span className="hidden shrink-0 text-right sm:block">
                      <span className="num block text-sm font-bold">{time(b.scheduledAt)}</span>
                      <span className="block text-[11px] font-semibold text-faint">{isToday(b.scheduledAt) ? ago(b.scheduledAt) : 'Tomorrow'}</span>
                    </span>
                    <Button size="sm" className="self-center" variant={b.priority === 'emergency' ? 'danger' : 'primary'} onClick={() => setAssign(b)}>
                      Assign
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Technicians on shift"
            sub={`${m.onShift.length} online · ${m.verified.length - m.onShift.length} offline`}
            action={<Link href="/technicians" className="text-xs font-bold text-brand hover:underline">View all</Link>}
          />
          <ul className="divide-y divide-line">
            {m.onShift.slice(0, 7).map((t) => {
              const job = store.bookings.find((x) => x.technicianId === t.id && LIVE.includes(x.status))
              return (
                <li key={t.id}>
                  <Link href={`/technicians/?id=${t.id}` as Route} className="flex items-center gap-3 px-5 py-2.5 hover:bg-canvas/60">
                    <span className="relative">
                      <Avatar name={t.name} size={34} side="technician" />
                      <span className={cn('absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card', t.presence === 'on_job' ? 'bg-violet' : 'bg-success')} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{t.name}</span>
                      <span className="block truncate text-xs font-medium text-muted">{job ? `${BOOKING_STATUS[job.status].label} · ${job.id}` : `Free · ${t.area}`}</span>
                    </span>
                    <Rating value={t.rating} className="text-xs" />
                  </Link>
                </li>
              )
            })}
          </ul>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 [&>*]:min-w-0 md:grid-cols-2 xl:grid-cols-3">
        <SideCard
          title="Customer side"
          side="customer"
          icon={<Users />}
          href="/customers"
          rows={[
            ['New customers · 30 days', String(m.newCustomers)],
            ['Repeat-booking rate', `${m.repeat}%`],
            ['Open customer tickets', String(m.customerTickets), m.customerTickets > 0],
            ['Refunds · 30 days', String(m.refunds30)],
            ['Active coupons', String(store.coupons.filter((c) => c.active).length)],
          ]}
        />
        <SideCard
          title="Technician side"
          side="technician"
          icon={<UserRoundCog />}
          href="/technicians"
          rows={[
            ['Applications to review', String(m.kyc), m.kyc > 0],
            ['Payouts due', inr(m.payoutDue)],
            ['Cash held by technicians', inr(m.cash), m.cash > 20000],
            ['Open technician tickets', String(m.techTickets), m.techTickets > 0],
            ['Suspended accounts', String(store.technicians.filter((t) => t.kyc === 'suspended').length)],
          ]}
        />
        <Card className="md:col-span-2 xl:col-span-1">
          <CardHeader title="Recent activity" sub="Across bookings, dispatch and payments" />
          <ol className="max-h-[300px] divide-y divide-line overflow-y-auto">
            {store.activity.slice(0, 12).map((a) => (
              <li key={a.id} className="flex gap-3 px-5 py-2.5">
                <span
                  className={cn(
                    'mt-1.5 size-1.5 shrink-0 rounded-full',
                    a.kind === 'payment' ? 'bg-success' : a.kind === 'dispatch' ? 'bg-brand' : a.kind === 'support' ? 'bg-warning' : a.kind === 'technician' ? 'bg-violet' : 'bg-faint'
                  )}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold text-ink-2">{a.text}</span>
                  <span className="block text-[11px] font-medium text-faint">
                    {a.actor} · {ago(a.at)}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 [&>*]:min-w-0 xl:grid-cols-3">
        <Card>
          <CardHeader title="Revenue by appliance" sub="Completed jobs · last 30 days" />
          <div className="p-5">
            <Donut slices={m.mix} center={`₹${compact(m.revenue30)}`} centerLabel="30-day revenue" format={inr} />
          </div>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader title="Top technicians · 30 days" sub="By revenue from completed jobs" action={<Link href="/reports" className="text-xs font-bold text-brand hover:underline">Full report</Link>} />
          {/* Phone: one compact row per technician instead of a sideways-scrolling table. */}
          <ul className="divide-y divide-line sm:hidden">
            {m.top.map(({ t, jobs, revenue }, i) => (
              <li key={t.id}>
                <Link href={`/technicians/?id=${t.id}` as Route} className="flex items-center gap-3 px-4 py-3 hover:bg-canvas/60">
                  <span className="num w-4 shrink-0 text-xs font-bold text-faint">{i + 1}</span>
                  <span className="relative shrink-0">
                    <Avatar name={t.name} size={36} side="technician" />
                    <span
                      className={cn('absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card', t.presence === 'online' ? 'bg-success' : t.presence === 'on_job' ? 'bg-violet' : 'bg-faint')}
                      aria-label={PRESENCE[t.presence].label}
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{t.name}</span>
                    <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
                      <span className="truncate">{t.area}</span>
                      <span aria-hidden>·</span>
                      <Rating value={t.rating} className="text-xs" />
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="num block text-sm font-extrabold">{inr(revenue)}</span>
                    <span className="num block text-[11px] font-semibold text-faint">{jobs} jobs</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="text-[11px] font-bold uppercase tracking-[0.06em] text-faint">
                  <th className="px-5 py-2.5">Technician</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">Jobs</th>
                  <th className="px-4 py-2.5 text-right">Rating</th>
                  <th className="px-5 py-2.5 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {m.top.map(({ t, jobs, revenue }, i) => (
                  <tr key={t.id} className="border-t border-line hover:bg-canvas/60">
                    <td className="px-5 py-2.5">
                      <Link href={`/technicians/?id=${t.id}` as Route} className="flex items-center gap-3">
                        <span className="num w-4 text-xs font-bold text-faint">{i + 1}</span>
                        <Avatar name={t.name} size={30} side="technician" />
                        <span>
                          <span className="block font-bold hover:text-brand">{t.name}</span>
                          <span className="block text-xs font-medium text-muted">{t.area}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <Chip tone={PRESENCE[t.presence].tone}>{PRESENCE[t.presence].label}</Chip>
                    </td>
                    <td className="num px-4 py-2.5 text-right font-bold">{jobs}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Rating value={t.rating} />
                    </td>
                    <td className="num px-5 py-2.5 text-right font-extrabold">{inr(revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <section className="mt-5">
        <Card>
          <CardHeader title="Live jobs" sub="Technicians on the road or on site right now" action={<Link href="/dispatch" className="text-xs font-bold text-brand hover:underline">Open map</Link>} />
          <ul className="grid divide-y divide-line md:grid-cols-2 md:divide-y-0">
            {m.live.map((b) => {
              const t = store.technician(b.technicianId)
              return (
                <li key={b.id} className="md:border-b md:border-line md:odd:border-r">
                  <button type="button" onClick={() => setOpen(b.id)} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-canvas/60">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-violet-soft text-violet">
                      <ApplianceGlyph appliance={b.appliance} className="size-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">
                        {b.id} · {BRAND_LABEL[b.brand]} {APPLIANCE_LABEL[b.appliance]}
                      </span>
                      <span className="block truncate text-xs font-medium text-muted">
                        {t?.name} · {b.area}
                      </span>
                    </span>
                    <StatusChip status={b.status} />
                  </button>
                </li>
              )
            })}
          </ul>
        </Card>
      </section>

      <BookingDrawer id={open} onClose={() => setOpen(null)} />
      <AssignModal booking={assign} onClose={() => setAssign(null)} />
    </Page>
  )
}

function SideCard({ title, icon, href, rows, side }: { title: string; icon: React.ReactNode; href: string; rows: [string, string, boolean?][]; side: Side }) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <h2 className="flex items-center gap-2.5 text-[15px] font-extrabold tracking-tight">
          <span className={cn('grid size-8 place-items-center rounded-lg [&_svg]:size-4', side === 'customer' ? 'bg-cust-soft text-cust' : 'bg-tech-soft text-tech')}>{icon}</span>
          {title}
        </h2>
        <Link href={href as never} className="text-xs font-bold text-brand hover:underline">
          Manage
        </Link>
      </div>
      <dl className="divide-y divide-line">
        {rows.map(([k, v, alert]) => (
          <div key={k} className="flex items-center justify-between gap-3 px-5 py-2.5 text-[13px]">
            <dt className="font-semibold text-muted">{k}</dt>
            <dd className={cn('num font-extrabold', alert && 'text-warning')}>{v}</dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}
