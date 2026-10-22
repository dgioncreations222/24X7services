'use client'

/**
 * Growth: coupons, Plus plans, home banners and review moderation. Each
 * action checks what the customer app would trip over — a coupon worth more
 * than its minimum order, a banner linking off-site — before saving.
 */
import { read, write } from '../mock/db'
import { guarded } from './permissions'
import { useResource, type Query } from './query'
import { audit } from './audit'
import type { AdminReview, Coupon, HomeBanner, PlusPlan } from './types'

export class GrowthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GrowthError'
  }
}

const fail = (m: string): never => {
  throw new GrowthError(m)
}

/* --------------------------------------------------------------- Coupons */

export type CouponState = 'live' | 'scheduled' | 'expired' | 'used_up' | 'paused'

/** Whether a customer could use it right now, and if not, why. */
export function couponState(c: Coupon, now = Date.now()): CouponState {
  if (!c.active) return 'paused'
  if (now < c.validFrom) return 'scheduled'
  if (now > c.validTill) return 'expired'
  if (c.usageLimit && c.used >= c.usageLimit) return 'used_up'
  return 'live'
}

export function useCoupons(): Query<Coupon[]> {
  return useResource((db) => [...db.coupons].sort((a, b) => b.validFrom - a.validFrom))
}

export type CouponInput = Omit<Coupon, 'used'>

/** Add a coupon (`isNew`) or change one; the code is the key and cannot change. */
export function saveCoupon(input: CouponInput, isNew: boolean) {
  return guarded([['promotions', isNew ? 'create' : 'edit']], () => {
    const code = input.code.trim().toUpperCase()
    if (!/^[A-Z0-9]{3,20}$/.test(code)) fail('Code: 3–20 letters or numbers, no spaces.')
    if (input.title.trim().length < 3) fail('Give it a title customers will read.')
    const existing = read().coupons.find((c) => c.code === code)
    if (isNew && existing) fail('A coupon with this code already exists.')
    if (!isNew && !existing) fail('This coupon no longer exists.')
    if (input.kind === 'percent' && (input.value < 1 || input.value > 100 || !Number.isInteger(input.value))) fail('Percent off must be a whole number from 1 to 100.')
    if (input.kind === 'flat' && input.value <= 0) fail('Enter how much it takes off.')
    if (input.kind === 'flat' && input.minOrder > 0 && input.value >= input.minOrder) fail('The discount must be less than the minimum order.')
    if (input.kind === 'percent' && !input.maxDiscount) fail('Set a maximum discount for a percent coupon.')
    if (!(input.validTill > input.validFrom)) fail('The end date must be after the start date.')
    if (input.usageLimit !== undefined && input.usageLimit < 1) fail('Total uses must be at least 1, or left empty.')
    const coupon: Coupon = { ...input, code, title: input.title.trim(), used: existing?.used ?? 0 }
    write((d) => ({ ...d, coupons: existing ? d.coupons.map((c) => (c.code === code ? coupon : c)) : [coupon, ...d.coupons] }))
    audit('promotions', existing ? 'Edited coupon' : 'Created coupon', { target: code })
    return coupon
  })
}

export function setCouponActive(code: string, active: boolean) {
  return guarded([['promotions', 'edit']], () => {
    write((d) => ({ ...d, coupons: d.coupons.map((c) => (c.code === code ? { ...c, active } : c)) }))
    audit('promotions', active ? 'Turned on coupon' : 'Paused coupon', { target: code })
  })
}

/* ------------------------------------------------------------ Plus plans */

export function usePlans(): Query<PlusPlan[]> {
  return useResource((db) => [...db.plans].sort((a, b) => a.order - b.order))
}

export type PlanInput = Omit<PlusPlan, 'id' | 'order' | 'subscribers' | 'active'> & { id?: string }

export function savePlan(input: PlanInput) {
  return guarded([['promotions', input.id ? 'edit' : 'create']], () => {
    if (input.name.trim().length < 3) fail('Name the plan.')
    if (input.price <= 0) fail('Enter a price above ₹0.')
    if (!Number.isInteger(input.durationDays) || input.durationDays < 7) fail('A plan lasts at least 7 days.')
    if (input.discountPct < 0 || input.discountPct > 50) fail('Discount is 0–50%.')
    if (!input.freeVisits && !input.discountPct && !input.priority) fail('Give the plan at least one benefit.')
    const existing = read().plans.find((p) => p.id === input.id)
    const plan: PlusPlan = existing
      ? { ...existing, ...input, name: input.name.trim() }
      : { ...input, name: input.name.trim(), id: `plus-${Date.now().toString(36)}`, order: read().plans.length, subscribers: 0, active: true }
    write((d) => ({ ...d, plans: existing ? d.plans.map((p) => (p.id === plan.id ? plan : p)) : [...d.plans, plan] }))
    audit('promotions', existing ? 'Edited Plus plan' : 'Created Plus plan', { target: plan.name, old: existing && existing.price !== plan.price ? `₹${existing.price / 100}` : undefined, new: `₹${plan.price / 100}` })
    return plan
  })
}

