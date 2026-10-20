'use client'

/** Reports over a date range, by service date: totals, then per day, category, area and technician. */
import type { MockDb } from '../mock/db'
import { bill } from './bookings'
import { useResource, type Query } from './query'
import type { AdminBooking, Paise } from './types'

const DAY = 86_400_000

export interface ReportRow {
  key: string
  label: string
  bookings: number
  completed: number
  cancelled: number
  revenue: Paise
}

export interface Report {
  from: number
  to: number
  totals: { bookings: number; completed: number; cancelled: number; cancelRate: number; revenue: Paise; commission: Paise; refunds: Paise; avgTicket: Paise }
  byDay: ReportRow[]
  byCategory: ReportRow[]
  byArea: ReportRow[]
  technicians: (ReportRow & { rating: number; onTimeRate: number; acceptanceRate: number })[]
}

function row(key: string, label: string, list: AdminBooking[]): ReportRow {
  const done = list.filter((b) => b.status === 'completed')
  return {
    key,
    label,
    bookings: list.length,
    completed: done.length,
    cancelled: list.filter((b) => b.status === 'cancelled' || b.status === 'refunded').length,
    revenue: done.reduce((s, b) => s + bill(b).total, 0),
  }
}

function group(list: AdminBooking[], keyOf: (b: AdminBooking) => string, labelOf: (k: string) => string) {
  const m = new Map<string, AdminBooking[]>()
  for (const b of list) m.set(keyOf(b), [...(m.get(keyOf(b)) ?? []), b])
  return [...m].map(([k, l]) => row(k, labelOf(k), l)).sort((a, b) => b.revenue - a.revenue)
}

export function buildReport(db: MockDb, from: number, to: number): Report {
  const list = db.bookings.filter((b) => b.slotStart >= from && b.slotStart < to && b.status !== 'pending_payment' && b.status !== 'failed')
  const all = row('all', 'All', list)
  const refunds = list.reduce((s, b) => s + b.refunds.reduce((x, r) => x + r.amount, 0), 0)
  const days = Math.max(1, Math.round((to - from) / DAY))
  return {
    from,
    to,
    totals: {
      bookings: all.bookings,
      completed: all.completed,
      cancelled: all.cancelled,
      cancelRate: all.bookings ? Math.round((all.cancelled / all.bookings) * 100) : 0,
      revenue: all.revenue,
      commission: Math.round((all.revenue * db.settings.commissionPct) / 100),
      refunds,
      avgTicket: all.completed ? Math.round(all.revenue / all.completed) : 0,
    },
    byDay: Array.from({ length: days }, (_, i) => {
      const d0 = from + i * DAY
      return row(String(d0), new Date(d0).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), list.filter((b) => b.slotStart >= d0 && b.slotStart < d0 + DAY))
    }),
    byCategory: group(list, (b) => b.categoryId, (k) => db.categories.find((c) => c.id === k)?.name ?? k),
    byArea: group(list, (b) => b.area, (k) => k),
    technicians: db.partners
      .filter((p) => p.status === 'active' || p.status === 'suspended')
      .map((p) => ({ ...row(p.id, p.name, list.filter((b) => b.technicianId === p.id)), rating: p.rating, onTimeRate: p.onTimeRate, acceptanceRate: p.acceptanceRate }))
      .sort((a, b) => b.revenue - a.revenue),
  }
}

/** The report for [from, to). */
export function useReport(from: number, to: number): Query<Report> {
  return useResource((db) => buildReport(db, from, to))
}
