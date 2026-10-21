'use client'

/**
 * The dashboard's numbers, worked out from bookings and technicians in one
 * place so every tile agrees with the pages it links to.
 */
import type { MockDb } from '../mock/db'
import { LIVE_STATUSES, bill } from './bookings'
import { useResource, type Query } from './query'
import type { AdminBooking, Paise } from './types'

const DAY = 86_400_000

export interface DashboardData {
  today: { bookings: number; revenue: Paise; completed: number }
  yesterday: { bookings: number; revenue: Paise }
  live: number
  unassigned: number
  urgent: number
  techs: { online: number; onJob: number; active: number }
  /** Last 14 days by service date, oldest first. */
  days: { label: string; bookings: number; revenue: Paise }[]
  /** Revenue from completed jobs per category, last 30 days. */
  byCategory: { id: string; name: string; revenue: Paise; jobs: number }[]
  topTechs: { id: string; name: string; revenue: Paise; jobs: number; rating: number }[]
  attention: { id: string; tone: 'danger' | 'warning'; title: string; body: string; href: string }[]
  upcoming: AdminBooking[]
}

const dayStart = (t: number) => new Date(new Date(t).setHours(0, 0, 0, 0)).getTime()
const revenue = (list: AdminBooking[]) => list.filter((b) => b.status === 'completed').reduce((s, b) => s + bill(b).total, 0)

export function summarise(db: MockDb, now = Date.now()): DashboardData {
  const today0 = dayStart(now)
  const on = (from: number) => db.bookings.filter((b) => b.slotStart >= from && b.slotStart < from + DAY)
  const t = on(today0)
  const y = on(today0 - DAY)
  const last30 = db.bookings.filter((b) => b.status === 'completed' && b.slotStart >= today0 - 29 * DAY && b.slotStart < today0 + DAY)
  const unassigned = db.bookings.filter((b) => b.status === 'confirmed')
  const active = db.partners.filter((p) => p.status === 'active')

  const days = Array.from({ length: 14 }, (_, i) => {
    const from = today0 - (13 - i) * DAY
    const list = on(from)
    return {
      label: i === 13 ? 'Today' : new Date(from).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      bookings: list.filter((b) => b.status !== 'pending_payment' && b.status !== 'failed').length,
      revenue: revenue(list),
    }
  })

  const byCategory = db.categories
    .map((c) => {
      const list = last30.filter((b) => b.categoryId === c.id)
      return { id: c.id, name: c.name, revenue: revenue(list), jobs: list.length }
    })
    .sort((a, b) => b.revenue - a.revenue)

  const topTechs = active
    .map((p) => {
      const list = last30.filter((b) => b.technicianId === p.id)
      return { id: p.id, name: p.name, revenue: revenue(list), jobs: list.length, rating: p.rating }
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  const attention: DashboardData['attention'] = [
    ...unassigned
      .filter((b) => b.dispatch.noTechFound)
      .map((b) => ({ id: `nt-${b.id}`, tone: 'danger' as const, title: 'No technician found', body: `${b.displayId} · ${b.serviceName}, ${b.area}`, href: `/dispatch?id=${b.id}` })),
    ...unassigned
      .filter((b) => b.priority === 'emergency' && !b.dispatch.noTechFound)
      .map((b) => ({ id: `em-${b.id}`, tone: 'danger' as const, title: 'Emergency waiting for a technician', body: `${b.displayId} · ${b.area}`, href: `/dispatch?id=${b.id}` })),
    ...db.bookings
      .filter((b) => b.status === 'awaiting_approval')
      .map((b) => ({ id: `ex-${b.id}`, tone: 'warning' as const, title: 'Customer has not approved an extra', body: `${b.displayId} · ${b.extras.find((e) => e.status === 'pending')?.name ?? 'Extra'}`, href: `/bookings?id=${b.id}` })),
    ...db.partners
      .filter((p) => p.status === 'kyc_pending')
      .map((p) => ({ id: `kyc-${p.id}`, tone: 'warning' as const, title: 'KYC to review', body: `${p.name} · ${p.area}`, href: `/technicians?id=${p.id}` })),
  ]

  return {
    today: { bookings: t.length, revenue: revenue(t), completed: t.filter((b) => b.status === 'completed').length },
    yesterday: { bookings: y.length, revenue: revenue(y) },
    live: db.bookings.filter((b) => LIVE_STATUSES.includes(b.status)).length,
    unassigned: unassigned.length,
    urgent: unassigned.filter((b) => b.priority === 'emergency' || b.dispatch.noTechFound).length,
    techs: { online: active.filter((p) => p.online).length, onJob: active.filter((p) => p.onJob).length, active: active.length },
    days,
    byCategory,
    topTechs,
    attention,
    upcoming: db.bookings
      .filter((b) => b.slotStart >= now && (b.status === 'confirmed' || b.status === 'assigned'))
      .sort((a, b) => a.slotStart - b.slotStart)
      .slice(0, 6),
  }
}

export function useDashboard(): Query<DashboardData> {
  return useResource((db) => summarise(db))
}
