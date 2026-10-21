'use client'

import type { Route } from 'next'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { Headset } from 'lucide-react'
import { SortTh } from '@/components/catalog/parts'
import { useTable } from '@/components/catalog/useTable'
import { PRIORITY, STATUS, when } from '@/components/support/labels'
import { TicketDrawer } from '@/components/support/TicketDrawer'
import { Async, Card, Chip, Empty, Page, PageHeader, Pager, SearchInput, Select, SideTag, Tabs, TableWrap, td, th, tr } from '@/components/ui'
import { useAdminSession, useTickets, type SupportTicket } from '@/lib/data'
import { cn } from '@/lib/cn'

export default function SupportPage() {
  return (
    <Suspense>
      <Support />
    </Suspense>
  )
}

/** Every conversation with customers and technicians, most urgent first. */
function Support() {
  const router = useRouter()
  const params = useSearchParams()
  const tickets = useTickets()
  const open = (id: string | null) => router.replace((id ? `/support?id=${id}` : '/support') as Route, { scroll: false })
  return (
    <Page>
      <PageHeader title="Support tickets" sub="Questions and problems from customers and technicians. Reply, assign, resolve." />
      <Card className="overflow-hidden">
        <Async query={tickets} empty={<Empty icon={<Headset />} title="No tickets" />}>
          {(rows) => <TicketTable rows={rows} onOpen={open} />}
        </Async>
      </Card>
      <TicketDrawer id={params.get('id')} onClose={() => open(null)} />
    </Page>
  )
}

function TicketTable({ rows: all, onOpen }: { rows: SupportTicket[]; onOpen: (id: string) => void }) {
  const session = useAdminSession()
  const myName = session.status === 'signed_in' ? session.admin.name : ''
  const [side, setSide] = useState<'all' | 'customer' | 'technician'>('all')
  const rows = side === 'all' ? all : all.filter((t) => t.side === side)
  const t = useTable({
    rows,
    search: (x) => [x.id, x.subject, x.personName, x.category, x.bookingId],
    filters: {
      open: (x: SupportTicket) => x.status !== 'resolved',
      mine: (x: SupportTicket) => x.status !== 'resolved' && x.assignee === myName,
      unassigned: (x: SupportTicket) => x.status !== 'resolved' && !x.assignee,
      resolved: (x: SupportTicket) => x.status === 'resolved',
      all: () => true,
    },
    sorts: { priority: (x: SupportTicket) => PRIORITY[x.priority].rank * 1e13 - x.createdAt, newest: (x: SupportTicket) => -x.createdAt },
    initialSort: 'priority',
  })
  const n = (f: (x: SupportTicket) => boolean) => rows.filter(f).length
  return (
    <>
      <div className="flex flex-col gap-3 border-b border-line p-4">
        <Tabs
          value={t.filter}
          onChange={t.setFilter}
          options={[
            { value: 'open', label: 'Open', count: n((x) => x.status !== 'resolved'), alert: true },
            { value: 'mine', label: 'Mine', count: n((x) => x.status !== 'resolved' && x.assignee === myName) },
            { value: 'unassigned', label: 'Unassigned', count: n((x) => x.status !== 'resolved' && !x.assignee) },
            { value: 'resolved', label: 'Resolved', count: n((x) => x.status === 'resolved') },
            { value: 'all', label: 'All', count: rows.length },
          ]}
          className="border-b-0"
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <SearchInput value={t.q} onChange={t.setQ} placeholder="Ticket, subject, person or booking" className="flex-1" />
          <Select
            label="From"
            value={side}
            onChange={setSide}
            options={[
              { value: 'all', label: 'Customers and technicians' },
              { value: 'customer', label: 'Customers' },
              { value: 'technician', label: 'Technicians' },
            ]}
          />
        </div>
      </div>
      {t.total === 0 ? (
        <Empty icon={<Headset />} title={t.filter === 'open' ? 'Nothing open' : 'No tickets match'} body={t.filter === 'open' ? 'All caught up.' : 'Try another tab or search.'} />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <th className={th}>Ticket</th>
              <th className={th}>From</th>
              <SortTh by="priority" label="Priority" sort={t.sort} onSort={t.sortBy} />
              <th className={th}>Assigned</th>
              <SortTh by="newest" label="Opened" sort={t.sort} onSort={t.sortBy} />
              <th className={th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {t.visible.map((x) => (
              <tr key={x.id} className={cn(tr, 'cursor-pointer')} onClick={() => onOpen(x.id)}>
                <td className={td}>
                  <button type="button" className="text-left" onClick={() => onOpen(x.id)}>
                    <span className="block font-bold">{x.subject}</span>
                    <span className="block text-xs text-muted">
                      <span className="num">{x.id}</span> · {x.category} · {x.messages.length} messages
                    </span>
                  </button>
                </td>
                <td className={td}>
                  <span className="block text-[13px] font-semibold">{x.personName}</span>
                  <SideTag side={x.side} label={x.side === 'customer' ? 'Customer' : 'Technician'} className="mt-1 h-5 text-[10px]" />
                </td>
                <td className={td}>
                  <Chip tone={PRIORITY[x.priority].tone} dot={false}>
                    {PRIORITY[x.priority].label}
                  </Chip>
                </td>
                <td className={cn(td, 'text-[13px]')}>{x.assignee ?? <span className="text-faint">—</span>}</td>
                <td className={cn(td, 'text-[13px]')}>{when(x.createdAt)}</td>
                <td className={td}>
                  <Chip tone={STATUS[x.status].tone}>{STATUS[x.status].label}</Chip>
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
