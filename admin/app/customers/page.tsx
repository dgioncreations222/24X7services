'use client'

import type { Route } from 'next'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { Download, Users } from 'lucide-react'
import { rupees } from '@/components/bookings/status'
import { SortTh } from '@/components/catalog/parts'
import { useTable } from '@/components/catalog/useTable'
import { CustomerDrawer } from '@/components/customers/CustomerDrawer'
import { Async, Avatar, Button, Card, Chip, Empty, Page, PageHeader, Pager, SearchInput, Tabs, TableWrap, td, th, tr } from '@/components/ui'
import { useCustomers, type CustomerRow } from '@/lib/data'
import { cn } from '@/lib/cn'
import { downloadCsv, longDate } from '@/lib/format'

export default function CustomersPage() {
  return (
    <Suspense>
      <Customers />
    </Suspense>
  )
}

/** Everyone who has booked: how much, how often, and who is blocked. */
function Customers() {
  const router = useRouter()
  const params = useSearchParams()
  const customers = useCustomers()
  const open = (id: string | null) => router.replace((id ? `/customers?id=${id}` : '/customers') as Route, { scroll: false })
  return (
    <Page>
      <PageHeader
        side="customer"
        title="Customers"
        sub={customers.data ? `${customers.data.length} customers · ${customers.data.filter((c) => c.status === 'blocked').length} blocked` : 'Loading…'}
        actions={
          customers.data && (
            <Button variant="secondary" onClick={() => exportCsv(customers.data!)}>
              <Download /> Export CSV
            </Button>
          )
        }
      />
      <Card className="overflow-hidden">
        <Async query={customers} empty={<Empty icon={<Users />} title="No customers yet" />}>
          {(rows) => <CustomerTable rows={rows} onOpen={open} />}
        </Async>
      </Card>
      <CustomerDrawer id={params.get('id')} onClose={() => open(null)} />
    </Page>
  )
}

function CustomerTable({ rows, onOpen }: { rows: CustomerRow[]; onOpen: (id: string) => void }) {
  const t = useTable({
    rows,
    search: (c) => [c.id, c.name, c.phone.replace(/\s/g, ''), c.email, c.area],
    filters: { all: () => true, active: (c: CustomerRow) => c.status === 'active', blocked: (c: CustomerRow) => c.status === 'blocked' },
    sorts: {
      name: (c: CustomerRow) => c.name,
      bookings: (c: CustomerRow) => -c.bookings,
      spent: (c: CustomerRow) => -c.spent,
      last: (c: CustomerRow) => -(c.lastBookingAt ?? 0),
      joined: (c: CustomerRow) => -c.joinedAt,
    },
    initialSort: 'last',
    pageSize: 20,
  })
  return (
    <>
      <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={t.filter}
          onChange={t.setFilter}
          options={[
            { value: 'all', label: 'All', count: rows.length },
            { value: 'active', label: 'Active', count: rows.filter((c) => c.status === 'active').length },
            { value: 'blocked', label: 'Blocked', count: rows.filter((c) => c.status === 'blocked').length },
          ]}
          className="border-b-0"
        />
        <SearchInput value={t.q} onChange={t.setQ} placeholder="Name, phone, email or area" className="sm:w-80" />
      </div>
      {t.total === 0 ? (
        <Empty icon={<Users />} title="Nobody matches" body="Try another search or tab." />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <SortTh by="name" label="Customer" sort={t.sort} onSort={t.sortBy} />
              <th className={th}>Area</th>
              <SortTh by="bookings" label="Bookings" sort={t.sort} onSort={t.sortBy} />
              <SortTh by="spent" label="Spent" sort={t.sort} onSort={t.sortBy} />
              <SortTh by="last" label="Last booking" sort={t.sort} onSort={t.sortBy} />
              <SortTh by="joined" label="Joined" sort={t.sort} onSort={t.sortBy} />
              <th className={th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {t.visible.map((c) => (
              <tr key={c.id} className={cn(tr, 'cursor-pointer')} onClick={() => onOpen(c.id)}>
                <td className={td}>
                  <button type="button" className="flex items-center gap-3 text-left" onClick={() => onOpen(c.id)}>
                    <Avatar name={c.name} size={34} side="customer" />
                    <span>
                      <span className="block font-bold">{c.name}</span>
                      <span className="num block text-xs text-muted">{c.phone}</span>
                    </span>
                  </button>
                </td>
                <td className={cn(td, 'text-[13px]')}>{c.area}</td>
                <td className={cn(td, 'num font-semibold')}>
                  {c.bookings}
                  {c.cancelled > 0 && <span className="text-xs font-medium text-muted"> · {c.cancelled} cancelled</span>}
                </td>
                <td className={cn(td, 'num font-bold')}>{rupees(c.spent)}</td>
                <td className={cn(td, 'text-[13px]')}>{c.lastBookingAt ? longDate(new Date(c.lastBookingAt).toISOString()) : '—'}</td>
                <td className={cn(td, 'text-[13px] text-muted')}>{longDate(new Date(c.joinedAt).toISOString())}</td>
                <td className={td}>
                  <Chip tone={c.status === 'active' ? 'success' : 'danger'}>{c.status === 'active' ? 'Active' : 'Blocked'}</Chip>
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
      <Pager page={t.page} pages={t.pages} total={t.total} onPage={t.setPage} />
    </>
  )
}

function exportCsv(rows: CustomerRow[]) {
  downloadCsv('customers', [
    ['ID', 'Name', 'Phone', 'Email', 'Area', 'Bookings', 'Completed', 'Cancelled', 'Spent (₹)', 'Status', 'Joined'],
    ...rows.map((c) => [c.id, c.name, c.phone, c.email, c.area, c.bookings, c.completed, c.cancelled, c.spent / 100, c.status, new Date(c.joinedAt).toISOString().slice(0, 10)]),
  ])
}
