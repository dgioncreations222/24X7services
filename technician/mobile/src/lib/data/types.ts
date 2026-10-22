/**
 * The technician app's data shapes. Screens built on lib/data use these and
 * nothing from lib/types or lib/seed.
 *
 * What @app/shared already defines comes from there, type-only — the shared
 * package is not linked into the app's bundle, so a runtime import would
 * fail (lint blocks it). The rest is local and marked TODO with the shared
 * file it belongs in once the lead merges it:
 *   - TODO(catalog-v2): Member 1's Category / Service / Question.
 *   - TODO(partner.ts): Member 2's Partner / KycDocument / Payout proposal.
 *   - TODO(ratecard.ts): Member 2's RateCardItem proposal.
 */
import type { AddressInput, BookingStatus, GeoPoint, Paise, PaymentStatus, Review } from '@app/shared'

export type { BookingStatus, Paise, PaymentStatus }

/* ------------------------------------------------------------------ Jobs */

/**
 * Where a job is from this technician's side. `offered` is a request sent to
 * them that they have not taken yet (the booking itself is still searching);
 * every other value is the booking's own status.
 */
export type PartnerJobStatus =
  | 'offered'
  | Extract<BookingStatus, 'assigned' | 'en_route' | 'arrived' | 'in_progress' | 'awaiting_approval' | 'completed' | 'cancelled'>

/** TODO(catalog-v2): becomes a reference to Member 1's Service. */
export interface JobService {
  categoryId: string
  categoryName: string
  serviceId: string
  name: string
}

/** A booking question and what the customer answered, as shown on the job. */
export interface JobAnswer {
  questionId: string
  label: string
  value: string
}

export interface JobPhoto {
  id: string
  url: string
  takenAt: number
}

/** A part or charge added on site; the customer approves it in their app. */
export interface JobExtra {
  id: string
  /** From the admin's rate card at its fixed price, or typed in by hand. */
  source: 'rate_card' | 'other'
  rateCardItemId?: string
  name: string
  amount: Paise
  status: 'pending' | 'approved' | 'rejected'
}

export interface PartnerJob {
  id: string
  /** What the customer sees on their booking. */
  displayId: string
  status: PartnerJobStatus
  priority: 'emergency' | 'normal'
  service: JobService
  customer: { name: string; phone: string }
  address: Pick<AddressInput, 'flat' | 'area' | 'landmark' | 'city' | 'pincode'> & { geo?: GeoPoint }
  /** Booked slot start, epoch ms. */
  slotStart: number
  durationMin: number
  distanceKm: number
  etaMin: number
  answers: JobAnswer[]
  notes?: string
  /** What the technician takes home for the job, after commission. */
  earning: Paise
  /**
   * The platform's cut when the job was booked, in percent of the whole bill
   * (extras included). Kept on the job so a later change in Settings cannot
   * rewrite what an old job earned.
   */
  commissionPct: number
  /** The customer's bill and whether it is paid — status only, no collection here. */
  payment: { amount: Paise; status: PaymentStatus }
  photos: { before: JobPhoto[]; after: JobPhoto[] }
  extras: JobExtra[]
  /** When an `offered` job stops waiting for an answer, epoch ms. */
  offerExpiresAt?: number
  timeline: { status: PartnerJobStatus; at: number }[]
  rating?: number
}

/** The Jobs tab's three lists, plus open offers. */
export type JobsView = 'offers' | 'upcoming' | 'ongoing' | 'completed'

/* ----------------------------------------------------------------- Money */

export interface EarningLine {
  jobId: string
  displayId: string
  serviceName: string
  at: number
  gross: Paise
  commission: Paise
  net: Paise
}

export interface EarningsSummary {
  period: 'today' | 'week' | 'month'
  jobs: number
  gross: Paise
  commission: Paise
  net: Paise
  lines: EarningLine[]
}

/** TODO(partner.ts): Payout. */
export interface Payout {
  id: string
  periodStart: number
  periodEnd: number
  gross: Paise
  commission: Paise
  net: Paise
  jobCount: number
  status: 'pending' | 'approved' | 'paid'
  paidAt?: number
}

