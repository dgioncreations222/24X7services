'use client'

/**
 * Money: every payment and refund on bookings (worked out from the bookings,
 * so it always agrees with them), and the weekly payouts to technicians —
 * approved by finance, then marked paid once the bank transfer goes out.
 */
import { useSyncExternalStore } from 'react'
import { mockRequest } from '../mock/api'
import { read, subscribe, write, type MockDb } from '../mock/db'
import { audit } from './audit'
import { bill } from './bookings'
import { currentAdmin } from './auth'
import { useResource, type Query } from './query'
import type { PartnerPayout, Transaction } from './types'

export class MoneyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MoneyError'
  }
}
const fail = (m: string): never => {
  throw new MoneyError(m)
}
const rs = (p: number) => `₹${Math.round(p / 100).toLocaleString('en-IN')}`

/* ---------------------------------------------------------- Transactions */

export function transactions(db: MockDb): Transaction[] {
  const pct = db.settings.commissionPct
  return db.bookings.flatMap((b) => {
    const m = bill(b)
    const base = { bookingId: b.id, displayId: b.displayId, customerName: b.customer.name, method: b.payment.method }
    const out: Transaction[] = []
    if (b.payment.status === 'paid' || b.payment.status === 'partially_paid' || b.payment.status === 'refunded') {
      out.push({ ...base, id: `${b.id}-pay`, kind: 'payment', amount: m.total, commission: Math.round((m.total * pct) / 100), status: 'success', at: b.payment.paidAt ?? b.slotStart })
    } else if (b.payment.status === 'failed' || b.status === 'failed') {
      out.push({ ...base, id: `${b.id}-pay`, kind: 'payment', amount: m.total, commission: 0, status: 'failed', at: b.createdAt, note: 'Payment failed at checkout' })
    } else if (b.status === 'pending_payment') {
      out.push({ ...base, id: `${b.id}-pay`, kind: 'payment', amount: m.total, commission: 0, status: 'pending', at: b.createdAt, note: 'Waiting for the customer to pay' })
    }
    b.refunds.forEach((r, i) => out.push({ ...base, id: `${b.id}-ref${i}`, kind: 'refund', amount: -r.amount, commission: 0, status: 'success', at: r.at, note: `${r.reason} · ${r.by}` }))
    return out
  })
}

export function useTransactions(): Query<Transaction[]> {
  return useResource((db) => transactions(db).sort((a, b) => b.at - a.at))
}

/* --------------------------------------------------------------- Payouts */

export function usePayouts(): Query<PartnerPayout[]> {
  return useResource((db) => [...db.payouts].sort((a, b) => b.periodStart - a.periodStart || b.net - a.net))
}

const pendingOf = () => read().payouts.filter((p) => p.status === 'pending').length

/** Payouts waiting for approval, for the sidebar badge. */
export function usePendingPayoutCount(): number {
  return useSyncExternalStore(subscribe, pendingOf, () => 0)
}

/**
 * Approve one or more pending payouts. A suspended technician's payout is
 * held: it stays pending until they are reactivated.
 */
export function approvePayouts(ids: string[]) {
  return mockRequest(() => {
    if (!ids.length) fail('Pick at least one payout.')
    const db = read()
    const list = ids.map((id) => db.payouts.find((p) => p.id === id) ?? fail('A payout in the list no longer exists.'))
    if (list.some((p) => p.status !== 'pending')) fail('Only payouts waiting for approval can be approved.')
    const held = list.filter((p) => db.partners.find((x) => x.id === p.partnerId)?.status === 'suspended')
    if (held.length) fail(`${held.length === 1 ? 'One technician is' : `${held.length} technicians are`} suspended — their payout stays on hold until reactivated.`)
    const now = Date.now()
    const by = currentAdmin()?.name ?? 'Admin'
    write((d) => ({ ...d, payouts: d.payouts.map((p) => (ids.includes(p.id) ? { ...p, status: 'approved', approvedBy: by, approvedAt: now } : p)) }))
    for (const p of list) audit('payouts', 'Approved payout', { target: `${db.partners.find((x) => x.id === p.partnerId)?.name ?? p.partnerId} · ${p.id}`, new: rs(p.net) })
    return list.length
  })
}

/** Record that the bank transfer for an approved payout went out. */
export function markPayoutPaid(id: string, reference: string) {
  return mockRequest(() => {
    const p = read().payouts.find((x) => x.id === id) ?? fail('This payout no longer exists.')
    if (p.status !== 'approved') fail('Approve the payout before marking it paid.')
    const ref = reference.trim().toUpperCase()
    if (!/^[A-Z0-9]{6,22}$/.test(ref)) fail('Enter the bank reference (UTR) — 6 to 22 letters or numbers.')
    write((d) => ({ ...d, payouts: d.payouts.map((x) => (x.id === id ? { ...x, status: 'paid', paidAt: Date.now(), reference: ref } : x)) }))
    audit('payouts', 'Marked payout paid', { target: id, new: `${rs(p.net)} · ${ref}` })
  })
}
