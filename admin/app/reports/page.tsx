'use client'

import Link from 'next/link'
import type { Route } from 'next'
import { useMemo, useState } from 'react'
import { BadgeCheck, Ban, Download, ReceiptIndianRupee, TrendingUp } from 'lucide-react'
import { BarChart, HBars } from '@/components/charts'
import { Avatar, Button, Card, CardHeader, Page, PageHeader, Rating, Segmented, StatCard, TableWrap, td, th, tr } from '@/components/ui'
import { APPLIANCES, APPLIANCE_LABEL, BRANDS, BRAND_LABEL, inr } from '@/lib/catalog'
import { compact, downloadCsv, withinDays } from '@/lib/format'
import { useStore, useTick } from '@/lib/store'
import type { Booking } from '@/lib/types'

type Range = '7' | '30'

const done = (l: Booking[]) => l.filter((b) => b.status === 'completed')
const revenue = (l: Booking[]) => done(l).reduce((s, b) => s + b.amount, 0)

/** The month (or week) in numbers, every card exportable. */
export default function Reports() {
  const store = useStore()
  const now = useTick(60_000)
  const [range, setRange] = useState<Range>('30')
  const days = Number(range)

  const r = useMemo(() => {
    // Only what has been scheduled up to today counts.
    const list = store.bookings.filter((b) => withinDays(b.scheduledAt, days))
    const closed = list.filter((b) => ['completed', 'cancelled', 'refunded'].includes(b.status))
    const cancelled = list.filter((b) => b.status === 'cancelled' || b.status === 'refunded')
    const completed = done(list)

    const perDay = Array.from({ length: days }, (_, i) => {
      const d = new Date(now)
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - (days - 1 - i))
      const key = d.toDateString()
      const l = list.filter((b) => new Date(b.scheduledAt).toDateString() === key)
      return {
        label: i === days - 1 ? 'Today' : d.toLocaleDateString('en-IN', days === 7 ? { weekday: 'short' } : { day: 'numeric', month: 'short' }),
        value: revenue(l),
        detail: `${done(l).length} jobs completed`,
      }
    })

    const byAppliance = APPLIANCES.map((a) => ({ key: APPLIANCE_LABEL[a], label: APPLIANCE_LABEL[a], value: list.filter((b) => b.appliance === a).length, rev: revenue(list.filter((b) => b.appliance === a)) })).sort((x, y) => y.value - x.value)
    const byBrand = BRANDS.map((b) => ({ key: BRAND_LABEL[b], label: BRAND_LABEL[b], value: list.filter((x) => x.brand === b).length, rev: revenue(list.filter((x) => x.brand === b)) })).sort((x, y) => y.value - x.value)
    const areas = new Map<string, Booking[]>()
    for (const b of list) areas.set(b.area, [...(areas.get(b.area) ?? []), b])
    const byArea = [...areas.entries()].map(([k, l]) => ({ key: k, label: k, value: revenue(l), count: l.length })).sort((x, y) => y.value - x.value)

    const techs = store.technicians
      .filter((t) => t.kyc === 'verified')
      .map((t) => {
        const mine = list.filter((b) => b.technicianId === t.id)
        const jobs = done(mine)
        const rated = jobs.filter((b) => b.rating)
        return {
          t,
          jobs: jobs.length,
          revenue: revenue(mine),
          cancelled: mine.filter((b) => b.status === 'cancelled' || b.status === 'refunded').length,
          rating: rated.length ? rated.reduce((s, b) => s + b.rating!, 0) / rated.length : 0,
        }
      })
      .sort((a, z) => z.revenue - a.revenue)

    return {
      list,
      revenue: revenue(list),
      perDay,
      completion: closed.length ? (completed.length / closed.length) * 100 : 0,
      cancelRate: closed.length ? (cancelled.length / closed.length) * 100 : 0,
      avgTicket: completed.length ? revenue(list) / completed.length : 0,
      completed: completed.length,
      cancelled: cancelled.length,
      byAppliance,
      byBrand,
      byArea,
      techs,
    }
  }, [store.bookings, store.technicians, days, now])

  const tag = `${range}d`
  const label = range === '7' ? 'last 7 days' : 'last 30 days'

  return (
    <Page>
      <PageHeader
        title="Reports"
        sub={`Network performance · ${label}`}
        actions={
          <Segmented
            value={range}
            onChange={setRange}
            options={[
              { value: '7', label: '7 days' },
              { value: '30', label: '30 days' },
            ]}
          />
        }
      />

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4">
        <StatCard label="Revenue" value={`₹${compact(r.revenue)}`} icon={<TrendingUp />} toneName="success" hint={<span>{r.completed} completed jobs</span>} />
        <StatCard label="Avg. ticket size" value={inr(r.avgTicket)} icon={<ReceiptIndianRupee />} hint={<span>per completed job</span>} />
        <StatCard label="Completion rate" value={`${r.completion.toFixed(1)}%`} icon={<BadgeCheck />} toneName="info" hint={<span>of closed bookings</span>} />
        <StatCard label="Cancellation rate" value={`${r.cancelRate.toFixed(1)}%`} icon={<Ban />} toneName="danger" hint={<span>{r.cancelled} cancelled or refunded</span>} />
      </section>

      <Card className="mt-5">
        <CardHeader
          title="Revenue per day"
          sub="Completed jobs by service date"
          action={<ExportButton onClick={() => downloadCsv(`revenue-per-day-${tag}`, [['Day', 'Revenue'], ...r.perDay.map((d) => [d.label, d.value])])} />}
        />
        <div className="px-4 pb-4 pt-5 sm:px-5">
          <BarChart data={r.perDay} format={inr} labelEvery={range === '7' ? 1 : 5} name={`Revenue per day, ${label}`} />
        </div>
      </Card>

      <div className="mt-5 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader
            title="Bookings by appliance"
            sub={`${r.list.length} bookings`}
            action={<ExportButton onClick={() => downloadCsv(`bookings-by-appliance-${tag}`, [['Appliance', 'Bookings', 'Revenue'], ...r.byAppliance.map((x) => [x.label, x.value, x.rev])])} />}
          />
          <div className="p-5">
            <HBars rows={r.byAppliance.map((x) => ({ key: x.key, label: x.label, value: x.value, note: inr(x.rev) }))} />
          </div>
        </Card>
        <Card>
          <CardHeader
            title="Bookings by brand"
            sub="Samsung, LG, Bosch and IFB"
            action={<ExportButton onClick={() => downloadCsv(`bookings-by-brand-${tag}`, [['Brand', 'Bookings', 'Revenue'], ...r.byBrand.map((x) => [x.label, x.value, x.rev])])} />}
          />
          <div className="p-5">
            <HBars rows={r.byBrand.map((x) => ({ key: x.key, label: x.label, value: x.value, note: inr(x.rev) }))} />
          </div>
        </Card>
        <Card className="lg:col-span-2 xl:col-span-1">
          <CardHeader
            title="Top areas by revenue"
            sub="Top 10 service areas"
            action={<ExportButton onClick={() => downloadCsv(`revenue-by-area-${tag}`, [['Area', 'Bookings', 'Revenue'], ...r.byArea.map((x) => [x.label, x.count, x.value])])} />}
          />
          <div className="p-5">
            <HBars rows={r.byArea.slice(0, 10).map((x) => ({ key: x.key, label: x.label, value: x.value, note: `${x.count}` }))} format={inr} />
          </div>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader
          title="Technician performance"
          sub={`${r.techs.length} verified technicians · ${label}`}
          action={
            <ExportButton
              onClick={() =>
                downloadCsv(`technician-performance-${tag}`, [
                  ['Technician', 'ID', 'Area', 'Jobs', 'Revenue', 'Cancelled', 'Rating (period)', 'Rating (lifetime)', 'On-time %', 'Acceptance %'],
                  ...r.techs.map((x) => [x.t.name, x.t.id, x.t.area, x.jobs, x.revenue, x.cancelled, x.rating.toFixed(2), x.t.rating.toFixed(2), x.t.onTimeRate, x.t.acceptanceRate]),
                ])
              }
            />
          }
        />
        {/* Phone: one card per technician — the table would scroll sideways. */}
        <ul className="divide-y divide-line sm:hidden">
          {r.techs.map(({ t, jobs, revenue: rev, cancelled, rating }) => (
            <li key={t.id}>
              <Link href={`/technicians/?id=${t.id}` as Route} className="flex items-start gap-3 px-4 py-3">
                <Avatar name={t.name} size={36} side="technician" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">{t.name}</span>
                      <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
                        <span className="truncate">{t.area}</span> · <Rating value={rating || t.rating} className="text-xs" />
                      </span>
                    </span>
                    <span className="num shrink-0 text-sm font-extrabold">{inr(rev)}</span>
                  </span>
                  <span className="mt-2 grid grid-cols-4 gap-2 rounded-lg bg-canvas px-3 py-2 text-xs">
                    <span>
                      <span className="block text-[10.5px] font-bold uppercase tracking-wider text-faint">Jobs</span>
                      <span className="num font-bold">{jobs}</span>
                    </span>
                    <span>
                      <span className="block text-[10.5px] font-bold uppercase tracking-wider text-faint">Cancel</span>
                      <span className="num text-muted">{cancelled}</span>
                    </span>
                    <span>
                      <span className="block text-[10.5px] font-bold uppercase tracking-wider text-faint">On-time</span>
                      <span className="num font-semibold">{t.onTimeRate}%</span>
                    </span>
                    <span className="text-right">
                      <span className="block text-[10.5px] font-bold uppercase tracking-wider text-faint">Accept</span>
                      <span className="num font-semibold">{t.acceptanceRate}%</span>
                    </span>
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="hidden sm:block">
        <TableWrap>
          <thead>
            <tr>
              <th className={th}>Technician</th>
              <th className={`${th} text-right`}>Jobs</th>
              <th className={`${th} text-right`}>Revenue</th>
              <th className={`${th} text-right`}>Cancelled</th>
              <th className={`${th} text-right`}>Rating</th>
              <th className={th}>On-time</th>
              <th className={`${th} text-right`}>Acceptance</th>
            </tr>
          </thead>
          <tbody>
            {r.techs.map(({ t, jobs, revenue: rev, cancelled, rating }) => (
              <tr key={t.id} className={tr}>
                <td className={td}>
                  <Link href={`/technicians/?id=${t.id}` as Route} className="flex items-center gap-2.5">
                    <Avatar name={t.name} size={30} side="technician" />
                    <span>
                      <span className="block font-bold hover:text-brand">{t.name}</span>
                      <span className="block text-xs font-medium text-muted">{t.area}</span>
                    </span>
                  </Link>
                </td>
                <td className={`${td} num text-right font-bold`}>{jobs}</td>
                <td className={`${td} num text-right font-extrabold`}>{inr(rev)}</td>
                <td className={`${td} num text-right text-muted`}>{cancelled}</td>
                <td className={`${td} text-right`}>
                  <Rating value={rating || t.rating} />
                </td>
                <td className={td}>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-canvas">
                      <div className="h-full rounded-full bg-chart-1" style={{ width: `${t.onTimeRate}%` }} />
                    </div>
                    <span className="num text-xs font-bold">{t.onTimeRate}%</span>
                  </div>
                </td>
                <td className={`${td} num text-right font-semibold`}>{t.acceptanceRate}%</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
        </div>
      </Card>
    </Page>
  )
}

function ExportButton({ onClick }: { onClick: () => void }) {
  return (
    <Button size="xs" variant="secondary" onClick={onClick} aria-label="Export CSV">
      <Download /> CSV
    </Button>
  )
}
