import type { Address } from '@app/shared/catalog-v2'

/** The signed-in demo customer, as the profile screens show them. */
export interface MockUser {
  uid: string
  name: string
  email: string
  photoUrl?: string
  plusMember: boolean
}

export const USER: MockUser = {
  uid: 'demo-customer',
  name: 'Aisha Khan',
  email: 'aisha@example.com',
  plusMember: false,
}

export const ADDRESSES: readonly Address[] = [
  {
    id: 'home',
    label: 'home',
    line1: 'Flat 302, Lotus Residency',
    line2: 'Road No. 12, Banjara Hills',
    city: 'Hyderabad',
    pincode: '500034',
    geo: { lat: 17.4126, lng: 78.4392 },
    isDefault: true,
  },
  {
    id: 'work',
    label: 'work',
    line1: '4th floor, Cyber Towers',
    line2: 'HITEC City',
    city: 'Hyderabad',
    pincode: '500081',
    geo: { lat: 17.4504, lng: 78.3808 },
    isDefault: false,
  },
]

/** An offer the customer can apply in the cart. */
export interface Coupon {
  code: string
  title: string
  description: string
  /** Percent off, or a flat amount in paise. */
  discount: { kind: 'percent'; value: number; maxOff?: number } | { kind: 'flat'; value: number }
  /** The cart total it needs, in paise. */
  minOrder: number
  /** Only for these categories; every category when absent. */
  categoryIds?: readonly string[]
  /** ISO date it stops working. */
  expiresAt: string
}

export const COUPONS: readonly Coupon[] = [
  {
    code: 'FIRST100',
    title: '₹100 off your first booking',
    description: 'On any service, for a first booking.',
    discount: { kind: 'flat', value: 10000 },
    minOrder: 49900,
    expiresAt: '2026-12-31',
  },
  {
    code: 'CLEAN15',
    title: '15% off cleaning',
    description: 'Up to ₹300 off any cleaning service.',
    discount: { kind: 'percent', value: 15, maxOff: 30000 },
    minOrder: 49900,
    categoryIds: ['cleaning'],
    expiresAt: '2026-11-30',
  },
  {
    code: 'GLOW20',
    title: '20% off salon',
    description: 'Up to ₹250 off at-home salon services.',
    discount: { kind: 'percent', value: 20, maxOff: 25000 },
    minOrder: 69900,
    categoryIds: ['salon'],
    expiresAt: '2026-11-15',
  },
]
