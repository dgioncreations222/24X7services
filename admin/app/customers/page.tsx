'use client'

import type { Route } from 'next'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useMemo, useState } from 'react'
import { Ban, Download, Repeat, UserPlus, Users, ChevronRight } from 'lucide-react'
import { CustomerDrawer } from '@/components/cust-drawer'
import {
  Avatar,
  Button,
  Card,
  Chip,
  Empty,
  Page,
  PageHeader,
  Pager,
  SearchInput,
  Select,
  StatCard,
  TableWrap,
  Tabs,
  td,
  th,
  tr,
} from '@/components/ui'
import { inr } from '@/lib/catalog'
import { BRAND } from '@/lib/brand'
import { cn } from '@/lib/cn'
import { ago, downloadCsv, longDate, matches, withinDays } from '@/lib/format'
import { AREAS } from '@/lib/seed'
import { useStore } from '@/lib/store'
import type { Booking, Customer } from '@/lib/types'

const PAGE = 25

interface Row {
  c: Customer
  bookings: Booking[]
  spend: number
  last?: string
}

export default function CustomersPage() {
  return (
    <Suspense>
      <Customers />
    </Suspense>
  )
}

/** Everyone who has booked through the customer app, with what they spent and how it went. */
function Customers() {
  const store = useStore()
  const router = useRouter()
  const params = useSearchParams()
  const openId = params.get('id')
  const [tab, setTab] = useState<'all' | 'active' | 'blocked'>('all')
  const [q, setQ] = useState('')
  const [area, setArea] = useState('all')
  const [page, setPage] = useState(0)

  const rows = useMemo<Row[]>(() => {
    const byCustomer = new Map<string, Booking[]>()
    for (const b of store.bookings) byCustomer.set(b.customerId, [...(byCustomer.get(b.customerId) ?? []), b])
    return store.customers.map((c) => {
      const bookings = (byCustomer.get(c.id) ?? []).sort((a, z) => z.scheduledAt.localeCompare(a.scheduledAt))
      return {
        c,
        bookings,
        spend: bookings.filter((b) => b.status === 'completed').reduce((s, b) => s + b.amount, 0),
        last: bookings.find((b) => new Date(b.scheduledAt).getTime() <= Date.now())?.scheduledAt ?? bookings[0]?.scheduledAt,
      }
    })
  }, [store.bookings, store.customers])

  const filtered = rows
    .filter((r) => tab === 'all' || r.c.status === tab)
    .filter((r) => area === 'all' || r.c.area === area)
    .filter((r) => matches([r.c.id, r.c.name, r.c.phone.replace(/\s/g, ''), r.c.email, r.c.area], q))
    .sort((a, z) => z.spend - a.spend)
  const pages = Math.ceil(filtered.length / PAGE)
  const shown = filtered.slice(page * PAGE, page * PAGE + PAGE)

  const repeat = rows.length ? Math.round((rows.filter((r) => r.bookings.length > 1).length / rows.filter((r) => r.bookings.length).length) * 100) : 0
  const setOpen = (id: string | null) => router.replace((id ? `/customers/?id=${id}` : '/customers') as Route, { scroll: false })

  const exportCsv = () =>
    downloadCsv('customers', [
      ['ID', 'Name', 'Phone', 'Email', 'Area', 'Bookings', 'Lifetime spend', 'Wallet credit', 'Status', 'Joined'],
      ...filtered.map((r) => [r.c.id, r.c.name, r.c.phone, r.c.email, r.c.area, r.bookings.length, r.spend, r.c.walletCredit, r.c.status, longDate(r.c.joinedAt)]),
    ])

  return (
    <Page>
      <PageHeader
        side="customer"
        title="Customers"
        sub={`Everyone booking through the ${BRAND.name} customer app`}
        actions={
          <Button variant="secondary" onClick={exportCsv}>
            <Download /> Export CSV
          </Button>
        }
      />

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4">
        <StatCard label="Total customers" value={store.customers.length} icon={<Users />} />
        <StatCard label="New · last 30 days" value={store.customers.filter((c) => withinDays(c.joinedAt, 30)).length} icon={<UserPlus />} toneName="success" />
        <StatCard label="Repeat rate" value={`${repeat}%`} icon={<Repeat />} toneName="info" hint={<span>Booked more than once</span>} />
        <StatCard label="Suspended" value={store.customers.filter((c) => c.status === 'blocked').length} icon={<Ban />} toneName="danger" />
      </section>

      <Card className="mt-5">
        <Tabs
          className="px-3"
          value={tab}
          onChange={(v) => {
            setTab(v)
            setPage(0)
          }}
          options={[
            { value: 'all', label: 'All', count: rows.length },
            { value: 'active', label: 'Active', count: rows.filter((r) => r.c.status === 'active').length },
            { value: 'blocked', label: 'Suspended', count: rows.filter((r) => r.c.status === 'blocked').length },
          ]}
        />
        <div className="flex flex-col gap-2 border-b border-line p-4 sm:flex-row">
          <SearchInput
            className="flex-1"
            value={q}
            onChange={(v) => {
              setQ(v)
              setPage(0)
            }}
            placeholder="Search name, phone, email or ID"
          />
          <Select
            label="Area"
            value={area}
            onChange={(v) => {
              setArea(v)
              setPage(0)
            }}
            options={[{ value: 'all', label: 'All areas' }, ...AREAS.map((a) => ({ value: a.area, label: a.area }))]}
          />
        </div>

        {shown.length === 0 ? (
          <Empty icon={<Users />} title="No customers match" body="Try a different search or area." />
        ) : (
          <>
          {/* Phone: one card per customer — the table would scroll sideways. */}
          <ul className="divide-y divide-line sm:hidden">
            {shown.map(({ c, bookings, spend, last }) => (
              <li key={c.id}>
                <button type="button" onClick={() => setOpen(c.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-canvas">
                  <Avatar name={c.name} size={40} side="customer" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-bold">{c.name}</span>
                      {c.status !== 'active' && (
                        <Chip tone="danger" className="h-5 shrink-0 px-1.5 text-[10px]">
                          Suspended
                        </Chip>
                      )}
                    </span>
                    <span className="block truncate text-xs font-medium text-muted">{c.area}</span>
                    <span className="num block truncate text-xs font-medium text-faint">{c.phone}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="num block text-sm font-extrabold">{inr(spend)}</span>
                    <span className="num block text-[11px] font-semibold text-muted">
                      {bookings.length} booking{bookings.length === 1 ? '' : 's'}
                    </span>
                    <span className="block text-[11px] font-medium text-faint">{last ? ago(last) : 'No bookings'}</span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-faint" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
          <div className="hidden sm:block">
<TableWrap>
            <thead>
              <tr>
                <th className={th}>Customer</th>
                <th className={th}>Contact</th>
                <th className={th}>Area</th>
                <th className={cn(th, 'text-right')}>Bookings</th>
                <th className={cn(th, 'text-right')}>Lifetime spend</th>
                <th className={th}>Last booking</th>
                <th className={cn(th, 'text-right')}>Wallet</th>
                <th className={th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {shown.map(({ c, bookings, spend, last }) => (
                <tr key={c.id} className={cn(tr, 'cursor-pointer')} onClick={() => setOpen(c.id)}>
                  <td className={td}>
                    <span className="flex items-center gap-3">
                      <Avatar name={c.name} size={32} side="customer" />
                      <span>
                        <span className="block font-bold">{c.name}</span>
                        <span className="num block text-xs font-medium text-muted">{c.id}</span>
                      </span>
                    </span>
                  </td>
                  <td className={td}>
                    <span className="num block text-[13px] font-semibold">{c.phone}</span>
                    <span className="block max-w-[200px] truncate text-xs text-muted">{c.email}</span>
                  </td>
                  <td className={cn(td, 'font-semibold text-ink-2')}>{c.area}</td>
                  <td className={cn(td, 'num text-right font-bold')}>{bookings.length}</td>
                  <td className={cn(td, 'num text-right font-extrabold')}>{inr(spend)}</td>
                  <td className={cn(td, 'text-[13px] font-medium text-muted')}>{last ? ago(last) : '—'}</td>
                  <td className={cn(td, 'num text-right font-semibold')}>{c.walletCredit ? inr(c.walletCredit) : '—'}</td>
                  <td className={td}>
                    <Chip tone={c.status === 'active' ? 'success' : 'danger'}>{c.status === 'active' ? 'Active' : 'Suspended'}</Chip>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
          </div>
          </>
        )}
        <Pager page={page} pages={pages} total={filtered.length} onPage={setPage} />
      </Card>

      {(() => {
        const row = rows.find((r) => r.c.id === openId)
        return <CustomerDrawer c={row?.c} bookings={row?.bookings ?? []} spend={row?.spend ?? 0} onClose={() => setOpen(null)} />
      })()}
    </Page>
  )
}
