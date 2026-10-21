'use client'

import Link from 'next/link'
import { useState } from 'react'
import { CreditCard, Download, IndianRupee, Percent, ReceiptIndianRupee, Wallet } from 'lucide-react'
import { SortTh } from '@/components/catalog/parts'
import { useTable } from '@/components/catalog/useTable'
import { when } from '@/components/support/labels'
import { Async, Button, Card, Chip, Empty, Page, PageHeader, Pager, SearchInput, Segmented, Select, StatCard, Tabs, TableWrap, td, th, tr } from '@/components/ui'
import { useCan, useTransactions, type Transaction } from '@/lib/data'
import { cn } from '@/lib/cn'
import { downloadCsv } from '@/lib/format'

const DAY = 86_400_000
const rupees = (p: number) => `${p < 0 ? '− ' : ''}₹${Math.round(Math.abs(p) / 100).toLocaleString('en-IN')}`
const METHOD = { upi: 'UPI', card: 'Card', cash: 'Cash', wallet: 'Wallet' } as const
type Range = '7' | '30' | '90' | 'all'

/** Every payment and refund on bookings, and what the platform kept. */
export default function PaymentsPage() {
  const txns = useTransactions()
  const [range, setRange] = useState<Range>('30')
  const [now] = useState(() => Date.now())
  return (
    <Page>
      <PageHeader title="Payments" sub="Payments customers made in the app, refunds sent back, and the commission on each job." />
      <Segmented
        className="mb-5"
        value={range}
        onChange={setRange}
        options={[
          { value: '7', label: '7 days' },
          { value: '30', label: '30 days' },
          { value: '90', label: '90 days' },
          { value: 'all', label: 'All time' },
        ]}
      />
      <Async query={txns} empty={<Empty icon={<CreditCard />} title="No payments yet" />}>
        {(all) => {
          const rows = range === 'all' ? all : all.filter((t) => t.at >= now - Number(range) * DAY)
          const ok = rows.filter((t) => t.status === 'success')
          const collected = ok.filter((t) => t.kind === 'payment').reduce((s, t) => s + t.amount, 0)
          const refunded = -ok.filter((t) => t.kind === 'refund').reduce((s, t) => s + t.amount, 0)
          const commission = ok.reduce((s, t) => s + t.commission, 0)
          return (
            <>
              <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard label="Collected" value={rupees(collected)} icon={<IndianRupee />} toneName="success" hint={`${ok.filter((t) => t.kind === 'payment').length} payments`} />
                <StatCard label="Refunded" value={rupees(refunded)} icon={<ReceiptIndianRupee />} toneName="warning" hint={`${ok.filter((t) => t.kind === 'refund').length} refunds`} />
                <StatCard label="Net received" value={rupees(collected - refunded)} icon={<Wallet />} toneName="brand" />
                <StatCard label="Commission" value={rupees(commission)} icon={<Percent />} toneName="violet" hint="Platform’s share of payments" />
              </div>
              <Card className="overflow-hidden">
                <TxnTable rows={rows} />
              </Card>
            </>
          )
        }}
      </Async>
    </Page>
  )
}

function TxnTable({ rows: all }: { rows: Transaction[] }) {
  const can = useCan()
  const [method, setMethod] = useState('all')
  const rows = method === 'all' ? all : all.filter((t) => t.method === method)
  const t = useTable({
    rows,
    search: (x) => [x.displayId, x.bookingId, x.customerName, x.note],
    filters: {
      all: () => true,
      payments: (x: Transaction) => x.kind === 'payment' && x.status === 'success',
      refunds: (x: Transaction) => x.kind === 'refund',
      pending: (x: Transaction) => x.status === 'pending',
      failed: (x: Transaction) => x.status === 'failed',
    },
    sorts: { at: (x: Transaction) => -x.at, amount: (x: Transaction) => -Math.abs(x.amount) },
    initialSort: 'at',
    pageSize: 20,
  })
  const n = (f: (x: Transaction) => boolean) => rows.filter(f).length
  return (
    <>
      <div className="flex flex-col gap-3 border-b border-line p-4">
        <Tabs
          value={t.filter}
          onChange={t.setFilter}
          options={[
            { value: 'all', label: 'All', count: rows.length },
            { value: 'payments', label: 'Payments', count: n((x) => x.kind === 'payment' && x.status === 'success') },
            { value: 'refunds', label: 'Refunds', count: n((x) => x.kind === 'refund') },
            { value: 'pending', label: 'Awaiting payment', count: n((x) => x.status === 'pending') },
            { value: 'failed', label: 'Failed', count: n((x) => x.status === 'failed'), alert: true },
          ]}
          className="border-b-0"
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <SearchInput value={t.q} onChange={t.setQ} placeholder="Booking or customer" className="flex-1" />
          <Select label="Method" value={method} onChange={setMethod} options={[{ value: 'all', label: 'Any method' }, ...Object.entries(METHOD).map(([v, l]) => ({ value: v, label: l }))]} />
          {can('payments', 'export') && (
            <Button
              variant="secondary"
              onClick={() =>
                downloadCsv('payments', [
                  ['When', 'Booking', 'Customer', 'Type', 'Method', 'Amount (₹)', 'Commission (₹)', 'Status', 'Note'],
                  ...rows.map((x) => [new Date(x.at).toISOString(), x.displayId, x.customerName, x.kind, x.method ?? '', x.amount / 100, x.commission / 100, x.status, x.note ?? '']),
                ])
              }
            >
              <Download /> CSV
            </Button>
          )}
        </div>
      </div>
      {t.total === 0 ? (
        <Empty icon={<CreditCard />} title="Nothing here" body="Try another tab, method or range." />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <SortTh by="at" label="When" sort={t.sort} onSort={t.sortBy} />
              <th className={th}>Booking</th>
              <th className={th}>Type</th>
              <SortTh by="amount" label="Amount" sort={t.sort} onSort={t.sortBy} />
              <th className={th}>Commission</th>
              <th className={th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {t.visible.map((x) => (
              <tr key={x.id} className={tr}>
                <td className={cn(td, 'text-[13px]')}>{when(x.at)}</td>
                <td className={td}>
                  <Link href={`/bookings?id=${x.bookingId}`} className="num block font-bold hover:text-brand">
                    {x.displayId}
                  </Link>
                  <span className="block text-xs text-muted">{x.customerName}</span>
                </td>
                <td className={cn(td, 'text-[13px]')}>
                  <span className="block font-semibold">{x.kind === 'payment' ? 'Payment' : 'Refund'}</span>
                  <span className="block max-w-xs truncate text-xs text-muted">{x.method ? METHOD[x.method] : ''}{x.note ? `${x.method ? ' · ' : ''}${x.note}` : ''}</span>
                </td>
                <td className={cn(td, 'num font-bold', x.amount < 0 && 'text-warning')}>{rupees(x.amount)}</td>
                <td className={cn(td, 'num text-[13px] text-muted')}>{x.commission ? rupees(x.commission) : '—'}</td>
                <td className={td}>
                  <Chip tone={x.status === 'success' ? (x.kind === 'refund' ? 'info' : 'success') : x.status === 'pending' ? 'warning' : 'danger'}>
                    {x.status === 'success' ? (x.kind === 'refund' ? 'Refunded' : 'Paid') : x.status === 'pending' ? 'Waiting' : 'Failed'}
                  </Chip>
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
