'use client'

import { useState } from 'react'
import { FolderPlus, Pencil, Shapes } from 'lucide-react'
import { CatalogHeader, FormError, HideButton, Reorder, SortTh, StatusChip, useAction } from '@/components/catalog/parts'
import { ImageField, textareaClass } from '@/components/catalog/fields'
import { useTable } from '@/components/catalog/useTable'
import { Async, Button, Card, Empty, Field, Modal, Page, Pager, SearchInput, Tabs, TableWrap, inputClass, td, th, tr } from '@/components/ui'
import { moveCategory, saveCategory, setCategoryActive, useCan, useCategories, useServices, type Category } from '@/lib/data'
import { cn } from '@/lib/cn'

/** What customers pick first: AC, Washing Machine… Add, edit, hide and order them. */
export default function CategoriesPage() {
  const can = useCan()
  const editable = can('catalog', 'edit')
  const categories = useCategories()
  const [editing, setEditing] = useState<Category | 'new' | null>(null)
  return (
    <Page>
      <CatalogHeader
        sub="The first thing customers pick. The order here is the order in the app."
        actions={
          can('catalog', 'create') && (
            <Button onClick={() => setEditing('new')}>
              <FolderPlus /> Add category
            </Button>
          )
        }
      />
      <Card className="overflow-hidden">
        <Async query={categories} empty={<Empty icon={<Shapes />} title="No categories yet" body="Add the first one — AC, Washing Machine and so on." />}>
          {(rows) => <CategoryTable rows={rows} editable={editable} onEdit={setEditing} />}
        </Async>
      </Card>
      {editing && <CategoryModal category={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </Page>
  )
}

function CategoryTable({ rows, editable, onEdit }: { rows: Category[]; editable: boolean; onEdit: (c: Category) => void }) {
  const services = useServices()
  const count = (id: string) => services.data?.filter((s) => s.categoryId === id).length ?? 0
  const { run, busy } = useAction()
  const t = useTable({
    rows,
    search: (c) => [c.name, c.description],
    filters: { all: () => true, live: (c: Category) => c.active, hidden: (c: Category) => !c.active },
    sorts: { order: (c: Category) => c.order, name: (c: Category) => c.name, services: (c: Category) => count(c.id) },
    initialSort: 'order',
  })
  const reorderable = editable && t.inSavedOrder('order') && t.filter === 'all'
  return (
    <>
      <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={t.filter}
          onChange={t.setFilter}
          options={[
            { value: 'all', label: 'All', count: rows.length },
            { value: 'live', label: 'Live', count: rows.filter((c) => c.active).length },
            { value: 'hidden', label: 'Hidden', count: rows.filter((c) => !c.active).length },
          ]}
          className="border-b-0"
        />
        <SearchInput value={t.q} onChange={t.setQ} placeholder="Search categories" className="sm:w-72" />
      </div>
      {t.total === 0 ? (
        <Empty icon={<Shapes />} title="Nothing matches" body="Try another word or filter." />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <SortTh by="order" label="Order" sort={t.sort} onSort={t.sortBy} className="w-20" />
              <SortTh by="name" label="Category" sort={t.sort} onSort={t.sortBy} />
              <SortTh by="services" label="Services" sort={t.sort} onSort={t.sortBy} />
              <th className={th}>Status</th>
              <th className={cn(th, 'text-right')}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {t.visible.map((c) => {
              const i = rows.findIndex((r) => r.id === c.id)
              return (
                <tr key={c.id} className={cn(tr, !c.active && 'opacity-60')}>
                  <td className={td}>
                    <span className="flex items-center gap-1">
                      <Reorder label={c.name} first={i === 0} last={i === rows.length - 1} disabled={!reorderable || busy} onMove={(dir) => void run(() => moveCategory(c.id, dir))} />
                      <span className="num text-xs font-bold text-faint">{c.order + 1}</span>
                    </span>
                  </td>
                  <td className={td}>
                    <span className="flex items-center gap-3">
                      {c.image ? (
                        // eslint-disable-next-line @next/next/no-img-element -- static export, and data: URLs from the picker
                        <img src={c.image} alt="" className="size-10 shrink-0 rounded-lg object-cover" />
                      ) : (
                        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-canvas text-faint">
                          <Shapes className="size-4" />
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="block font-bold">{c.name}</span>
                        <span className="block max-w-md truncate text-xs text-muted">{c.description}</span>
                      </span>
                    </span>
                  </td>
                  <td className={cn(td, 'num font-semibold')}>{count(c.id)}</td>
                  <td className={td}>
                    <StatusChip active={c.active} />
                  </td>
                  <td className={cn(td, 'text-right')}>
                    {editable && (
                      <span className="inline-flex gap-1">
                        <Button size="sm" variant="subtle" onClick={() => onEdit(c)}>
                          <Pencil /> Edit
                        </Button>
                        <HideButton
                          active={c.active}
                          disabled={busy}
                          onToggle={() => void run(() => setCategoryActive(c.id, !c.active), c.active ? `${c.name} hidden from customers` : `${c.name} is live`)}
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
      {editable && !reorderable && <p className="border-t border-line px-5 py-2.5 text-xs text-muted">To reorder, clear the search, pick All and sort by Order.</p>}
    </>
  )
}

function CategoryModal({ category, onClose }: { category: Category | null; onClose: () => void }) {
  const [name, setName] = useState(category?.name ?? '')
  const [description, setDescription] = useState(category?.description ?? '')
  const [image, setImage] = useState(category?.image)
  const { run, busy, error } = useAction()
  const save = () => void run(() => saveCategory({ id: category?.id, name, description, image }), category ? 'Category saved' : 'Category added', onClose)
  return (
    <Modal
      open
      onClose={onClose}
      title={category ? `Edit ${category.name}` : 'Add category'}
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
        <Field label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Water Purifier" className={cn(inputClass, 'h-10')} autoFocus />
        </Field>
        <Field label="Description" hint="One line customers see under the name.">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={textareaClass} />
        </Field>
        <Field label="Image">
          <ImageField value={image} onChange={setImage} label="Category image" />
        </Field>
        <FormError error={error} />
      </div>
    </Modal>
  )
}
