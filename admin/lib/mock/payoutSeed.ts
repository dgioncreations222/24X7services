/**
 * Weekly payouts for the mock, built from the seeded bookings: every
 * completed, paid job goes into its technician's payout for the week
 * (Monday to Sunday) it was done. Last week waits for approval, the week
 * before is half approved, older weeks are paid.
 */
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
  for (let w = 1; w <= 4; w++) {
    const start = thisWeek - w * 7 * DAY
    const end = start + 7 * DAY
    partners
      .filter((p) => p.status === 'active' || p.status === 'suspended')
      .forEach((p, i) => {
        const jobs = bookings.filter((b) => b.technicianId === p.id && b.status === 'completed' && b.payment.status !== 'pending' && b.slotStart >= start && b.slotStart < end)
        if (!jobs.length) return
        const gross = jobs.reduce((s, b) => s + b.price.service - b.price.discount + b.extras.filter((e) => e.status === 'approved').reduce((x, e) => x + e.amount, 0), 0)
        const commission = Math.round((gross * commissionPct) / 100)
        const status: PartnerPayout['status'] = w === 1 ? 'pending' : w === 2 ? (i % 2 ? 'approved' : 'pending') : 'paid'
        payouts.push({
          id: `PO-${ymd(start)}-${p.id.slice(-4)}`,
          partnerId: p.id,
          periodStart: start,
          periodEnd: end - 1,
          gross,
          commission,
          net: gross - commission,
          jobIds: jobs.map((b) => b.id),
          status,
          approvedBy: status !== 'pending' ? 'Meghana Iyer' : undefined,
          approvedAt: status !== 'pending' ? end + DAY : undefined,
          paidAt: status === 'paid' ? end + 2 * DAY : undefined,
          reference: status === 'paid' ? `UTR${String(start).slice(-6)}${p.id.slice(-3)}` : undefined,
        })
      })
  }
  return { payouts }
}
