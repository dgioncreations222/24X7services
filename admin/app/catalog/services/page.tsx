'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ListChecks, Pencil, Plus, Wrench } from 'lucide-react'
import { CatalogHeader, HideButton, Reorder, SortTh, StatusChip, rupees, useAction } from '@/components/catalog/parts'
import { ServiceEditor } from '@/components/catalog/ServiceEditor'
import { useTable } from '@/components/catalog/useTable'
import { Async, Button, Card, Empty, Page, Pager, SearchInput, Select, Tabs, TableWrap, td, th, tr } from '@/components/ui'
import { moveService, setServiceActive, useCan, useCategories, useServices, type Category, type Service } from '@/lib/data'
import { cn } from '@/lib/cn'

/** Every service, per category: price, time, what it covers. */
export default function ServicesPage() {
  const can = useCan()
  const categories = useCategories()
  const services = useServices()
  const [category, setCategory] = useState('all')
  const [editing, setEditing] = useState<Service | 'new' | null>(null)
  return (
    <Page>
      <CatalogHeader
        sub="Price, usual time, what’s included and the FAQs customers read before booking."
        actions={
          can('catalog', 'create') && (
            <Button onClick={() => setEditing('new')} disabled={!categories.data?.length}>
              <Plus /> Add service
            </Button>
          )
        }
      />
      <Card className="overflow-hidden">
        <Async query={categories}>
          {(cats) => (
            <Async query={services} empty={<Empty icon={<Wrench />} title="No services yet" body="Add one to a category." />}>
              {(rows) => (
                <ServiceTable
                  rows={category === 'all' ? rows : rows.filter((s) => s.categoryId === category)}
                  all={rows}
                  categories={cats}
                  category={category}
                  onCategory={setCategory}
                  editable={can('catalog', 'edit')}
                  onEdit={setEditing}
                />
              )}
            </Async>
          )}
        </Async>
      </Card>
      {editing && categories.data && (
        <ServiceEditor
          service={editing === 'new' ? null : editing}
          categories={categories.data}
          defaultCategory={category === 'all' ? undefined : category}
          onClose={() => setEditing(null)}
        />
      )}
    </Page>
  )
}

function ServiceTable({
  rows,
  all,
  categories,
  category,
  onCategory,
  editable,
  onEdit,
}: {
  rows: Service[]
  all: Service[]
  categories: Category[]
  category: string
  onCategory: (id: string) => void
  editable: boolean
  onEdit: (s: Service) => void
}) {
  const { run, busy } = useAction()
  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? '—'
  const t = useTable({
    rows,
    search: (s) => [s.name, s.description, catName(s.categoryId)],
    filters: { all: () => true, live: (s: Service) => s.active, hidden: (s: Service) => !s.active },
    sorts: {
      order: (s: Service) => (categories.find((c) => c.id === s.categoryId)?.order ?? 0) * 1000 + s.order,
      name: (s: Service) => s.name,
      price: (s: Service) => s.price,
      time: (s: Service) => s.durationMinutes,
    },
    initialSort: 'order',
  })
  const reorderable = editable && t.inSavedOrder('order') && t.filter === 'all'
  return (
    <>
      <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center lg:justify-between">
        <Tabs
          value={t.filter}
          onChange={t.setFilter}
          options={[
            { value: 'all', label: 'All', count: rows.length },
            { value: 'live', label: 'Live', count: rows.filter((s) => s.active).length },
            { value: 'hidden', label: 'Hidden', count: rows.filter((s) => !s.active).length },
          ]}
          className="border-b-0"
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select label="Category" value={category} onChange={onCategory} options={[{ value: 'all', label: 'All categories' }, ...categories.map((c) => ({ value: c.id, label: c.name }))]} />
          <SearchInput value={t.q} onChange={t.setQ} placeholder="Search services" className="sm:w-64" />
        </div>
      </div>
      {t.total === 0 ? (
        <Empty icon={<Wrench />} title="Nothing matches" body="Try another word, filter or category." />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <SortTh by="order" label="Order" sort={t.sort} onSort={t.sortBy} className="w-20" />
              <SortTh by="name" label="Service" sort={t.sort} onSort={t.sortBy} />
              <SortTh by="price" label="Price" sort={t.sort} onSort={t.sortBy} />
              <SortTh by="time" label="Time" sort={t.sort} onSort={t.sortBy} />
              <th className={th}>Status</th>
              <th className={cn(th, 'text-right')}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {t.visible.map((s) => {
              const group = all.filter((x) => x.categoryId === s.categoryId).sort((a, b) => a.order - b.order)
              const i = group.findIndex((x) => x.id === s.id)
              return (
                <tr key={s.id} className={cn(tr, !s.active && 'opacity-60')}>
                  <td className={td}>
                    <Reorder label={s.name} first={i === 0} last={i === group.length - 1} disabled={!reorderable || busy} onMove={(dir) => void run(() => moveService(s.id, dir))} />
                  </td>
                  <td className={td}>
                    <span className="block font-bold">{s.name}</span>
                    <span className="block text-xs text-muted">
                      {catName(s.categoryId)} · {s.included.length} included · {s.faqs.length} FAQs
                    </span>
                  </td>
                  <td className={cn(td, 'num font-bold')}>{rupees(s.price)}</td>
                  <td className={cn(td, 'num')}>{s.durationMinutes} min</td>
                  <td className={td}>
                    <StatusChip active={s.active} />
                  </td>
                  <td className={cn(td, 'text-right')}>
                    <span className="inline-flex gap-1">
                      <Link href={`/catalog/questions?service=${s.id}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-bold text-brand hover:bg-brand-soft">
                        <ListChecks className="size-4" aria-hidden /> Questions
                      </Link>
                      {editable && (
                        <>
                          <Button size="sm" variant="subtle" onClick={() => onEdit(s)}>
                            <Pencil /> Edit
                          </Button>
                          <HideButton
                            active={s.active}
                            disabled={busy}
                            onToggle={() => void run(() => setServiceActive(s.id, !s.active), s.active ? `${s.name} hidden from customers` : `${s.name} is live`)}
                          />
                        </>
                      )}
                    </span>
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
