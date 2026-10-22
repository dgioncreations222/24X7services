/** The technician's own side: earnings, payouts, reviews and profile. */
import { mockRequest } from '../mock/api'
import { queueNextOffer } from '../mock/customer'
import { split, write, type MockDb } from '../mock/db'
import { useResource, type Query } from './query'
import type { EarningLine, EarningsSummary, PartnerProfile, PartnerReview, Payout } from './types'

const DAY = 86_400_000

function periodStart(period: EarningsSummary['period'], now: number): number {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  if (period === 'week') d.setDate(d.getDate() - ((d.getDay() + 6) % 7)) // Monday
  if (period === 'month') d.setDate(1)
  return d.getTime()
}

function summarise(db: MockDb, period: EarningsSummary['period']): EarningsSummary {
  const from = periodStart(period, Date.now())
  const lines: EarningLine[] = db.jobs
    .filter((j) => j.status === 'completed')
    .map((j) => {
      const at = j.timeline.find((t) => t.status === 'completed')?.at ?? j.slotStart
      const gross = j.payment.amount
      const { commission, net } = split(gross, j.commissionPct)
      return { jobId: j.id, displayId: j.displayId, serviceName: j.service.name, at, gross, commission, net }
    })
    .filter((l) => l.at >= from && l.at < from + 31 * DAY)
    .sort((a, b) => b.at - a.at)
  const sum = (k: 'gross' | 'commission' | 'net') => lines.reduce((s, l) => s + l[k], 0)
  return { period, jobs: lines.length, gross: sum('gross'), commission: sum('commission'), net: sum('net'), lines }
}

/** Today / this week (from Monday) / this month, with every job's cut. */
export function useEarnings(period: EarningsSummary['period']): Query<EarningsSummary> {
  return useResource((db) => summarise(db, period))
}

/** Weekly payouts, newest first. */
export function usePayouts(): Query<Payout[]> {
  return useResource((db) => [...db.payouts].sort((a, b) => b.periodEnd - a.periodEnd))
}

/** Reviews customers left in their app, newest first. */
export function useReviews(): Query<PartnerReview[]> {
  return useResource((db) => [...db.reviews].sort((a, b) => b.createdAt - a.createdAt))
}

export interface RatingSummary {
  average: number
  count: number
  /** Ratings with 5, 4, 3, 2 and 1 stars, in that order. */
  byStars: [number, number, number, number, number]
}

export function useRatingSummary(): Query<RatingSummary> {
  return useResource((db) => ({ average: db.profile.rating, count: db.profile.ratingCount, byStars: db.ratingBreakdown }))
}

export function useProfile(): Query<PartnerProfile> {
  return useResource((db) => db.profile)
}

/**
 * The Home toggle: online gets new requests, offline does not. Going offline
 * hands any open request back to dispatch; jobs already accepted stay.
 */
export async function setOnline(online: boolean) {
  await mockRequest(() =>
    write((db) => ({
      ...db,
      profile: { ...db.profile, online },
      jobs: online ? db.jobs : db.jobs.filter((j) => j.status !== 'offered'),
    }))
  )
  if (online) queueNextOffer()
}
