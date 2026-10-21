/**
 * Coupons, Plus plans, home banners and reviews for the mock, from the old
 * console's seed reshaped into lib/data's types.
 */
import { controlSeed } from '../control'
import { seed } from '../seed'
import type { AdminReview, Coupon, HomeBanner, PlusPlan } from '../data/types'

const paise = (rupees: number) => Math.round(rupees * 100)
const ms = (iso: string) => new Date(iso).getTime()
const TONES: HomeBanner['tone'][] = ['blue', 'teal', 'amber', 'violet']

export function seedGrowth(now = Date.now()) {
  const base = seed(now)
  const control = controlSeed(base, now)

  const coupons: Coupon[] = base.coupons.map((c) => ({
    code: c.code,
    title: c.title ?? c.description,
    kind: c.kind,
    value: c.kind === 'flat' ? paise(c.value) : c.value,
    minOrder: paise(c.minOrder),
    maxDiscount: c.maxDiscount ? paise(c.maxDiscount) : undefined,
    categoryIds: c.appliance && c.appliance !== 'all' ? [c.appliance] : [],
    validFrom: c.start ? ms(c.start) : now - 30 * 86_400_000,
    validTill: ms(c.expires),
    usageLimit: c.limit,
    perCustomerLimit: 1,
    active: c.active,
    used: c.used,
  }))

  const plans: PlusPlan[] = [
    { id: 'plus-3m', name: 'Plus · 3 months', price: paise(199), durationDays: 90, freeVisits: true, discountPct: 0, priority: false, active: true, subscribers: 412, order: 0 },
    { id: 'plus-12m', name: 'Plus · 12 months', price: paise(599), durationDays: 365, freeVisits: true, discountPct: 10, priority: true, active: true, subscribers: 1186, order: 1 },
    { id: 'plus-family', name: 'Plus Family · 12 months', price: paise(899), durationDays: 365, freeVisits: true, discountPct: 15, priority: true, active: false, subscribers: 0, order: 2 },
  ]

  const banners: HomeBanner[] = control.content.banners.map((b, i) => ({
    id: b.id,
    title: b.heading,
    subtitle: b.sub,
    image: b.image,
    ctaLabel: b.cta,
    ctaHref: b.link.startsWith('/') ? b.link : '/',
    slot: b.placement === 'Home hero' ? 'hero' : 'inline',
    tone: TONES[i % TONES.length]!,
    validFrom: ms(b.start),
    validTill: ms(b.end),
    order: i,
    active: b.enabled,
  }))

  const reviews: AdminReview[] = base.reviews.map((r) => {
    const b = base.bookings.find((x) => x.id === r.bookingId)
    return {
      id: r.id,
      bookingId: r.bookingId,
      displayId: `#AP${r.bookingId.replace(/\D/g, '').padStart(5, '0').slice(-5)}`,
      customerName: base.customers.find((c) => c.id === r.customerId)?.name ?? 'Customer',
      technicianId: r.technicianId,
      rating: r.rating,
      text: r.text,
      at: ms(r.at),
      status: r.status,
      hiddenReason: r.status === 'hidden' ? 'Abusive language.' : undefined,
      reply: b && r.rating <= 2 && r.status === 'published' ? 'Sorry this visit fell short — our team will call you today.' : undefined,
    }
  })

  return { coupons, plans, banners, reviews }
}
