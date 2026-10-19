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
export type PartnerStatus = 'applied' | 'kyc_pending' | 'approved' | 'rejected' | 'active' | 'suspended'

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

/** A review of this technician, from the customer's app. */
export type PartnerReview = Pick<Review, 'id' | 'bookingId' | 'rating' | 'text' | 'createdAt'> & {
  authorName: string
  serviceName: string
}

/** TODO(ratecard.ts): RateCardItem. */
export interface RateCardItem {
  id: string
  categoryId: string
  name: string
  price: Paise
  active: boolean
}
