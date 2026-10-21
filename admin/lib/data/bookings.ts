'use client'

/**
 * Bookings and dispatch: the list, one booking, who could take it, and what
 * support does — assign or reassign a technician, cancel, refund. Payment
 * itself happens in the customer app; the console only records refunds.
 */
import { useSyncExternalStore } from 'react'
import { mockRequest } from '../mock/api'
import { read, subscribe, write } from '../mock/db'
import { currentAdmin } from './auth'
import { audit } from './audit'
import { useResource, type Query } from './query'
import type { AdminBooking, BookingStatus, GeoPoint, Partner, Paise } from './types'

export class BookingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BookingError'
  }
}

/** A technician is on the way or working. */
export const LIVE_STATUSES: readonly BookingStatus[] = ['assigned', 'en_route', 'arrived', 'in_progress', 'awaiting_approval']
/** Still to happen or happening — support can cancel these. */
export const OPEN_STATUSES: readonly BookingStatus[] = ['pending_payment', 'confirmed', ...LIVE_STATUSES]

export function useBookings(): Query<AdminBooking[]> {
  return useResource((db) => db.bookings)
}

export function useBooking(id: string | null | undefined): Query<AdminBooking | null> {
  return useResource((db) => db.bookings.find((b) => b.id === id) ?? null)
}

const unassignedOf = () => read().bookings.filter((b) => b.status === 'confirmed').length
const emergencyOf = () => read().bookings.filter((b) => b.status === 'confirmed' && (b.priority === 'emergency' || b.dispatch.noTechFound)).length

/** Bookings waiting for a technician, for the sidebar badge. */
export function useUnassignedCount(): number {
  return useSyncExternalStore(subscribe, unassignedOf, () => 0)
}

/** Emergencies and no-technician-found jobs waiting, for the Live Dispatch badge. */
export function useUrgentDispatchCount(): number {
  return useSyncExternalStore(subscribe, emergencyOf, () => 0)
}

/** What the bill comes to, from the booking alone. */
export function bill(b: AdminBooking) {
  const extras = b.extras.filter((e) => e.status === 'approved').reduce((s, e) => s + e.amount, 0)
  const total = Math.max(0, b.price.service + extras - b.price.discount)
  const refunded = b.refunds.reduce((s, r) => s + r.amount, 0)
  const paid = b.payment.status === 'paid' || b.payment.status === 'partially_paid' || b.payment.status === 'refunded' ? total : 0
  return { service: b.price.service, extras, discount: b.price.discount, total, paid, refunded, refundable: Math.max(0, paid - refunded) }
}

/* -------------------------------------------------------------- Dispatch */

/** Straight-line km; good enough to rank who is nearest. */
export function km(a: GeoPoint, b: GeoPoint): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}

export interface Candidate {
  partner: Partner
  /** Road-ish km: straight line × 1.25. */
  distanceKm: number
  etaMin: number
  /** On a live job right now. */
  busy: boolean
  /** Jobs already assigned and not started. */
  queued: number
  /** Said no to this booking already. */
  declined: boolean
}

/**
 * Who could take this booking: active, approved for its category. Online and
 * free first, then nearest; anyone who already declined it goes last.
 */
export function useCandidates(bookingId: string | null): Query<Candidate[]> {
  return useResource((db) => {
    const b = db.bookings.find((x) => x.id === bookingId)
    if (!b) return []
    return db.partners
      .filter((p) => p.status === 'active' && p.skills.includes(b.categoryId) && p.id !== b.technicianId)
      .map((p) => {
        const mine = db.bookings.filter((x) => x.technicianId === p.id && x.id !== b.id)
        const distanceKm = Math.round(km(p.geo, b.geo) * 1.25 * 10) / 10
        return {
          partner: p,
          distanceKm,
          etaMin: Math.round(distanceKm * 3.9 + 6),
          busy: mine.some((x) => LIVE_STATUSES.includes(x.status) && x.status !== 'assigned'),
          queued: mine.filter((x) => x.status === 'assigned').length,
          declined: b.dispatch.declinedBy.includes(p.id),
        }
      })
      .sort(
        (x, y) =>
          Number(x.declined) - Number(y.declined) ||
          Number(!x.partner.online) - Number(!y.partner.online) ||
          Number(x.busy) - Number(y.busy) ||
          x.distanceKm - y.distanceKm
      )
  })
}

