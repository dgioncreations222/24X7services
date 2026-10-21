/**
 * Bookings for the mock: the old console's seeded month, reshaped into the
 * shared booking lifecycle, with extras on some jobs (one still waiting for
 * the customer, one they declined) and a few unassigned jobs nobody would take.
 */
import { BRAND_LABEL } from '../catalog'
import { seed } from '../seed'
import type { AdminBooking, BookingExtra, BookingStatus, Category, RateCardItem, Service } from '../data/types'
import type { Booking as OldBooking } from '../types'

const paise = (rupees: number) => Math.round(rupees * 100)
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
const ms = (iso: string) => new Date(iso).getTime()

export function seedBookings(catalog: { categories: Category[]; services: Service[]; rateCard: RateCardItem[] }, partnerIds: string[], now = Date.now()) {
  const base = seed(now)
  const customer = (id: string) => base.customers.find((c) => c.id === id)

  const bookings: AdminBooking[] = base.bookings.map((b: OldBooking, i) => {
    const serviceId = `${b.appliance}-${slug(b.service)}`
    const service = catalog.services.find((s) => s.id === serviceId)
    const cat = catalog.categories.find((c) => c.id === b.appliance)
    const c = customer(b.customerId)
    const status = b.status as BookingStatus
    const card = catalog.rateCard.filter((r) => r.categoryId === b.appliance)
    const extras: BookingExtra[] = []
    // Every fifth job that got going has a part fitted from the rate card.
    if (card[0] && ['in_progress', 'completed'].includes(status) && i % 5 === 0) {
      extras.push({ id: `${b.id}-x1`, source: 'rate_card', rateCardItemId: card[0].id, name: card[0].name, amount: card[0].price, status: 'approved', addedAt: ms(b.scheduledAt) + 1_800_000, decidedAt: ms(b.scheduledAt) + 2_000_000 })
    }
    if (card[1] && status === 'completed' && i % 7 === 0) {
      extras.push({ id: `${b.id}-x2`, source: 'other', name: 'Extra wiring (3 m)', amount: paise(350), status: 'rejected', addedAt: ms(b.scheduledAt) + 2_400_000, decidedAt: ms(b.scheduledAt) + 2_700_000 })
    }
    return {
      id: b.id,
      displayId: `#AP${b.id.replace(/\D/g, '').padStart(5, '0').slice(-5)}`,
      customer: { id: b.customerId, name: c?.name ?? 'Customer', phone: c?.phone ?? '' },
      categoryId: b.appliance,
      serviceId,
      serviceName: service?.name ?? `${cat?.name ?? b.appliance} ${b.service.toLowerCase()}`,
      brand: BRAND_LABEL[b.brand],
      issue: b.issue,
      priority: b.priority === 'emergency' ? 'emergency' : 'normal',
      status,
      slotStart: ms(b.scheduledAt),
      createdAt: ms(b.createdAt),
      area: b.area,
      pincode: base.settings.areas.find((a) => a.area === b.area)?.pincode ?? '500081',
      address: b.address,
      geo: { lat: b.lat, lng: b.lng },
      technicianId: b.technicianId,
      timeline: b.timeline.map((t) => ({ status: t.status as BookingStatus, at: ms(t.at), note: t.note })),
      extras,
      price: { service: paise(b.amount), discount: paise(b.discount), coupon: b.coupon },
      payment: b.paid ? { status: 'paid', method: b.method ?? 'upi', paidAt: ms(b.timeline.at(-1)?.at ?? b.scheduledAt) } : { status: 'pending', method: b.method ?? undefined },
      cancellation: status === 'cancelled' || status === 'refunded' ? { at: ms(b.timeline.at(-1)?.at ?? b.createdAt), by: 'customer', reason: b.cancelReason ?? 'Customer changed plans.' } : undefined,
      refunds: status === 'refunded' ? [{ amount: paise(b.amount - b.discount), reason: 'Cancelled before the visit.', at: ms(b.timeline.at(-1)?.at ?? b.createdAt), by: 'System' }] : [],
      dispatch: { declinedBy: [], noTechFound: false },
    }
  })

  // One live job is waiting for the customer to approve an extra.
  const live = bookings.find((b) => b.status === 'in_progress' && !b.extras.length)
  const card = live && catalog.rateCard.find((r) => r.categoryId === live.categoryId)
  if (live && card) {
    // A few minutes after work started, never before it.
    const at = Math.min(now, Math.max(...live.timeline.map((e) => e.at)) + 4 * 60_000)
    live.status = 'awaiting_approval'
    live.extras.push({ id: `${live.id}-x1`, source: 'rate_card', rateCardItemId: card.id, name: card.name, amount: card.price, status: 'pending', addedAt: at })
    live.timeline.push({ status: 'awaiting_approval', at, note: `${card.name} sent for approval` })
  }

  // Two unassigned jobs went round three technicians and nobody took them.
  bookings
    .filter((b) => b.status === 'confirmed')
    .slice(0, 2)
    .forEach((b, i) => {
      b.dispatch = { declinedBy: partnerIds.slice(i * 3, i * 3 + 3), noTechFound: true }
    })

  return { bookings }
}
