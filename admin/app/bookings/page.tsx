'use client'

import type { Route } from 'next'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { BriefcaseBusiness, Download } from 'lucide-react'
import { BookingDrawer } from '@/components/bookings/BookingDrawer'
import { BOOKING_STATUS, PAYMENT_STATUS, rupees, slot } from '@/components/bookings/status'
import { SortTh } from '@/components/catalog/parts'
import { useTable } from '@/components/catalog/useTable'
import { Async, Button, Card, Chip, Empty, Page, PageHeader, Pager, SearchInput, Select, Tabs, TableWrap, td, th, tr } from '@/components/ui'
import { LIVE_STATUSES, bill, useBookings, useCategories, usePartners, type AdminBooking } from '@/lib/data'
import { cn } from '@/lib/cn'
import { downloadCsv } from '@/lib/format'

export default function BookingsPage() {
  return (
    <Suspense>
      <Bookings />
    </Suspense>
  )
}

/** Every booking, filterable down to the one a customer is calling about. */
function Bookings() {
  const router = useRouter()
  const params = useSearchParams()
  const bookings = useBookings()
  const open = (id: string | null) => router.replace((id ? `/bookings?id=${id}` : '/bookings') as Route, { scroll: false })
  return (
    <Page>
      <PageHeader
        title="Bookings"
        sub="Find any booking, see where it stands, and assign, cancel or refund it."
        actions={
          bookings.data && (
            <Button variant="secondary" onClick={() => exportCsv(bookings.data!)}>
              <Download /> Export CSV
            </Button>
          )
        }
      />
      <Card className="overflow-hidden">
        <Async query={bookings} empty={<Empty icon={<BriefcaseBusiness />} title="No bookings yet" />}>
          {(rows) => <BookingTable rows={rows} onOpen={open} />}
        </Async>
      </Card>
      <BookingDrawer id={params.get('id')} onClose={() => open(null)} />
    </Page>
  )
}

const DAY = 86_400_000
const startOfToday = () => new Date(new Date().setHours(0, 0, 0, 0)).getTime()
const RANGES = {
  all: { label: 'Any date', test: () => true },
  today: { label: 'Today', test: (t: number) => t >= startOfToday() && t < startOfToday() + DAY },
  tomorrow: { label: 'Tomorrow', test: (t: number) => t >= startOfToday() + DAY && t < startOfToday() + 2 * DAY },
  week: { label: 'Last 7 days', test: (t: number) => t >= startOfToday() - 6 * DAY && t < startOfToday() + DAY },
  month: { label: 'Last 30 days', test: (t: number) => t >= startOfToday() - 29 * DAY && t < startOfToday() + DAY },
} as const
type Range = keyof typeof RANGES

