'use client'

import type { Route } from 'next'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { Pencil, Plus, TicketPercent } from 'lucide-react'
import { HideButton, SortTh, rupees, useAction } from '@/components/catalog/parts'
import { useTable } from '@/components/catalog/useTable'
import { CouponModal } from '@/components/growth/CouponModal'
import { PlansPanel } from '@/components/growth/PlansPanel'
import { Async, Button, Card, Chip, Empty, Page, PageHeader, Pager, SearchInput, Tabs, TableWrap, td, th, tr } from '@/components/ui'
import { couponState, setCouponActive, useCan, useCategories, useCoupons, type Coupon, type CouponState } from '@/lib/data'
import type { Tone } from '@/lib/status'
import { cn } from '@/lib/cn'

const STATE: Record<CouponState, { label: string; tone: Tone }> = {
  live: { label: 'Live', tone: 'success' },
  scheduled: { label: 'Scheduled', tone: 'info' },
  expired: { label: 'Expired', tone: 'neutral' },
  used_up: { label: 'Used up', tone: 'warning' },
  paused: { label: 'Paused', tone: 'neutral' },
}

export default function CouponsPage() {
  return (
    <Suspense>
      <Coupons />
    </Suspense>
  )
}

/** Coupons and Plus memberships — the Promotions page under its new name. */
function Coupons() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const tab = params.get('tab') === 'plans' ? 'plans' : 'coupons'
  const can = useCan()
  const [editing, setEditing] = useState<Coupon | 'new' | null>(null)
  return (
    <Page>
      <PageHeader
        side="customer"
        title="Coupons & Plus"
        sub="Discount codes customers type at checkout, and the Plus memberships they can buy."
        actions={
          tab === 'coupons' &&
          can('promotions', 'create') && (
            <Button onClick={() => setEditing('new')}>
              <Plus /> New coupon
            </Button>
          )
        }
      />
      <Tabs
        className="mb-5"
        value={tab}
        onChange={(v) => router.replace(`${pathname}${v === 'plans' ? '?tab=plans' : ''}` as Route, { scroll: false })}
        options={[
          { value: 'coupons', label: 'Coupons' },
          { value: 'plans', label: 'Plus plans' },
        ]}
      />
      {tab === 'coupons' ? <CouponList onEdit={setEditing} /> : <PlansPanel />}
      {editing && <CouponModal coupon={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </Page>
  )
}

function CouponList({ onEdit }: { onEdit: (c: Coupon) => void }) {
  const coupons = useCoupons()
  return (
    <Card className="overflow-hidden">
      <Async query={coupons} empty={<Empty icon={<TicketPercent />} title="No coupons yet" />}>
        {(rows) => <CouponTable rows={rows} onEdit={onEdit} />}
      </Async>
    </Card>
  )
}

function CouponTable({ rows, onEdit }: { rows: Coupon[]; onEdit: (c: Coupon) => void }) {
  const can = useCan()
  const categories = useCategories()
  const { run, busy } = useAction()
  const [now] = useState(() => Date.now())
  const t = useTable({
    rows,
    search: (c) => [c.code, c.title],
    filters: { all: () => true, live: (c: Coupon) => couponState(c, now) === 'live', ended: (c: Coupon) => ['expired', 'used_up', 'paused'].includes(couponState(c, now)) },
    sorts: { code: (c: Coupon) => c.code, used: (c: Coupon) => -c.used, till: (c: Coupon) => c.validTill },
    initialSort: 'till',
  })
  const off = (c: Coupon) => (c.kind === 'flat' ? `${rupees(c.value)} off` : `${c.value}% off${c.maxDiscount ? ` up to ${rupees(c.maxDiscount)}` : ''}`)
  const on = (c: Coupon) => (c.categoryIds.length ? c.categoryIds.map((id) => categories.data?.find((x) => x.id === id)?.name ?? id).join(', ') : 'Every category')
  return (
    <>
      <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={t.filter}
          onChange={t.setFilter}
          options={[
            { value: 'all', label: 'All', count: rows.length },
            { value: 'live', label: 'Live now', count: rows.filter((c) => couponState(c, now) === 'live').length },
            { value: 'ended', label: 'Ended or paused', count: rows.filter((c) => ['expired', 'used_up', 'paused'].includes(couponState(c, now))).length },
          ]}
          className="border-b-0"
        />
        <SearchInput value={t.q} onChange={t.setQ} placeholder="Search code or title" className="sm:w-72" />
      </div>
      {t.total === 0 ? (
        <Empty icon={<TicketPercent />} title="Nothing matches" />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <SortTh by="code" label="Code" sort={t.sort} onSort={t.sortBy} />
              <th className={th}>Offer</th>
              <th className={th}>Works on</th>
              <SortTh by="used" label="Used" sort={t.sort} onSort={t.sortBy} />
              <SortTh by="till" label="Valid till" sort={t.sort} onSort={t.sortBy} />
              <th className={th}>Status</th>
              <th className={cn(th, 'text-right')}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {t.visible.map((c) => {
              const s = STATE[couponState(c, now)]
              return (
                <tr key={c.code} className={tr}>
                  <td className={td}>
                    <span className="num block font-extrabold">{c.code}</span>
                    <span className="block text-xs text-muted">{c.title}</span>
                  </td>
                  <td className={cn(td, 'text-[13px]')}>
                    <span className="block font-semibold">{off(c)}</span>
                    {c.minOrder > 0 && <span className="block text-xs text-muted">on orders over {rupees(c.minOrder)}</span>}
                  </td>
                  <td className={cn(td, 'text-[13px] text-muted')}>{on(c)}</td>
                  <td className={cn(td, 'num text-[13px]')}>
                    {c.used.toLocaleString('en-IN')}
                    {c.usageLimit ? <span className="text-muted"> / {c.usageLimit.toLocaleString('en-IN')}</span> : ''}
                  </td>
                  <td className={cn(td, 'text-[13px]')}>{new Date(c.validTill).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td className={td}>
                    <Chip tone={s.tone}>{s.label}</Chip>
                  </td>
                  <td className={cn(td, 'text-right')}>
                    {can('promotions', 'edit') && (
                      <span className="inline-flex gap-1">
                        <Button size="sm" variant="subtle" onClick={() => onEdit(c)}>
                          <Pencil /> Edit
                        </Button>
                        <HideButton active={c.active} disabled={busy} onToggle={() => void run(() => setCouponActive(c.code, !c.active), c.active ? `${c.code} paused` : `${c.code} turned on`)} />
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