/* --------------------------------------------------------------- Actions */

const who = () => currentAdmin()?.name ?? 'Admin'

function booking(id: string) {
  const b = read().bookings.find((x) => x.id === id)
  if (!b) throw new BookingError('This booking no longer exists.')
  return b
}

function patch(id: string, fn: (b: AdminBooking) => AdminBooking) {
  write((d) => ({ ...d, bookings: d.bookings.map((b) => (b.id === id ? fn(b) : b)) }))
}

/**
 * Give an unassigned booking to a technician, or move an assigned one that
 * has not started to someone else.
 */
export function assignTechnician(bookingId: string, partnerId: string) {
  return mockRequest(() => {
    const b = booking(bookingId)
    if (b.status !== 'confirmed' && b.status !== 'assigned') throw new BookingError('Only a booking that has not started can be assigned.')
    const p = read().partners.find((x) => x.id === partnerId)
    if (!p || p.status !== 'active') throw new BookingError('This technician is not active, so they cannot take jobs.')
    if (!p.skills.includes(b.categoryId)) throw new BookingError(`${p.name} is not approved for this category.`)
    if (p.id === b.technicianId) throw new BookingError(`${p.name} already has this job.`)
    const reassigning = b.status === 'assigned'
    patch(bookingId, (x) => ({
      ...x,
      status: 'assigned',
      technicianId: p.id,
      dispatch: { ...x.dispatch, noTechFound: false },
      timeline: [...x.timeline, { status: 'assigned', at: Date.now(), by: who(), note: `${reassigning ? 'Reassigned' : 'Assigned'} to ${p.name}` }],
    }))
    audit('dispatch', reassigning ? 'Reassigned booking' : 'Assigned booking', { target: b.displayId, new: p.name })
    return p
  })
}

/** Cancel on the customer's or the network's behalf. Refunds are a separate step. */
export function cancelBooking(bookingId: string, reason: string) {
  return mockRequest(() => {
    const b = booking(bookingId)
    if (!OPEN_STATUSES.includes(b.status)) throw new BookingError('This booking is already finished or cancelled.')
    const r = reason.trim()
    if (r.length < 10) throw new BookingError('Say why it is cancelled — the customer and technician see this. At least 10 characters.')
    const now = Date.now()
    patch(bookingId, (x) => ({
      ...x,
      status: 'cancelled',
      cancellation: { at: now, by: 'support', reason: r },
      timeline: [...x.timeline, { status: 'cancelled', at: now, by: who(), note: r }],
    }))
    audit('bookings', 'Cancelled booking', { target: b.displayId, old: b.status, new: r })
  })
}

/**
 * Give money back. On a cancelled booking a full refund closes it as
 * Refunded; on a completed one it is a goodwill refund and it stays Completed.
 */
export function refundBooking(bookingId: string, amount: Paise, reason: string) {
  return mockRequest(() => {
    const b = booking(bookingId)
    if (b.status !== 'cancelled' && b.status !== 'completed') throw new BookingError('Refunds are for cancelled or completed bookings.')
    const { refundable } = bill(b)
    if (refundable <= 0) throw new BookingError('Nothing was paid on this booking, or it is already refunded.')
    if (!Number.isFinite(amount) || amount <= 0) throw new BookingError('Enter an amount above ₹0.')
    if (amount > refundable) throw new BookingError(`At most ₹${Math.round(refundable / 100).toLocaleString('en-IN')} can be refunded.`)
    const r = reason.trim()
    if (r.length < 10) throw new BookingError('Say why — this goes on the customer’s receipt. At least 10 characters.')
    const now = Date.now()
    const full = amount === refundable
    patch(bookingId, (x) => ({
      ...x,
      status: x.status === 'cancelled' && full ? 'refunded' : x.status,
      payment: { ...x.payment, status: full ? 'refunded' : 'partially_paid' },
      refunds: [...x.refunds, { amount: Math.round(amount), reason: r, at: now, by: who() }],
      timeline: x.status === 'cancelled' && full ? [...x.timeline, { status: 'refunded', at: now, by: who(), note: r }] : x.timeline,
    }))
    audit('payments', 'Refunded', { target: b.displayId, new: `₹${Math.round(amount / 100).toLocaleString('en-IN')} — ${r}` })
  })
}
