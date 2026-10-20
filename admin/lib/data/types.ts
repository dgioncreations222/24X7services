/**
 * The admin console's data shapes. Pages built on lib/data use these and
 * nothing from lib/types, lib/seed or lib/store.
 *
 * Each admin phase adds its shapes here. What the customer app's
 * packages/shared already defines will come from there, type-only, the way
 * technician/mobile does it; what is local is marked TODO with where it
 * belongs once the lead merges it.
 */
import type { AdminRole } from '../types'

export type { AdminRole }

/* -------------------------------------------------------------- Sign-in */

/** TODO(shared/admin.ts): an admin user, as sign-in and the shell need it. */
export interface AdminAccount {
  id: string
  name: string
  email: string
  role: AdminRole
  status: 'active' | 'invited' | 'disabled'
}

/**
 * Who is using the console. `loading` until the device's saved session has
 * been read — on the server, and for the first client render.
 */
export type AdminSession =
  | { status: 'loading' }
  | { status: 'signed_out' }
  | { status: 'signed_in'; admin: AdminAccount; provider: 'google' | 'email' }

/* -------------------------------------------------------------- Catalog */

/** Paise, as everywhere money is stored; shown as rupees. */
export type Paise = number

/**
 * TODO(catalog-v2): Member 1's Category. Until it lands these are local, in
 * the shape the shared CatalogAppliance already has (id, name, image, order,
 * active), so the swap is a rename.
 */
export interface Category {
  id: string
  name: string
  description: string
  /** A path under /public or a data: URL picked on this device. */
  image?: string
  order: number
  active: boolean
}

/** TODO(catalog-v2): Member 1's Service. Mirrors shared CatalogService's fields. */
export interface Service {
  id: string
  categoryId: string
  name: string
  description: string
  price: Paise
  durationMinutes: number
  included: string[]
  excluded: string[]
  images: string[]
  faqs: { q: string; a: string }[]
  order: number
  active: boolean
}

export type QuestionKind = 'options' | 'text' | 'number' | 'photo'

/**
 * TODO(catalog-v2): Member 1's Question. What the booking asks the customer
 * about this service — "Front load or top load?" — built here, not in code.
 */
export interface Question {
  id: string
  serviceId: string
  label: string
  kind: QuestionKind
  /** For `options`. */
  options: string[]
  /** For `options`: pick several rather than one. */
  multiple: boolean
  /** For `number`, e.g. "litres". */
  unit?: string
  help?: string
  required: boolean
  order: number
}

/** TODO(ratecard.ts): the shared RateCardItem proposal. */
export interface RateCardItem {
  id: string
  categoryId: string
  name: string
  price: Paise
  active: boolean
  order: number
  updatedAt: number
}

/** The shared ServiceArea: one pincode customers can book in. */
export interface ServiceArea {
  pincode: string
  city: string
  area: string
  active: boolean
}

/* ----------------------------------------------------------- Technicians */

/**
 * TODO(partner.ts): the shared proposal's PartnerStatus.
 * applied → kyc_pending → approved | rejected → active ⇄ suspended.
 */
export type PartnerStatus = 'applied' | 'kyc_pending' | 'approved' | 'rejected' | 'active' | 'suspended'

/** TODO(partner.ts): PayoutDestination. Only the last four digits of an account are kept. */
export type PayoutDestination = { kind: 'bank'; accountName: string; accountLast4: string; ifsc: string } | { kind: 'upi'; upiId: string }

/** TODO(partner.ts): Partner, plus what the console shows about how they work. */
export interface Partner {
  id: string
  name: string
  phone: string
  email: string
  city: string
  /** Their base area within the city. */
  area: string
  /** Category ids (catalog) they are approved for. */
  skills: string[]
  experienceYears: number
  status: PartnerStatus
  online: boolean
  /** On a job right now (only while online). */
  onJob: boolean
  rating: number
  ratingCount: number
  completedJobs: number
  /** Percent of offers accepted, last 30 days. */
  acceptanceRate: number
  /** Percent of visits started on time, last 30 days. */
  onTimeRate: number
  /** Percent of accepted jobs they cancelled, last 30 days. */
  cancelRate: number
  jobs30: number
  /** What they earned after commission, last 30 days. */
  earnings30: Paise
  payout?: PayoutDestination
  /** Why they were rejected or suspended — shown to the technician. */
  statusReason?: string
  createdAt: number
  /** When KYC was last sent for review. */
  submittedAt?: number
  /** Where they are (live while online), for dispatch distances. */
  geo: GeoPoint
}

export type KycDocType = 'aadhaar' | 'pan' | 'photo' | 'bank'

/** TODO(partner.ts): KycDocument. */
export interface KycDocument {
  id: string
  partnerId: string
  type: KycDocType
  fileUrl: string
  status: 'pending' | 'approved' | 'rejected'
  rejectReason?: string
  /** Admin name. */
  reviewedBy?: string
  uploadedAt: number
  reviewedAt?: number
}

