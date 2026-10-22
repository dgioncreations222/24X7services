/**
 * The customer's side of a job, played by the mock while there is no
 * customer app on the other end: they approve extras a few seconds after
 * they are added, pay a few seconds after the job is completed, and new
 * requests keep arriving so the job flow can be tried again and again.
 *
 * Firebase replaces this with the real customer app writing to the booking.
 */
import { lateRequest } from '../seed'
import { addNotification, displayIdOf, read, split, toPartnerJob, write } from './db'
import type { PartnerJob } from '../data/types'

export const CUSTOMER_DECIDES_MS = 5_000
export const CUSTOMER_PAYS_MS = 4_000
export const NEXT_OFFER_MS = 20_000

function patch(id: string, fn: (j: PartnerJob) => PartnerJob) {
  write((db) => ({ ...db, jobs: db.jobs.map((j) => (j.id === id ? fn(j) : j)) }))
}

/** The customer approves an extra; the bill grows by its amount. */
export function customerReviewsExtra(jobId: string, extraId: string) {
  setTimeout(() => {
    patch(jobId, (j) => {
      const extra = j.extras.find((e) => e.id === extraId)
      if (!extra || extra.status !== 'pending') return j
      const extras = j.extras.map((e) => (e.id === extraId ? { ...e, status: 'approved' as const } : e))
      const stillWaiting = extras.some((e) => e.status === 'pending')
      const amount = j.payment.amount + extra.amount
      return {
        ...j,
        extras,
        status: j.status === 'awaiting_approval' && !stillWaiting ? 'in_progress' : j.status,
        payment: { ...j.payment, amount },
        // The technician's share grows with the bill, at the job's own rate.
        earning: split(amount, j.commissionPct).net,
      }
    })
  }, CUSTOMER_DECIDES_MS)
}

/** The customer pays the bill in their app. */
export function customerPays(jobId: string) {
  setTimeout(() => {
    const job = read().jobs.find((j) => j.id === jobId)
    if (job?.status !== 'completed' || job.payment.status === 'paid') return
    patch(jobId, (j) => ({ ...j, payment: { ...j.payment, status: 'paid' } }))
    addNotification({
      kind: 'payment',
      title: `Payment received · ₹${Math.round(job.payment.amount / 100).toLocaleString('en-IN')}`,
      body: `${job.customer.name} paid for ${job.displayId} in their app.`,
      jobId,
    })
  }, CUSTOMER_PAYS_MS)
}

let queued = false
let counter = 0

/** When the technician is online and no request is waiting, send one more after a short gap. */
export function queueNextOffer() {
  const db = read()
  if (queued || !db.profile.online || db.jobs.some((j) => j.status === 'offered')) return
  queued = true
  setTimeout(() => {
    queued = false
    // They may have gone offline during the gap.
    if (!read().profile.online) return
    const base = toPartnerJob(lateRequest())
    if (!base) return
    counter += 1
    const id = `${base.id}-${counter}`
    const offer: PartnerJob = { ...base, id, displayId: displayIdOf(Number(base.id.replace(/\D/g, '')) + counter), slotStart: Date.now() + 90 * 60_000 }
    write((db) => ({ ...db, jobs: [offer, ...db.jobs] }))
    addNotification({
      kind: offer.priority === 'emergency' ? 'emergency' : 'request',
      title: `New job request · ${offer.distanceKm} km`,
      body: `${offer.service.name}, ${offer.address.area}.`,
      jobId: id,
    })
  }, NEXT_OFFER_MS)
}
