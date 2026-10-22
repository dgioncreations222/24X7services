'use client'

/** Customers: the list with what each has booked and spent, one customer, block and unblock. */
import { mockRequest } from '../mock/api'
import { read, write, type MockDb } from '../mock/db'
import { bill } from '../money'
import { audit } from './audit'
import {assertCan, guarded } from './permissions'
import { useResource, type Query } from './query'
import type { AdminBooking, AdminCustomer, Paise } from './types'

export class CustomerError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CustomerError'
  }
}

/** A customer with their booking numbers worked out. */
export interface CustomerRow extends AdminCustomer {
  bookings: number
  completed: number
  cancelled: number
  /** What they paid for completed jobs, after refunds. */
  spent: Paise
  lastBookingAt?: number
}

function rows(db: MockDb): CustomerRow[] {
  const mine = new Map<string, AdminBooking[]>()
  for (const b of db.bookings) mine.set(b.customer.id, [...(mine.get(b.customer.id) ?? []), b])
  return db.customers.map((c) => {
    const list = mine.get(c.id) ?? []
    const done = list.filter((b) => b.status === 'completed')
    return {
      ...c,
      bookings: list.length,
      completed: done.length,
      cancelled: list.filter((b) => b.status === 'cancelled' || b.status === 'refunded').length,
      spent: done.reduce((s, b) => {
        const m = bill(b)
        return s + m.paid - m.refunded
      }, 0),
      lastBookingAt: list.length ? Math.max(...list.map((b) => b.slotStart)) : undefined,
    }
  })
}

export function useCustomers(): Query<CustomerRow[]> {
  return useResource(rows)
}

export function useCustomer(id: string | null | undefined): Query<CustomerRow | null> {
  return useResource((db) => rows(db).find((c) => c.id === id) ?? null)
}

/** Their bookings, newest first. */
export function useCustomerBookings(id: string | null | undefined): Query<AdminBooking[]> {
  return useResource((db) => db.bookings.filter((b) => b.customer.id === id).sort((a, b) => b.slotStart - a.slotStart))
}

/** Stop a customer booking; their open bookings are left for support to handle. */
export function blockCustomer(id: string, reason: string) {
  return guarded([['customers', 'edit']], () => {
    const c = read().customers.find((x) => x.id === id)
    if (!c) throw new CustomerError('This customer no longer exists.')
    if (c.status === 'blocked') throw new CustomerError('Already blocked.')
    const r = reason.trim()
    if (r.length < 10) throw new CustomerError('Say why — the next admin reads this. At least 10 characters.')
    write((d) => ({ ...d, customers: d.customers.map((x) => (x.id === id ? { ...x, status: 'blocked', blockReason: r } : x)) }))
    audit('customers', 'Blocked customer', { target: c.name, new: r })
  })
}

export function unblockCustomer(id: string) {
  return guarded([['customers', 'edit']], () => {
    const c = read().customers.find((x) => x.id === id)
    if (!c || c.status !== 'blocked') throw new CustomerError('Only a blocked customer can be unblocked.')
    write((d) => ({ ...d, customers: d.customers.map((x) => (x.id === id ? { ...x, status: 'active', blockReason: undefined } : x)) }))
    audit('customers', 'Unblocked customer', { target: c.name, old: 'Blocked', new: 'Active' })
  })
}

/** Goodwill credit one admin can give without a Super Admin, in paise. */
export const WALLET_CREDIT_LIMIT = 100_000

/**
 * Goodwill credit into the customer's wallet, used on their next booking —
 * with a reason for the next admin. Up to ₹1,000 at a time; more needs a
 * Super Admin.
 */
export function addWalletCredit(id: string, amount: Paise, reason: string) {
  return mockRequest(() => {
    const me = assertCan('customers', 'edit')
    const c = read().customers.find((x) => x.id === id)
    if (!c) throw new CustomerError('This customer no longer exists.')
    if (c.status === 'blocked') throw new CustomerError('Unblock them before giving credit.')
    if (!Number.isInteger(amount) || amount <= 0) throw new CustomerError('Pick an amount.')
    if (amount > WALLET_CREDIT_LIMIT && me.role !== 'Super Admin') throw new CustomerError('Above ₹1,000 needs a Super Admin.')
    const r = reason.trim()
    if (r.length < 10) throw new CustomerError('Say why — the next admin reads this. At least 10 characters.')
    write((d) => ({ ...d, customers: d.customers.map((x) => (x.id === id ? { ...x, walletCredit: x.walletCredit + amount } : x)) }))
    audit('customers', 'Added wallet credit', { target: c.name, old: `₹${c.walletCredit / 100}`, new: `+₹${amount / 100} — ${r}` })
  })
}
