'use client'

import type { Route } from 'next'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { Download, UserPlus, UserRoundCog } from 'lucide-react'
import { SortTh } from '@/components/catalog/parts'
import { useTable } from '@/components/catalog/useTable'
import { AddTechnicianModal } from '@/components/technicians/AddTechnicianModal'
import { PARTNER_STATUS, presence } from '@/components/technicians/status'
import { TechnicianDrawer } from '@/components/technicians/TechnicianDrawer'
import { Async, Avatar, Button, Card, Chip, Empty, Page, PageHeader, Pager, Rating, SearchInput, Select, Tabs, TableWrap, td, th, tr } from '@/components/ui'
import { useCan, usePartners, useCategories, type Category, type Partner } from '@/lib/data'
import { cn } from '@/lib/cn'
import { ago, downloadCsv } from '@/lib/format'

export default function TechniciansPage() {
  return (
    <Suspense>
      <Technicians />
    </Suspense>
  )
}

/** The technician network: who is working, how well, and who is waiting to join. */
function Technicians() {
  const router = useRouter()
  const params = useSearchParams()
  const partners = usePartners()
  const categories = useCategories()
  const can = useCan()
  const [adding, setAdding] = useState(false)
  const open = (id: string | null) => router.replace((id ? `/technicians?id=${id}` : '/technicians') as Route, { scroll: false })
  const active = partners.data?.filter((p) => p.status === 'active') ?? []
  return (
    <Page>
      <PageHeader
        side="technician"
        title="Technicians"
        sub={partners.data ? `${active.length} active · ${active.filter((p) => p.online).length} online now · ${partners.data.filter((p) => p.status === 'kyc_pending').length} waiting for KYC review` : 'Loading…'}
        actions={
          <>
            {partners.data && (
              <Button variant="secondary" onClick={() => exportCsv(partners.data!, categories.data ?? [])}>
                <Download /> Export CSV
              </Button>
            )}
            {can('technicians', 'create') && (
              <Button onClick={() => setAdding(true)}>
                <UserPlus /> Add technician
              </Button>
            )}
          </>
        }
      />
      <Card className="overflow-hidden">
        <Async query={partners} empty={<Empty icon={<UserRoundCog />} title="No technicians yet" body="Technicians join through the partner desk — add the first one with Add technician." />}>
          {(rows) => <PartnerTable rows={rows} categories={categories.data ?? []} onOpen={open} />}
        </Async>
      </Card>
      <TechnicianDrawer id={params.get('id')} onClose={() => open(null)} />
      {adding && (
        <AddTechnicianModal
          onClose={() => setAdding(false)}
          onAdded={(id) => {
            setAdding(false)
            open(id)
          }}
        />
      )}
    </Page>
  )
}

type Filter = 'active' | 'online' | 'applications' | 'approved' | 'rejected' | 'suspended' | 'inactive'

