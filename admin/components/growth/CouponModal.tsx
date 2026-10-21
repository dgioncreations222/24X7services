'use client'

import { useState } from 'react'
import { PriceInput } from '@/components/catalog/fields'
import { FormError, useAction } from '@/components/catalog/parts'
import { Button, Field, Modal, Segmented, inputClass } from '@/components/ui'
import { saveCoupon, useCategories, type Coupon } from '@/lib/data'
import { cn } from '@/lib/cn'

const DAY = 86_400_000
/** epoch ms ⇄ the yyyy-mm-dd a date input speaks, in local time. */
export const toDay = (ms: number) => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export const fromDay = (s: string, endOfDay = false) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y!, m! - 1, d!, endOfDay ? 23 : 0, endOfDay ? 59 : 0).getTime()
}

/** Add or edit a coupon: what it takes off, when, on what and how often. */
export function CouponModal({ coupon, onClose }: { coupon: Coupon | null; onClose: () => void }) {
  const categories = useCategories()
  const [now] = useState(() => Date.now())
  const [f, setF] = useState({
    code: coupon?.code ?? '',
    title: coupon?.title ?? '',
    kind: coupon?.kind ?? ('flat' as Coupon['kind']),
    value: coupon?.value ?? 0,
    minOrder: coupon?.minOrder ?? 0,
    maxDiscount: coupon?.maxDiscount ?? 0,
    categoryIds: coupon?.categoryIds ?? [],
    from: toDay(coupon?.validFrom ?? now),
    till: toDay(coupon?.validTill ?? now + 30 * DAY),
    usageLimit: coupon?.usageLimit ? String(coupon.usageLimit) : '',
  })
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }))
  const { run, busy, error } = useAction()
  const save = () =>
    void run(
      () =>
        saveCoupon(
          {
            code: f.code,
            title: f.title,
            kind: f.kind,
            value: f.value,
            minOrder: f.minOrder,
            maxDiscount: f.kind === 'percent' ? f.maxDiscount || undefined : f.value,
            categoryIds: f.categoryIds,
            validFrom: fromDay(f.from),
            validTill: fromDay(f.till, true),
            usageLimit: f.usageLimit ? Number(f.usageLimit) : undefined,
            perCustomerLimit: 1,
            active: coupon?.active ?? true,
          },
          !coupon
        ),
      coupon ? 'Coupon saved' : 'Coupon added',
      onClose
    )
  return (
    <Modal
      open
      onClose={onClose}
      title={coupon ? `Edit ${coupon.code}` : 'New coupon'}
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
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Code">
          <input value={f.code} disabled={!!coupon} onChange={(e) => set('code', e.target.value.toUpperCase().replace(/\s/g, ''))} placeholder="DIWALI100" className={cn(inputClass, 'num h-10 uppercase')} />
        </Field>
        <Field label="Title">
          <input value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="Diwali offer" className={cn(inputClass, 'h-10')} />
        </Field>
        <Field label="Takes off" className="sm:col-span-2">
          <div className="flex flex-wrap items-center gap-3">
            <Segmented
              value={f.kind}
              onChange={(v) => setF((s) => ({ ...s, kind: v, value: 0 }))}
              options={[
                { value: 'flat', label: '₹ off' },
                { value: 'percent', label: '% off' },
              ]}
            />
            {f.kind === 'flat' ? (
              <div className="w-36">
                <PriceInput key="flat" label="Rupees off" value={f.value} onChange={(v) => set('value', v)} />
              </div>
            ) : (
              <div className="relative w-28">
                <input inputMode="numeric" value={f.value || ''} onChange={(e) => set('value', Number(e.target.value.replace(/\D/g, '')))} className={cn(inputClass, 'num h-10 pr-8')} aria-label="Percent off" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted">%</span>
              </div>
            )}
          </div>
        </Field>
        <Field label="Minimum order">
          <PriceInput label="Minimum order in rupees" value={f.minOrder} onChange={(v) => set('minOrder', v)} />
        </Field>
        {f.kind === 'percent' && (
          <Field label="Maximum discount">
            <PriceInput label="Maximum discount in rupees" value={f.maxDiscount} onChange={(v) => set('maxDiscount', v)} />
          </Field>
        )}
        <Field label="Starts">
          <input type="date" value={f.from} onChange={(e) => set('from', e.target.value)} className={cn(inputClass, 'h-10')} />
        </Field>
        <Field label="Ends">
          <input type="date" value={f.till} onChange={(e) => set('till', e.target.value)} className={cn(inputClass, 'h-10')} />
        </Field>
        <Field label="Total uses" hint="Leave empty for no limit. One use per customer.">
          <input inputMode="numeric" value={f.usageLimit} onChange={(e) => set('usageLimit', e.target.value.replace(/\D/g, ''))} className={cn(inputClass, 'num h-10')} />
        </Field>
        <Field label="Works on" className="sm:col-span-2" hint="Pick none for every category.">
          <div className="flex flex-wrap gap-1.5">
            {categories.data?.map((c) => {
              const on = f.categoryIds.includes(c.id)
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => set('categoryIds', on ? f.categoryIds.filter((x) => x !== c.id) : [...f.categoryIds, c.id])}
                  className={cn('h-8 rounded-lg border px-2.5 text-[13px] font-bold', on ? 'border-brand/30 bg-brand-soft text-brand' : 'border-line text-muted hover:border-line-strong')}
                >
                  {c.name}
                </button>
              )
            })}
          </div>
        </Field>
        <div className="sm:col-span-2">
          <FormError error={error} />
        </div>
      </div>
    </Modal>
  )
}
