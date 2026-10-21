'use client'

/**
 * Money: every payment and refund on bookings (worked out from the bookings,
 * so it always agrees with them), the cash technicians are holding, and the
 * weekly payouts — approved by one admin, marked paid by another once the
 * bank transfer goes out. The sums themselves live in lib/money.
 */
import { useSyncExternalStore } from 'react'
import { bill, commissionOn, jobMoney, payable } from '../money'
import { mockRequest } from '../mock/api'
import { read, subscribe, write, type MockDb } from '../mock/db'
import { audit } from './audit'
import { assertCan } from './permissions'
import { useResource, type Query } from './query'
import type { Paise, PartnerPayout, Transaction } from './types'

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

/**
 * Every payment and refund. Commission is at each booking's own rate (the
 * one fixed when it completed), and a refund takes its share of commission
 * back, so the column adds up to what the platform actually kept.
 */
export function transactions(db: MockDb): Transaction[] {
  return db.bookings.flatMap((b) => {
    const m = bill(b)
    const pct = b.commissionPct ?? db.settings.commissionPct
    const base = { bookingId: b.id, displayId: b.displayId, customerName: b.customer.name, method: b.payment.method }
    const out: Transaction[] = []
    if (m.paid > 0) {
      out.push({ ...base, id: `${b.id}-pay`, kind: 'payment', amount: m.total, commission: b.status === 'completed' ? commissionOn(m.total, pct) : 0, status: 'success', at: b.payment.paidAt ?? b.slotStart })
    } else if (b.payment.status === 'failed' || b.status === 'failed') {
      out.push({ ...base, id: `${b.id}-pay`, kind: 'payment', amount: m.total, commission: 0, status: 'failed', at: b.createdAt, note: 'Payment failed at checkout' })
    } else if (b.status === 'pending_payment') {
      out.push({ ...base, id: `${b.id}-pay`, kind: 'payment', amount: m.total, commission: 0, status: 'pending', at: b.createdAt, note: 'Waiting for the customer to pay' })
    }
    b.refunds.forEach((r, i) =>
      out.push({ ...base, id: `${b.id}-ref${i}`, kind: 'refund', amount: -r.amount, commission: b.status === 'completed' ? -commissionOn(r.amount, pct) : 0, status: 'success', at: r.at, note: `${r.reason} · ${r.by}` })
    )
    return out
  })
}

// Worked out once per snapshot, not on every render of every page reading it.
let txCache: { db: MockDb; list: Transaction[] } | null = null
function sortedTransactions(db: MockDb) {
  if (txCache?.db !== db) txCache = { db, list: transactions(db).sort((a, b) => b.at - a.at) }
  return txCache.list
}

export function useTransactions(): Query<Transaction[]> {
  return useResource(sortedTransactions)
}

/* ------------------------------------------------------------- Cash held */

/**
 * Cash each technician has collected on paid, completed jobs that no paid
 * payout has settled yet — what they are holding that belongs partly to the
 * platform. Keyed by technician id.
 */
export function cashHeld(db: MockDb): Record<string, Paise> {
  const settled = new Set(db.payouts.filter((p) => p.status === 'paid').flatMap((p) => p.jobIds))
  const out: Record<string, Paise> = {}
  for (const b of db.bookings) {
    if (!b.technicianId || !payable(b) || settled.has(b.id)) continue
    const cash = jobMoney(b, db.settings.commissionPct).cash
    if (cash) out[b.technicianId] = (out[b.technicianId] ?? 0) + cash
  }
  return out
}

let cashCache: { db: MockDb; map: Record<string, Paise> } | null = null
export function useCashHeld(): Query<Record<string, Paise>> {
  return useResource((db) => {
    if (cashCache?.db !== db) cashCache = { db, map: cashHeld(db) }
    return cashCache.map
  })
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
 * Approve one or more pending payouts. On-hold payouts (suspended or
 * inactive technician) and weeks with nothing to pay cannot be approved.
 */
export function approvePayouts(ids: string[]) {
  return mockRequest(() => {
    const me = assertCan('payouts', 'approve')
    const unique = [...new Set(ids)]
    if (!unique.length) fail('Pick at least one payout.')
    const db = read()
    const list = unique.map((id) => db.payouts.find((p) => p.id === id) ?? fail('A payout in the list no longer exists.'))
    if (list.some((p) => p.status === 'on_hold')) fail('A payout on hold cannot be approved — reactivate the technician first.')
    if (list.some((p) => p.status !== 'pending')) fail('Only payouts waiting for approval can be approved.')
    const away = list.filter((p) => db.partners.find((x) => x.id === p.partnerId)?.status !== 'active')
    if (away.length) fail(`${away.length === 1 ? 'One technician is' : `${away.length} technicians are`} not active — their payout stays on hold.`)
    if (list.some((p) => p.net <= 0)) fail('A week with nothing to pay carries forward; it is not approved.')
    const now = Date.now()
    write((d) => ({ ...d, payouts: d.payouts.map((p) => (unique.includes(p.id) ? { ...p, status: 'approved', approvedBy: me.name, approvedById: me.id, approvedAt: now } : p)) }))
    for (const p of list) audit('payouts', 'Approved payout', { target: `${db.partners.find((x) => x.id === p.partnerId)?.name ?? p.partnerId} · ${p.id}`, new: rs(p.net) })
    return list.length
  })
}

/**
 * Record that the bank transfer for an approved payout went out. Maker-checker:
 * the admin who approved it cannot also mark it paid (Super Admin excepted),
 * and a bank reference is used once.
 */
export function markPayoutPaid(id: string, reference: string) {
  return mockRequest(() => {
    const me = assertCan('payouts', 'approve')
    const db = read()
    const p = db.payouts.find((x) => x.id === id) ?? fail('This payout no longer exists.')
    if (p.status !== 'approved') fail('Approve the payout before marking it paid.')
    if (p.approvedById === me.id && me.role !== 'Super Admin') fail('You approved this payout, so another admin has to mark it paid.')
    const ref = reference.trim().toUpperCase()
    if (!/^[A-Z0-9]{6,22}$/.test(ref)) fail('Enter the bank reference (UTR) — 6 to 22 letters or numbers.')
    const used = db.payouts.find((x) => x.id !== id && x.reference === ref)
    if (used) fail(`This bank reference is already on payout ${used.id}.`)
    write((d) => ({ ...d, payouts: d.payouts.map((x) => (x.id === id ? { ...x, status: 'paid', paidAt: Date.now(), paidBy: me.name, paidById: me.id, reference: ref } : x)) }))
    audit('payouts', 'Marked payout paid', { target: id, new: `${rs(p.net)} · ${ref}` })
  })
}
