'use client'

import { useState } from 'react'
import { Pencil, Plus, ReceiptText } from 'lucide-react'
import { PriceInput } from '@/components/catalog/fields'
import { CatalogHeader, FormError, HideButton, Reorder, SortTh, StatusChip, rupees, useAction } from '@/components/catalog/parts'
import { useTable } from '@/components/catalog/useTable'
import { Async, Button, Card, Empty, Field, Modal, Page, Pager, SearchInput, Select, Tabs, TableWrap, inputClass, td, th, tr } from '@/components/ui'
import { moveRateCardItem, saveRateCardItem, setRateCardItemActive, useCan, useCategories, useRateCard, type Category, type RateCardItem } from '@/lib/data'
import { cn } from '@/lib/cn'
import { ago } from '@/lib/format'

/**
 * Parts and charges at fixed prices. Technicians add these to a job on site;
 * the customer sees the same name and price and approves it.
 */
export default function RateCardPage() {
  const can = useCan()
  const categories = useCategories()
  const items = useRateCard()
  const [category, setCategory] = useState('all')
  const [editing, setEditing] = useState<RateCardItem | 'new' | null>(null)
  return (
    <Page>
      <CatalogHeader
        sub="Fixed prices for parts and extra work. Technicians pick from this list on site; anything else goes as “Other” for the customer to approve."
        actions={
          can('catalog', 'create') && (
            <Button onClick={() => setEditing('new')} disabled={!categories.data?.length}>
              <Plus /> Add item
            </Button>
          )
        }
      />
      <Card className="overflow-hidden">
        <Async query={categories}>
          {(cats) => (
            <Async query={items} empty={<Empty icon={<ReceiptText />} title="The rate card is empty" body="Add the parts technicians fit most often." />}>
              {(rows) => (
                <RateTable
                  rows={category === 'all' ? rows : rows.filter((r) => r.categoryId === category)}
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
        <RateModal item={editing === 'new' ? null : editing} categories={categories.data} defaultCategory={category === 'all' ? undefined : category} onClose={() => setEditing(null)} />
      )}
    </Page>
  )
}

function RateTable({
  rows,
  all,
  categories,
  category,
  onCategory,
  editable,
  onEdit,
}: {
  rows: RateCardItem[]
  all: RateCardItem[]
  categories: Category[]
  category: string
  onCategory: (id: string) => void
  editable: boolean
  onEdit: (r: RateCardItem) => void
}) {
  const { run, busy } = useAction()
  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? '—'
  const t = useTable({
    rows,
    search: (r) => [r.name, catName(r.categoryId)],
    filters: { all: () => true, live: (r: RateCardItem) => r.active, hidden: (r: RateCardItem) => !r.active },
    sorts: {
      order: (r: RateCardItem) => (categories.find((c) => c.id === r.categoryId)?.order ?? 0) * 1000 + r.order,
      name: (r: RateCardItem) => r.name,
      price: (r: RateCardItem) => r.price,
      updated: (r: RateCardItem) => -r.updatedAt,
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
            { value: 'live', label: 'Live', count: rows.filter((r) => r.active).length },
            { value: 'hidden', label: 'Hidden', count: rows.filter((r) => !r.active).length },
          ]}
          className="border-b-0"
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select label="Category" value={category} onChange={onCategory} options={[{ value: 'all', label: 'All categories' }, ...categories.map((c) => ({ value: c.id, label: c.name }))]} />
          <SearchInput value={t.q} onChange={t.setQ} placeholder="Search parts" className="sm:w-64" />
        </div>
      </div>
      {t.total === 0 ? (
        <Empty icon={<ReceiptText />} title="Nothing matches" body="Try another word, filter or category." />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <SortTh by="order" label="Order" sort={t.sort} onSort={t.sortBy} className="w-20" />
              <SortTh by="name" label="Part or charge" sort={t.sort} onSort={t.sortBy} />
              <th className={th}>Category</th>
              <SortTh by="price" label="Price" sort={t.sort} onSort={t.sortBy} />
              <SortTh by="updated" label="Updated" sort={t.sort} onSort={t.sortBy} />
              <th className={th}>Status</th>
              <th className={cn(th, 'text-right')}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {t.visible.map((r) => {
              const group = all.filter((x) => x.categoryId === r.categoryId).sort((a, b) => a.order - b.order)
              const i = group.findIndex((x) => x.id === r.id)
              return (
                <tr key={r.id} className={cn(tr, !r.active && 'opacity-60')}>
                  <td className={td}>
                    <Reorder label={r.name} first={i === 0} last={i === group.length - 1} disabled={!reorderable || busy} onMove={(dir) => void run(() => moveRateCardItem(r.id, dir))} />
                  </td>
                  <td className={cn(td, 'font-bold')}>{r.name}</td>
                  <td className={cn(td, 'text-muted')}>{catName(r.categoryId)}</td>
                  <td className={cn(td, 'num font-bold')}>{rupees(r.price)}</td>
                  <td className={cn(td, 'text-xs text-muted')}>{ago(new Date(r.updatedAt).toISOString())}</td>
                  <td className={td}>
                    <StatusChip active={r.active} />
                  </td>
                  <td className={cn(td, 'text-right')}>
                    {editable && (
                      <span className="inline-flex gap-1">
                        <Button size="sm" variant="subtle" onClick={() => onEdit(r)}>
                          <Pencil /> Edit
                        </Button>
                        <HideButton
                          active={r.active}
                          disabled={busy}
                          onToggle={() => void run(() => setRateCardItemActive(r.id, !r.active), r.active ? `${r.name} hidden from technicians` : `${r.name} is live`)}
                        />
                      </span>
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

function RateModal({ item, categories, defaultCategory, onClose }: { item: RateCardItem | null; categories: Category[]; defaultCategory?: string; onClose: () => void }) {
  const [categoryId, setCategoryId] = useState(item?.categoryId ?? defaultCategory ?? categories[0]?.id ?? '')
  const [name, setName] = useState(item?.name ?? '')
  const [price, setPrice] = useState(item?.price ?? 0)
  const { run, busy, error } = useAction()
  const save = () => void run(() => saveRateCardItem({ id: item?.id, categoryId, name, price }), item ? 'Rate card item saved' : 'Added to the rate card', onClose)
  return (
    <Modal
      open
      onClose={onClose}
      title={item ? `Edit ${item.name}` : 'Add to the rate card'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={busy} onClick={save}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Category">
          <Select full label="Category" value={categoryId} onChange={setCategoryId} options={categories.map((c) => ({ value: c.id, label: c.name }))} />
        </Field>
        <Field label="Part or charge">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Drain pump" className={cn(inputClass, 'h-10')} autoFocus />
        </Field>
        <Field label="Price to the customer" hint="The whole price — part and fitting.">
          <PriceInput label="Price in rupees" value={price} onChange={setPrice} />
        </Field>
        <FormError error={error} />
      </div>
    </Modal>
  )
}