/* -------------------------------------------------------------- Bookings */

export interface GeoPoint {
  lat: number
  lng: number
}

/** The shared BookingStatus: pending_payment → confirmed → assigned → … → completed; cancelled → refunded. */
export type BookingStatus =
  | 'pending_payment'
  | 'confirmed'
  | 'assigned'
  | 'en_route'
  | 'arrived'
  | 'in_progress'
  | 'awaiting_approval'
  | 'completed'
  | 'cancelled'
  | 'refunded'
  | 'failed'

export type PaymentStatus = 'not_required' | 'pending' | 'paid' | 'partially_paid' | 'failed' | 'refunded'

/** The shared BookingExtra: a part or charge added on site, approved by the customer. */
export interface BookingExtra {
  id: string
  source: 'rate_card' | 'other'
  rateCardItemId?: string
  name: string
  amount: Paise
  status: 'pending' | 'approved' | 'rejected'
  addedAt: number
  decidedAt?: number
}

export interface BookingEvent {
  status: BookingStatus
  at: number
  note?: string
  /** Who did it, when it was not the system: an admin, the technician, the customer. */
  by?: string
}

/** A booking as the console sees it. TODO(shared): built on shared Booking once the console reads Firestore. */
export interface AdminBooking {
  id: string
  /** What the customer sees, e.g. #AP24831. */
  displayId: string
  customer: { id: string; name: string; phone: string }
  categoryId: string
  serviceId: string
  serviceName: string
  brand: string
  issue: string
  priority: 'emergency' | 'normal'
  status: BookingStatus
  /** Booked slot start, epoch ms. */
  slotStart: number
  createdAt: number
  area: string
  pincode: string
  address: string
  geo: GeoPoint
  technicianId?: string
  timeline: BookingEvent[]
  extras: BookingExtra[]
  price: { service: Paise; discount: Paise; coupon?: string }
  payment: { status: PaymentStatus; method?: 'upi' | 'card' | 'cash' | 'wallet'; paidAt?: number }
  cancellation?: { at: number; by: 'customer' | 'support' | 'system'; reason: string }
  refunds: { amount: Paise; reason: string; at: number; by: string }[]
  /** Who was offered the job and said no (or let it time out). */
  dispatch: { declinedBy: string[]; noTechFound: boolean }
}

/* ------------------------------------------------------------- Customers */

/** TODO(shared/user.ts): the customer as the console sees them. */
export interface AdminCustomer {
  id: string
  name: string
  phone: string
  email: string
  area: string
  addresses: { label: string; line: string }[]
  joinedAt: number
  status: 'active' | 'blocked'
  /** Why they were blocked — kept for the next admin, not shown to the customer. */
  blockReason?: string
  walletCredit: Paise
  referralCode: string
  referrals: number
}

/* ---------------------------------------------------------------- Growth */

/** TODO(partner.ts): the shared Coupon proposal, plus how often it was used. */
export interface Coupon {
  /** What the customer types, upper case. */
  code: string
  title: string
  kind: 'flat' | 'percent'
  /** Paise for `flat`, whole percent (1–100) for `percent`. */
  value: number
  minOrder: Paise
  /** Caps a `percent` coupon. */
  maxDiscount?: Paise
  /** Empty means every category. */
  categoryIds: string[]
  validFrom: number
  validTill: number
  usageLimit?: number
  perCustomerLimit?: number
  active: boolean
  used: number
}

/** A Plus membership plan customers can buy. TODO(shared/plans.ts). */
export interface PlusPlan {
  id: string
  name: string
  price: Paise
  durationDays: number
  /** Visit fee waived on every booking. */
  freeVisits: boolean
  /** Percent off labour. */
  discountPct: number
  /** Jumps the dispatch queue. */
  priority: boolean
  active: boolean
  subscribers: number
  order: number
}

/** The shared Banner, as the admin edits it. */
export interface HomeBanner {
  id: string
  title: string
  subtitle?: string
  image?: string
  ctaLabel?: string
  /** Internal route only, starting with '/'. */
  ctaHref?: string
  slot: 'hero' | 'inline'
  tone: 'blue' | 'amber' | 'green' | 'teal' | 'violet'
  validFrom?: number
  validTill?: number
  order: number
  active: boolean
}

/** A customer's rating of a job, and what moderation did with it. */
export interface AdminReview {
  id: string
  bookingId: string
  displayId: string
  customerName: string
  technicianId: string
  rating: number
  text: string
  at: number
  status: 'published' | 'flagged' | 'hidden'
  /** Why it was hidden — internal. */
  hiddenReason?: string
  /** The business's public reply. */
  reply?: string
}