function PartnerTable({ rows: all, categories, onOpen }: { rows: Partner[]; categories: Category[]; onOpen: (id: string) => void }) {
  const [category, setCategory] = useState('all')
  const rows = category === 'all' ? all : all.filter((p) => p.skills.includes(category))
  const t = useTable({
    rows,
    search: (p) => [p.id, p.name, p.phone.replace(/\s/g, ''), p.email, p.area],
    filters: {
      active: (p: Partner) => p.status === 'active',
      online: (p: Partner) => p.status === 'active' && p.online,
      applications: (p: Partner) => p.status === 'kyc_pending',
      approved: (p: Partner) => p.status === 'approved',
      rejected: (p: Partner) => p.status === 'rejected',
      suspended: (p: Partner) => p.status === 'suspended',
      inactive: (p: Partner) => p.status === 'inactive',
    },
    sorts: {
      name: (p: Partner) => p.name,
      rating: (p: Partner) => -p.rating,
      jobs: (p: Partner) => -p.jobs30,
      accept: (p: Partner) => -p.acceptanceRate,
      ontime: (p: Partner) => -p.onTimeRate,
      waiting: (p: Partner) => p.submittedAt ?? 0,
    },
    initialSort: 'jobs',
  })
  const count = (f: Filter) => rows.filter((p) => ({ active: p.status === 'active', online: p.status === 'active' && p.online, applications: p.status === 'kyc_pending', approved: p.status === 'approved', rejected: p.status === 'rejected', suspended: p.status === 'suspended', inactive: p.status === 'inactive' })[f]).length
  const queue = t.filter === 'applications' || t.filter === 'rejected'
  const catNames = (p: Partner) => p.skills.map((s) => categories.find((c) => c.id === s)?.name ?? s).join(', ')

  return (
    <>
      <div className="flex flex-col gap-3 border-b border-line p-4">
        <Tabs
          value={t.filter}
          onChange={(f) => {
            t.setFilter(f)
            // The review queues sort by who has waited longest; the rest by work done.
            const queueTab = f === 'applications' || f === 'rejected'
            if (queueTab && t.sort.by !== 'waiting') t.sortBy('waiting')
            if (!queueTab && t.sort.by === 'waiting') t.sortBy('jobs')
          }}
          options={[
            { value: 'active', label: 'Active', count: count('active') },
            { value: 'online', label: 'Online now', count: count('online') },
            { value: 'applications', label: 'KYC to review', count: count('applications'), alert: true },
            { value: 'approved', label: 'Approved · not started', count: count('approved') },
            { value: 'rejected', label: 'Rejected', count: count('rejected') },
            { value: 'suspended', label: 'Suspended', count: count('suspended') },
            { value: 'inactive', label: 'Inactive', count: count('inactive') },
          ]}
          className="border-b-0"
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <SearchInput value={t.q} onChange={t.setQ} placeholder="Search name, ID, phone or area" className="flex-1" />
          <Select label="Category" value={category} onChange={setCategory} options={[{ value: 'all', label: 'All categories' }, ...categories.map((c) => ({ value: c.id, label: c.name }))]} />
        </div>
      </div>
      {t.total === 0 ? (
        <Empty icon={<UserRoundCog />} title="Nobody here" body={t.filter === 'applications' ? 'No applications waiting — all caught up.' : 'Try another search, tab or category.'} />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <SortTh by="name" label="Technician" sort={t.sort} onSort={t.sortBy} />
              <th className={th}>Area · categories</th>
              {queue ? (
                <SortTh by="waiting" label="Sent for review" sort={t.sort} onSort={t.sortBy} />
              ) : (
                <>
                  <SortTh by="rating" label="Rating" sort={t.sort} onSort={t.sortBy} />
                  <SortTh by="jobs" label="Jobs · 30 d" sort={t.sort} onSort={t.sortBy} />
                  <SortTh by="accept" label="Accept." sort={t.sort} onSort={t.sortBy} />
                  <SortTh by="ontime" label="On time" sort={t.sort} onSort={t.sortBy} />
                </>
              )}
              <th className={th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {t.visible.map((p) => {
              const pr = presence(p)
              const s = PARTNER_STATUS[p.status]
              return (
                <tr key={p.id} className={cn(tr, 'cursor-pointer')} onClick={() => onOpen(p.id)}>
                  <td className={td}>
                    <button type="button" className="flex items-center gap-3 text-left" onClick={() => onOpen(p.id)}>
                      <span className="relative">
                        <Avatar name={p.name} size={36} side="technician" />
                        {p.status === 'active' && <span className={cn('absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card', pr.dot)} />}
                      </span>
                      <span>
                        <span className="block font-bold">{p.name}</span>
                        <span className="num block text-xs text-muted">{p.id}</span>
                      </span>
                    </button>
                  </td>
                  <td className={td}>
                    <span className="block font-semibold">{p.area}</span>
                    <span className="block max-w-56 truncate text-xs text-muted">{catNames(p)}</span>
                  </td>
                  {queue ? (
                    <td className={cn(td, 'text-sm')}>{p.submittedAt ? ago(new Date(p.submittedAt).toISOString()) : '—'}</td>
                  ) : (
                    <>
                      <td className={td}>{p.ratingCount ? <Rating value={p.rating} /> : <span className="text-faint">—</span>}</td>
                      <td className={cn(td, 'num font-semibold')}>{p.jobs30}</td>
                      <td className={cn(td, 'num', p.acceptanceRate < 80 && 'text-warning')}>{p.acceptanceRate}%</td>
                      <td className={cn(td, 'num', p.onTimeRate < 90 && 'text-warning')}>{p.onTimeRate}%</td>
                    </>
                  )}
                  <td className={td}>
                    {p.status === 'active' ? (
                      <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold">
                        <span className={cn('size-2 rounded-full', pr.dot)} /> {pr.label}
                      </span>
                    ) : (
                      <Chip tone={s.tone}>{s.label}</Chip>
                    )}
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

function exportCsv(rows: Partner[], categories: Category[]) {
  downloadCsv('technicians', [
    ['ID', 'Name', 'Phone', 'Email', 'Area', 'Status', 'Categories', 'Rating', 'Jobs (30 d)', 'Acceptance %', 'On-time %', 'Cancel %'],
    ...rows.map((p) => [
      p.id,
      p.name,
      p.phone,
      p.email,
      p.area,
      PARTNER_STATUS[p.status].label,
      p.skills.map((s) => categories.find((c) => c.id === s)?.name ?? s).join(' / '),
      p.rating,
      p.jobs30,
      p.acceptanceRate,
      p.onTimeRate,
      p.cancelRate,
    ]),
  ])
}
