/**
 * The money sums, in one place, with nothing but bookings in and numbers out
 * — shared by the data layer and the mock seed, so a payout, a report and a
 * booking's bill can never disagree.
 *
 * The rules (UC-style):
 * - The platform takes its percent of the whole bill, parts and extras
 *   included, at the rate fixed on the booking when it completed.
 * - Refunds come off before the commission is worked out.
 * - Cash the technician collected is already theirs, so it comes off their
 *   payout. If that leaves them owing, the balance moves to next week.
 */
import type { AdminBooking, Paise } from './data/types'

/** ₹1,234 from paise — whole rupees, Indian grouping, "− " in front of a negative. */
export const rupees = (paise: number) => `${paise < 0 ? '− ' : ''}₹${Math.round(Math.abs(paise) / 100).toLocaleString('en-IN')}`

/** What the bill comes to, from the booking alone. */
export function bill(b: AdminBooking) {
  const extras = b.extras.filter((e) => e.status === 'approved').reduce((s, e) => s + e.amount, 0)
  const total = Math.max(0, b.price.service + extras - b.price.discount)
  const refunded = b.refunds.reduce((s, r) => s + r.amount, 0)
  const s = b.payment.status
  // Paid in full (whatever was refunded after), or only the part that came in.
  const paid = s === 'paid' || s === 'partially_refunded' || s === 'refunded' ? total : s === 'partially_paid' ? Math.min(total, b.payment.paidAmount ?? 0) : 0
  return { service: b.price.service, extras, discount: b.price.discount, total, paid, refunded, refundable: Math.max(0, paid - refunded) }
}

/** The platform's percent of `amount`, rounded to the paisa. */
export const commissionOn = (amount: Paise, pct: number) => Math.round((amount * pct) / 100)

/**
 * One completed job's money. Unpaid jobs earn nothing yet (they join the
 * week they are paid in); a fully refunded job earns nothing, but cash the
 * technician took still counts against them.
 */
export function jobMoney(b: AdminBooking, fallbackPct: number) {
  const m = bill(b)
  const pct = b.commissionPct ?? fallbackPct
  const net = Math.max(0, m.paid - m.refunded)
  const commission = commissionOn(net, pct)
  return {
    gross: m.paid,
    refunds: m.refunded,
    commission,
    /** What the technician earns from the job. */
    share: net - commission,
    /** What they collected in cash and kept. */
    cash: b.payment.method === 'cash' ? m.paid : 0,
  }
}

/**
 * A job that belongs in a payout: completed and paid in full (refunds or
 * not). A part-paid job waits for the rest, so it is settled once, whole.
 */
export const payable = (b: AdminBooking) => {
  const m = bill(b)
  return b.status === 'completed' && m.paid > 0 && m.paid >= m.total
}

/**
 * One technician's week: the jobs, the sums, and what is left to pay after
 * their cash and last week's balance.
 */
export function settleWeek(jobs: AdminBooking[], fallbackPct: number, carriedIn: Paise) {
  const sums = jobs.map((b) => jobMoney(b, fallbackPct))
  const add = (k: 'gross' | 'refunds' | 'commission' | 'share' | 'cash') => sums.reduce((s, x) => s + x[k], 0)
  const share = add('share')
  const cashHeld = add('cash')
  return {
    gross: add('gross'),
    refunds: add('refunds'),
    commission: add('commission'),
    cashHeld,
    carriedIn,
    net: share - cashHeld + carriedIn,
    jobIds: jobs.map((b) => b.id),
  }
}
