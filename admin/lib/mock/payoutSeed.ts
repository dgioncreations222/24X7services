/**
 * Weekly payouts for the mock, built from the seeded bookings the way the
 * weekly payout job will build them: every completed, paid job goes into its
 * technician's payout for the week (Monday to Sunday) it was paid in full, with
 * refunds and the cash they collected taken off, and a negative week carried
 * into the next. Last week waits for approval, the week before is half
 * approved, older weeks are paid. A suspended or inactive technician's
 * unapproved payout is on hold.
 *
 * TODO(backend): a scheduled Cloud Function runs settleWeek every Monday.
 */
import { payable, payoutAt, settleWeek } from '../money'
import type { AdminBooking, Partner, PartnerPayout } from '../data/types'

const DAY = 86_400_000

/** 20261012 — the local date, which is the week the payout is for. */
const ymd = (t: number) => {
  const d = new Date(t)
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
}

const monday = (t: number) => {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d.getTime()
}

export function seedPayouts(bookings: AdminBooking[], partners: Partner[], commissionPct: number, now = Date.now()): { payouts: PartnerPayout[] } {
  const thisWeek = monday(now)
  const payouts: PartnerPayout[] = []
  partners
    .filter((p) => p.status === 'active' || p.status === 'suspended' || p.status === 'inactive')
    .forEach((p, i) => {
      let carry = 0
      // Oldest week first, so each week's balance can carry into the next.
      for (let w = 4; w >= 1; w--) {
        const start = thisWeek - w * 7 * DAY
        const end = start + 7 * DAY
        // By the day the job was paid in full, so a late payment lands in an open week.
        const jobs = bookings.filter((b) => b.technicianId === p.id && payable(b) && payoutAt(b) >= start && payoutAt(b) < end)
        if (!jobs.length && !carry) continue
        const week = settleWeek(jobs, commissionPct, carry)
        const away = p.status !== 'active'
        let status: PartnerPayout['status'] = w === 1 ? 'pending' : w === 2 ? (i % 2 ? 'approved' : 'pending') : 'paid'
        if (week.net <= 0) status = 'carried_forward'
        else if (away && status !== 'paid') status = 'on_hold'
        carry = week.net <= 0 ? week.net : 0
        const approved = status === 'approved' || status === 'paid'
        payouts.push({
          id: `PO-${ymd(start)}-${p.id.slice(-4)}`,
          partnerId: p.id,
          periodStart: start,
          periodEnd: end - 1,
          ...week,
          status,
          approvedBy: approved ? 'Meghana Iyer' : undefined,
          approvedById: approved ? 'ADM-04' : undefined,
          approvedAt: approved ? end + DAY : undefined,
          paidBy: status === 'paid' ? 'Aditi Rao' : undefined,
          paidById: status === 'paid' ? 'ADM-01' : undefined,
          paidAt: status === 'paid' ? end + 2 * DAY : undefined,
          reference: status === 'paid' ? `UTR${String(start).slice(-6)}${p.id.slice(-3)}` : undefined,
        })
      }
    })
  return { payouts }
}