/* --------------------------------------------------------------- Profile */

/** TODO(partner.ts): Partner. */
/** `inactive`: let go by the network; an admin can reactivate the same account later. */
export type PartnerStatus = 'applied' | 'kyc_pending' | 'approved' | 'rejected' | 'active' | 'suspended' | 'inactive'

export interface PartnerProfile {
  id: string
  name: string
  phone: string
  email: string
  photo?: string
  city: string
  zone: string
  /** TODO(catalog-v2): category ids. */
  skills: string[]
  experienceYears: number
  status: PartnerStatus
  online: boolean
  rating: number
  ratingCount: number
  completedJobs: number
  bank?: { name: string; last4: string }
  upiId?: string
}

/* ------------------------------------------------- Sign-in and onboarding */

/**
 * Where the signed-in person is on the way to taking jobs; decides which
 * screens they may see. Follows the partner status diagram:
 * registering → kyc_required → kyc_pending → approved / kyc_rejected → active.
 */
export type SessionStatus = 'signed_out' | 'registering' | 'kyc_required' | 'kyc_pending' | 'kyc_rejected' | 'approved' | 'active' | 'suspended' | 'inactive'

export interface Session {
  status: SessionStatus
  email?: string
  name?: string
  /** Why KYC was rejected, when it was. */
  rejectReason?: string
  /** How they signed in; only email accounts have a password to change. */
  provider?: 'google' | 'email'
}

/** The registration form. TODO(partner.ts): fields of Partner. */
export interface Registration {
  name: string
  phone: string
  city: string
  /** TODO(catalog-v2): category ids. */
  skills: string[]
  experienceYears: number
}

/** TODO(partner.ts): KycDocument. */
export type KycDocType = 'aadhaar' | 'pan' | 'photo' | 'bank'

export interface KycDocument {
  type: KycDocType
  /** Local or uploaded file. */
  fileUrl: string
  status: 'uploaded' | 'pending' | 'approved' | 'rejected'
  uploadedAt: number
}

/** Where payouts go: a bank account or a UPI id. */
export type PayoutDetails = { accountName: string; accountNumber: string; ifsc: string } | { upiId: string }

/** TODO(catalog-v2): Member 1's Category, as far as registration needs it. */
export interface Category {
  id: string
  name: string
}

/** A review of this technician, from the customer's app. */
export type PartnerReview = Pick<Review, 'id' | 'bookingId' | 'rating' | 'text' | 'createdAt'> & {
  authorName: string
  serviceName: string
}

/* --------------------------------------------------------- Notifications */

export type PartnerNotificationKind = 'request' | 'emergency' | 'assigned' | 'schedule' | 'cancelled' | 'customer' | 'payment' | 'rating' | 'payout'

export interface PartnerNotification {
  id: string
  kind: PartnerNotificationKind
  title: string
  body: string
  /** Epoch ms. */
  at: number
  read: boolean
  jobId?: string
}

/* --------------------------------------------------------------- Support */

export type TicketTopic = 'customer_unreachable' | 'wrong_address' | 'payment' | 'part' | 'app' | 'safety' | 'other'

/** A question raised with the partner desk. */
export interface SupportTicket {
  id: string
  topic: TicketTopic
  jobId?: string
  details: string
  status: 'open' | 'in_progress' | 'resolved'
  createdAt: number
  /** The desk's latest answer, once there is one. */
  reply?: string
}

export interface Faq {
  id: string
  question: string
  answer: string
}

/* -------------------------------------------------------------- Settings */

export type AppLanguage = 'English' | 'हिन्दी' | 'తెలుగు' | 'اردو'

/** What this phone does for the technician; kept on the device, not the server. */
export interface DeviceSettings {
  language: AppLanguage
  notify: { requests: boolean; emergency: boolean; schedule: boolean; payments: boolean; sound: boolean }
}

/** TODO(ratecard.ts): RateCardItem. */
export interface RateCardItem {
  id: string
  categoryId: string
  name: string
  price: Paise
  active: boolean
}
