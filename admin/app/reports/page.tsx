'use client'

import { useState } from 'react'
import { Ban, BriefcaseBusiness, CircleCheck, Download, IndianRupee, Percent, ReceiptIndianRupee } from 'lucide-react'
import { BarChart } from '@/components/charts'
import { fromDay, toDay } from '@/components/growth/CouponModal'
import { Async, Button, Card, CardHeader, Field, Page, PageHeader, Segmented, StatCard, TableWrap, inputClass, td, th, tr } from '@/components/ui'
import { useCan, useReport, type Report, type ReportRow } from '@/lib/data'
import { rupees } from '@/lib/money'
import { cn } from '@/lib/cn'
import { downloadCsv } from '@/lib/format'

const DAY = 86_400_000
type Preset = '7' | '30' | '90' | 'custom'

/** Bookings and money over any date range, with every table downloadable as CSV. */
export default function ReportsPage() {
  const [today] = useState(() => new Date(new Date().setHours(0, 0, 0, 0)).getTime())
  const [preset, setPreset] = useState<Preset>('30')
  const [custom, setCustom] = useState({ from: toDay(today - 29 * DAY), to: toDay(today) })
  const range = preset === 'custom' ? { from: fromDay(custom.from), to: fromDay(custom.to) + DAY } : { from: today - (Number(preset) - 1) * DAY, to: today + DAY }
  const bad = !(range.to > range.from)
  const report = useReport(range.from, bad ? range.from + DAY : range.to)
  return (
    <Page>
      <PageHeader title="Reports" sub="By service date. Revenue counts completed jobs; commission is today’s rate from Settings." />
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <Segmented
          value={preset}
          onChange={setPreset}
          options={[
            { value: '7', label: '7 days' },
            { value: '30', label: '30 days' },
            { value: '90', label: '90 days' },
            { value: 'custom', label: 'Custom' },
          ]}
        />
        {preset === 'custom' && (
          <>
            <Field label="From">
              <input type="date" value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} className={cn(inputClass, 'h-9')} />
            </Field>
            <Field label="To">
              <input type="date" value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} className={cn(inputClass, 'h-9')} />
            </Field>
            {bad && <p className="pb-2 text-sm font-semibold text-danger">The end date must be on or after the start.</p>}
          </>
        )}
      </div>
      <Async query={report}>{(r) => <Body r={r} />}</Async>
    </Page>
  )
}

function Body({ r }: { r: Report }) {
  const t = r.totals
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <StatCard label="Bookings" value={t.bookings.toLocaleString('en-IN')} icon={<BriefcaseBusiness />} />
        <StatCard label="Completed" value={t.completed.toLocaleString('en-IN')} icon={<CircleCheck />} toneName="success" />
        <StatCard label="Cancelled" value={`${t.cancelRate}%`} icon={<Ban />} toneName={t.cancelRate > 15 ? 'danger' : 'neutral'} hint={`${t.cancelled} bookings`} />
        <StatCard label="Revenue" value={rupees(t.revenue)} icon={<IndianRupee />} toneName="success" hint={`avg ${rupees(t.avgTicket)} a job`} />
        <StatCard label="Commission" value={rupees(t.commission)} icon={<Percent />} toneName="brand" />
        <StatCard label="Refunded" value={rupees(t.refunds)} icon={<ReceiptIndianRupee />} toneName="warning" />
      </div>
      <Card>
        <CardHeader title="Revenue per day" sub="Completed jobs" action={<CsvButton name="revenue-by-day" rows={r.byDay} first="Day" />} />
        <div className="p-5">
          <BarChart
            name="Revenue per day"
            format={(n) => '₹' + Math.round(n).toLocaleString('en-IN')}
            labelEvery={Math.ceil(r.byDay.length / 10)}
            data={r.byDay.map((d) => ({ label: d.label, value: d.revenue / 100, detail: `${d.completed} jobs` }))}
          />
        </div>
      </Card>
      <div className="grid gap-5 lg:grid-cols-2">
        <RowsCard title="By category" name="by-category" first="Category" rows={r.byCategory} />
        <RowsCard title="By area" name="by-area" first="Area" rows={r.byArea} />
      </div>
      <Card className="overflow-hidden">
        <CardHeader
          title="Technicians"
          sub="Jobs and revenue in the range; rates over their last 30 days"
          action={
            <CsvButton
              name="technicians"
              rows={r.technicians}
              first="Technician"
              extra={{ head: ['Rating', 'On-time %', 'Acceptance %'], cells: (x) => [x.rating, x.onTimeRate, x.acceptanceRate] }}
            />
          }
        />
        <TableWrap>
          <thead>
            <tr>
              <th className={th}>Technician</th>
              <th className={cn(th, 'text-right')}>Jobs</th>
              <th className={cn(th, 'text-right')}>Revenue</th>
              <th className={cn(th, 'text-right')}>Rating</th>
              <th className={cn(th, 'text-right')}>On time</th>
              <th className={cn(th, 'text-right')}>Accepted</th>
            </tr>
          </thead>
          <tbody>
            {r.technicians.map((x) => (
              <tr key={x.key} className={tr}>
                <td className={cn(td, 'font-bold')}>{x.label}</td>
                <td className={cn(td, 'num text-right')}>{x.completed}</td>
                <td className={cn(td, 'num text-right font-bold')}>{rupees(x.revenue)}</td>
                <td className={cn(td, 'num text-right')}>{x.rating.toFixed(2)}</td>
                <td className={cn(td, 'num text-right', x.onTimeRate < 90 && 'text-warning')}>{x.onTimeRate}%</td>
                <td className={cn(td, 'num text-right', x.acceptanceRate < 80 && 'text-warning')}>{x.acceptanceRate}%</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </Card>
    </div>
  )
}

function RowsCard({ title, name, first, rows }: { title: string; name: string; first: string; rows: ReportRow[] }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader title={title} action={<CsvButton name={name} rows={rows} first={first} />} />
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className={th}>{first}</th>
            <th className={cn(th, 'text-right')}>Bookings</th>
            <th className={cn(th, 'text-right')}>Cancelled</th>
            <th className={cn(th, 'text-right')}>Revenue</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((x) => (
            <tr key={x.key} className={tr}>
              <td className={cn(td, 'font-semibold')}>{x.label}</td>
              <td className={cn(td, 'num text-right')}>{x.bookings}</td>
              <td className={cn(td, 'num text-right text-muted')}>{x.cancelled}</td>
              <td className={cn(td, 'num text-right font-bold')}>{rupees(x.revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

function CsvButton<R extends ReportRow>({ name, rows, first, extra }: { name: string; rows: R[]; first: string; extra?: { head: string[]; cells: (r: R) => (string | number)[] } }) {
  const can = useCan()
  if (!can('reports', 'export')) return null
  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={() =>
        downloadCsv(name, [
          [first, 'Bookings', 'Completed', 'Cancelled', 'Revenue (₹)', ...(extra?.head ?? [])],
          ...rows.map((r) => [r.label, r.bookings, r.completed, r.cancelled, r.revenue / 100, ...(extra?.cells(r) ?? [])]),
        ])
      }
    >
      <Download /> CSV
    </Button>
  )
}
