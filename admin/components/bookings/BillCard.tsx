'use client'

import { Chip } from '@/components/ui'
import { bill, type AdminBooking } from '@/lib/data'
import { cn } from '@/lib/cn'
import { EXTRA_STATUS, PAYMENT_STATUS, rupees, slot } from './status'

/** Extras with the customer's answer, the bill, how it was paid and any refunds. */
export function BillCard({ booking: b }: { booking: AdminBooking }) {
  const m = bill(b)
  const pay = PAYMENT_STATUS[b.payment.status]
  return (
    <div className="space-y-4">
      {b.extras.length > 0 && (
        <ul className="divide-y divide-line rounded-card border border-line">
          {b.extras.map((e) => (
            <li key={e.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span className="min-w-0 flex-1">
                <span className={cn('block font-bold', e.status === 'rejected' && 'text-muted line-through')}>{e.name}</span>
                <span className="block text-xs text-muted">
                  {e.source === 'rate_card' ? 'Rate card' : 'Other — typed by the technician'} · added {slot(e.addedAt)}
                </span>
              </span>
              <span className="num font-bold">{rupees(e.amount)}</span>
              <Chip tone={EXTRA_STATUS[e.status].tone}>{EXTRA_STATUS[e.status].label}</Chip>
            </li>
          ))}
        </ul>
      )}
      <dl className="rounded-card border border-line text-sm">
        <Row label={b.serviceName} value={rupees(m.service)} />
        {m.extras > 0 && <Row label="Approved extras" value={rupees(m.extras)} />}
        {m.discount > 0 && <Row label={`Discount${b.price.coupon ? ` · ${b.price.coupon}` : ''}`} value={`− ${rupees(m.discount)}`} />}
        <div className="flex items-center justify-between border-t border-line px-4 py-3">
          <dt className="font-extrabold">Total</dt>
          <dd className="num text-base font-extrabold">{rupees(m.total)}</dd>
        </div>
        <div className="flex items-center justify-between border-t border-line px-4 py-2.5">
          <dt className="text-muted">
            Payment{b.payment.method ? ` · ${b.payment.method.toUpperCase()}` : ''}
          </dt>
          <dd>
            <Chip tone={pay.tone}>{pay.label}</Chip>
          </dd>
        </div>
      </dl>
      {b.refunds.length > 0 && (
        <ul className="space-y-2">
          {b.refunds.map((r, i) => (
            <li key={i} className="rounded-lg border border-info/25 bg-info-soft px-3 py-2 text-[13px]">
              <span className="num font-bold text-info">Refunded {rupees(r.amount)}</span>
              <span className="text-muted">
                {' '}
                · {slot(r.at)} · {r.by}
              </span>
              <p className="mt-0.5 text-ink-2">{r.reason}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <dt className="min-w-0 text-ink-2">{label}</dt>
      <dd className="num font-semibold">{value}</dd>
    </div>
  )
}
