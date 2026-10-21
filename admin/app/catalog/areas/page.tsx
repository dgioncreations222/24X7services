'use client'

import { useState } from 'react'
import { MapPin, MapPinPlus } from 'lucide-react'
import { CatalogHeader, FormError, SortTh, useAction } from '@/components/catalog/parts'
import { useTable } from '@/components/catalog/useTable'
import { Async, Button, Card, Chip, Empty, Field, Modal, Page, Pager, SearchInput, Tabs, TableWrap, Toggle, inputClass, td, th, tr } from '@/components/ui'
import { addArea, setAreaActive, useAreas, useCan, type ServiceArea } from '@/lib/data'
import { cn } from '@/lib/cn'

/** Pincodes customers can book in. Switching one off stops new bookings there at once. */
export default function AreasPage() {
  const can = useCan()
  const areas = useAreas()
  const [adding, setAdding] = useState(false)
  return (
    <Page>
      <CatalogHeader
        sub="Pincodes customers can book in. Switching one off stops new bookings there straight away."
        actions={
          can('catalog', 'create') && (
            <Button onClick={() => setAdding(true)}>
              <MapPinPlus /> Add area
            </Button>
          )
        }
      />
      <Card className="overflow-hidden">
        <Async query={areas} empty={<Empty icon={<MapPin />} title="No service areas" body="Add the pincodes you cover." />}>
          {(rows) => <AreaTable rows={rows} editable={can('catalog', 'edit')} />}
        </Async>
      </Card>
      {adding && <AreaModal onClose={() => setAdding(false)} />}
    </Page>
  )
}

function AreaTable({ rows, editable }: { rows: ServiceArea[]; editable: boolean }) {
  const { run, busy } = useAction()
  const t = useTable({
    rows,
    search: (a) => [a.area, a.pincode, a.city],
    filters: { all: () => true, on: (a: ServiceArea) => a.active, off: (a: ServiceArea) => !a.active },
    sorts: { area: (a: ServiceArea) => a.area, pincode: (a: ServiceArea) => a.pincode, city: (a: ServiceArea) => a.city },
    initialSort: 'area',
  })
  return (
    <>
      <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={t.filter}
          onChange={t.setFilter}
          options={[
            { value: 'all', label: 'All', count: rows.length },
            { value: 'on', label: 'Taking bookings', count: rows.filter((a) => a.active).length },
            { value: 'off', label: 'Paused', count: rows.filter((a) => !a.active).length },
          ]}
          className="border-b-0"
        />
        <SearchInput value={t.q} onChange={t.setQ} placeholder="Search area or pincode" className="sm:w-72" />
      </div>
      {t.total === 0 ? (
        <Empty icon={<MapPin />} title="Nothing matches" body="Try another area name or pincode." />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <SortTh by="area" label="Area" sort={t.sort} onSort={t.sortBy} />
              <SortTh by="pincode" label="Pincode" sort={t.sort} onSort={t.sortBy} />
              <SortTh by="city" label="City" sort={t.sort} onSort={t.sortBy} />
              <th className={th}>Status</th>
              <th className={cn(th, 'text-right')}>Bookings</th>
            </tr>
          </thead>
          <tbody>
            {t.visible.map((a) => (
              <tr key={a.pincode} className={tr}>
                <td className={cn(td, 'font-bold')}>{a.area}</td>
                <td className={cn(td, 'num')}>{a.pincode}</td>
                <td className={cn(td, 'text-muted')}>{a.city}</td>
                <td className={td}>
                  <Chip tone={a.active ? 'success' : 'neutral'}>{a.active ? 'Taking bookings' : 'Paused'}</Chip>
                </td>
                <td className={cn(td, 'text-right')}>
                  <Toggle
                    checked={a.active}
                    disabled={!editable || busy}
                    label={`Bookings in ${a.area}`}
                    onChange={(v) => void run(() => setAreaActive(a.pincode, v), v ? `${a.area} is taking bookings` : `${a.area} paused`)}
                  />
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

function AreaModal({ onClose }: { onClose: () => void }) {
  const [area, setArea] = useState('')
  const [pincode, setPincode] = useState('')
  const [city, setCity] = useState('Hyderabad')
  const { run, busy, error } = useAction()
  const save = () => void run(() => addArea({ area, pincode, city }), `${area.trim() || 'Area'} added`, onClose)
  return (
    <Modal
      open
      onClose={onClose}
      title="Add service area"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={busy} onClick={save}>
            {busy ? 'Adding…' : 'Add area'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Area">
          <input value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Kokapet" className={cn(inputClass, 'h-10')} autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Pincode">
            <input inputMode="numeric" maxLength={6} value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))} className={cn(inputClass, 'num h-10')} />
          </Field>
          <Field label="City">
            <input value={city} onChange={(e) => setCity(e.target.value)} className={cn(inputClass, 'h-10')} />
          </Field>
        </div>
        <FormError error={error} />
      </div>
    </Modal>
  )
}