/** Stops new sign-ups; people already on it keep it until it ends. */
export function setPlanActive(id: string, active: boolean) {
  return guarded([['promotions', 'edit']], () => {
    write((d) => ({ ...d, plans: d.plans.map((p) => (p.id === id ? { ...p, active } : p)) }))
    audit('promotions', active ? 'Opened Plus plan' : 'Closed Plus plan to new sign-ups', { target: read().plans.find((p) => p.id === id)?.name ?? id })
  })
}

/* --------------------------------------------------------------- Banners */

export function useBanners(): Query<HomeBanner[]> {
  return useResource((db) => [...db.banners].sort((a, b) => (a.slot === b.slot ? a.order - b.order : a.slot === 'hero' ? -1 : 1)))
}

export type BannerInput = Omit<HomeBanner, 'id' | 'order' | 'active'> & { id?: string }

export function saveBanner(input: BannerInput) {
  return guarded([['content', input.id ? 'edit' : 'create']], () => {
    if (input.title.trim().length < 3) fail('Write the headline.')
    if (input.title.trim().length > 60) fail('Keep the headline under 60 characters — it has to fit a phone.')
    if (input.ctaHref && !input.ctaHref.startsWith('/')) fail('Links must stay inside the app, starting with “/”.')
    if (input.ctaHref && !input.ctaLabel?.trim()) fail('A link needs a button label.')
    if (input.validFrom && input.validTill && input.validTill <= input.validFrom) fail('The end date must be after the start date.')
    const db = read()
    const existing = db.banners.find((b) => b.id === input.id)
    const order = existing && existing.slot === input.slot ? existing.order : db.banners.filter((b) => b.slot === input.slot).length
    const banner: HomeBanner = {
      ...input,
      title: input.title.trim(),
      subtitle: input.subtitle?.trim() || undefined,
      ctaLabel: input.ctaLabel?.trim() || undefined,
      ctaHref: input.ctaHref?.trim() || undefined,
      id: existing?.id ?? `BN-${Date.now().toString(36).toUpperCase()}`,
      order,
      active: existing?.active ?? true,
    }
    write((d) => ({ ...d, banners: existing ? d.banners.map((b) => (b.id === banner.id ? banner : b)) : [...d.banners, banner] }))
    audit('content', existing ? 'Edited banner' : 'Added banner', { target: banner.title })
    return banner
  })
}

export function setBannerActive(id: string, active: boolean) {
  return guarded([['content', 'edit']], () => {
    write((d) => ({ ...d, banners: d.banners.map((b) => (b.id === id ? { ...b, active } : b)) }))
    audit('content', active ? 'Showed banner' : 'Hid banner', { target: read().banners.find((b) => b.id === id)?.title ?? id })
  })
}

/** Up or down among banners in the same slot. */
export function moveBanner(id: string, dir: -1 | 1) {
  return guarded([['content', 'edit']], () => {
    write((d) => {
      const b = d.banners.find((x) => x.id === id)
      if (!b) return d
      const list = d.banners.filter((x) => x.slot === b.slot).sort((x, y) => x.order - y.order)
      const other = list[list.findIndex((x) => x.id === id) + dir]
      if (!other) return d
      return { ...d, banners: d.banners.map((x) => (x.id === id ? { ...x, order: other.order } : x.id === other.id ? { ...x, order: b.order } : x)) }
    })
    audit('content', dir < 0 ? 'Moved banner up' : 'Moved banner down', { target: read().banners.find((x) => x.id === id)?.title ?? id })
  })
}

/* --------------------------------------------------------------- Reviews */

export function useReviews(): Query<AdminReview[]> {
  return useResource((db) => [...db.reviews].sort((a, b) => b.at - a.at))
}

function setReview(id: string, patch: (r: AdminReview) => Partial<AdminReview>) {
  const r = read().reviews.find((x) => x.id === id)
  if (!r) fail('This review no longer exists.')
  write((d) => ({ ...d, reviews: d.reviews.map((x) => (x.id === id ? { ...x, ...patch(x) } : x)) }))
}

/** Take a review off the app. It still counts in the technician's rating. */
export function hideReview(id: string, reason: string) {
  return guarded([['reviews', 'edit']], () => {
    if (reason.trim().length < 10) fail('Say why it is hidden — for the next admin. At least 10 characters.')
    setReview(id, () => ({ status: 'hidden', hiddenReason: reason.trim() }))
    audit('reviews', 'Hid review', { target: id, new: reason.trim() })
  })
}

export function publishReview(id: string) {
  return guarded([['reviews', 'edit']], () => {
    setReview(id, () => ({ status: 'published', hiddenReason: undefined }))
    audit('reviews', 'Published review', { target: id })
  })
}

/** A public reply under the review; empty text removes it. */
export function replyToReview(id: string, text: string) {
  return guarded([['reviews', 'edit']], () => {
    const t = text.trim()
    if (t && t.length < 10) fail('A reply of at least 10 characters, or leave it empty to remove it.')
    if (t.length > 500) fail('Keep the reply under 500 characters.')
    setReview(id, () => ({ reply: t || undefined }))
    audit('reviews', t ? 'Replied to review' : 'Removed review reply', { target: id, new: t || undefined })
  })
}