function BookingTable({ rows: all, onOpen }: { rows: AdminBooking[]; onOpen: (id: string) => void }) {
  const categories = useCategories()
  const partners = usePartners()
  const [category, setCategory] = useState('all')
  const [range, setRange] = useState<Range>('all')
  const [priority, setPriority] = useState<'all' | 'emergency' | 'normal'>('all')
  const techName = (id?: string) => (id ? partners.data?.find((p) => p.id === id)?.name : undefined)
  const rows = all.filter((b) => (category === 'all' || b.categoryId === category) && RANGES[range].test(b.slotStart) && (priority === 'all' || b.priority === priority))
  const t = useTable({
    rows,
    search: (b) => [b.id, b.displayId, b.customer.name, b.customer.phone.replace(/\s/g, ''), b.area, b.pincode, b.serviceName, b.brand, techName(b.technicianId)],
    filters: {
      all: () => true,
      unassigned: (b: AdminBooking) => b.status === 'confirmed',
      live: (b: AdminBooking) => LIVE_STATUSES.includes(b.status),
      payment: (b: AdminBooking) => b.status === 'pending_payment' || b.status === 'failed',
      completed: (b: AdminBooking) => b.status === 'completed',
      cancelled: (b: AdminBooking) => b.status === 'cancelled' || b.status === 'refunded',
    },
    sorts: { slot: (b: AdminBooking) => -b.slotStart, created: (b: AdminBooking) => -b.createdAt, amount: (b: AdminBooking) => -bill(b).total },
    initialSort: 'slot',
    pageSize: 20,
  })
  const n = (f: (b: AdminBooking) => boolean) => rows.filter(f).length
  return (
    <>
      <div className="flex flex-col gap-3 border-b border-line p-4">
        <Tabs
          value={t.filter}
          onChange={t.setFilter}
          options={[
            { value: 'all', label: 'All', count: rows.length },
            { value: 'unassigned', label: 'Unassigned', count: n((b) => b.status === 'confirmed'), alert: true },
            { value: 'live', label: 'Live', count: n((b) => LIVE_STATUSES.includes(b.status)) },
            { value: 'payment', label: 'Awaiting payment', count: n((b) => b.status === 'pending_payment' || b.status === 'failed') },
            { value: 'completed', label: 'Completed', count: n((b) => b.status === 'completed') },
            { value: 'cancelled', label: 'Cancelled', count: n((b) => b.status === 'cancelled' || b.status === 'refunded') },
          ]}
          className="border-b-0"
        />
        <div className="flex flex-col gap-2 lg:flex-row">
          <SearchInput value={t.q} onChange={t.setQ} placeholder="Booking ID, customer, phone, area or technician" className="flex-1" />
          <div className="flex flex-wrap gap-2">
            <Select label="Category" value={category} onChange={setCategory} options={[{ value: 'all', label: 'All categories' }, ...(categories.data ?? []).map((c) => ({ value: c.id, label: c.name }))]} />
            <Select label="Date" value={range} onChange={setRange} options={(Object.keys(RANGES) as Range[]).map((k) => ({ value: k, label: RANGES[k].label }))} />
            <Select
              label="Priority"
              value={priority}
              onChange={setPriority}
              options={[
                { value: 'all', label: 'Any priority' },
                { value: 'emergency', label: 'Emergency' },
                { value: 'normal', label: 'Normal' },
              ]}
            />
          </div>
        </div>
      </div>
      {t.total === 0 ? (
        <Empty icon={<BriefcaseBusiness />} title="No bookings match" body="Try another search, tab or filter." />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <th className={th}>Booking</th>
              <SortTh by="slot" label="Slot" sort={t.sort} onSort={t.sortBy} />
              <th className={th}>Customer · area</th>
              <th className={th}>Technician</th>
              <SortTh by="amount" label="Amount" sort={t.sort} onSort={t.sortBy} />
              <th className={th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {t.visible.map((b) => {
              const s = BOOKING_STATUS[b.status]
              return (
                <tr key={b.id} className={cn(tr, 'cursor-pointer')} onClick={() => onOpen(b.id)}>
                  <td className={td}>
                    <button type="button" className="text-left" onClick={() => onOpen(b.id)}>
                      <span className="num block font-bold">{b.displayId}</span>
                      <span className="block text-xs text-muted">
                        {b.serviceName}
                        {b.priority === 'emergency' && <span className="font-bold text-danger"> · Emergency</span>}
                      </span>
                    </button>
                  </td>
                  <td className={cn(td, 'text-[13px]')}>{slot(b.slotStart)}</td>
                  <td className={td}>
                    <span className="block font-semibold">{b.customer.name}</span>
                    <span className="block text-xs text-muted">{b.area}</span>
                  </td>
                  <td className={cn(td, 'text-[13px]')}>{techName(b.technicianId) ?? (b.dispatch.noTechFound ? <span className="font-bold text-danger">None found</span> : <span className="text-faint">—</span>)}</td>
                  <td className={td}>
                    <span className="num block font-bold">{rupees(bill(b).total)}</span>
                    <span className="block text-[11px] text-muted">{PAYMENT_STATUS[b.payment.status].label}</span>
                  </td>
                  <td className={td}>
                    <Chip tone={s.tone}>{s.label}</Chip>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </TableWrap>
      )}
      <Pager page={t.page} pages={t.pages} total={t.total} onPage={t.setPage} />
    </>
  )
}

function exportCsv(rows: AdminBooking[]) {
  downloadCsv('bookings', [
    ['Booking', 'Service', 'Slot', 'Customer', 'Phone', 'Area', 'Pincode', 'Priority', 'Status', 'Total (₹)', 'Payment', 'Technician ID'],
    ...rows.map((b) => [
      b.displayId,
      b.serviceName,
      new Date(b.slotStart).toISOString(),
      b.customer.name,
      b.customer.phone,
      b.area,
      b.pincode,
      b.priority,
      BOOKING_STATUS[b.status].label,
      bill(b).total / 100,
      PAYMENT_STATUS[b.payment.status].label,
      b.technicianId ?? '',
    ]),
  ])
}
