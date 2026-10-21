import { z } from 'zod'
import {
  applianceIdSchema,
  bookingStageSchema,
  bookingStatusSchema,
  brandIdSchema,
  mediaTypeSchema,
  paymentModeSchema,
  paymentStatusSchema,
  repairRequestStatusSchema,
  serviceKeySchema,
  techPreferenceSchema,
} from './enums'
import { bookedSlotSchema, geoPointSchema } from './catalog'
import { paiseSchema } from './money'
import { addressInputSchema, addressSnapshotSchema } from './user'

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

export const mediaItemSchema = z.object({
  path: z.string().min(1),
  type: mediaTypeSchema,
  /** Milliseconds; only set for video. */
  durationMs: z.number().int().min(0).optional(),
  sizeBytes: z.number().int().min(0).optional(),
})
export type MediaItem = z.infer<typeof mediaItemSchema>

// ---------------------------------------------------------------------------
// The booking draft
// ---------------------------------------------------------------------------

/**
 * What the booking flow collects, step by step. It lives in Redux (persisted)
 * so back, refresh and the login interruption all leave it intact, and it is
 * what `createBooking` is handed.
 *
 * Note what it does not carry: any price. The server prices the booking from
 * the catalog, so a tampered draft buys nothing.
 */
export const bookingDraftSchema = z.object({
  applianceId: applianceIdSchema,
  serviceKey: serviceKeySchema,
  brandId: brandIdSchema,
  /** One of the appliance's `detailFields` options. */
  applianceType: z.string().min(1).optional(),
  modelNumber: z.string().trim().max(60).optional(),
  modelPhotoPath: z.string().min(1).optional(),
  /** Reuse of a saved appliance, when the customer picked one. */
  userApplianceId: z.string().min(1).optional(),
  issueIds: z.array(z.string().min(1)).default([]),
  otherIssueText: z.string().trim().max(500).optional(),
  /** The causes the customer was shown, kept so the record matches the screen. */
  diagnosisShown: z.array(z.string().min(1)).default([]),
  media: z.array(mediaItemSchema).default([]),
  addressId: z.string().min(1).optional(),
  /** Used when the customer typed a new address instead of picking a saved one. */
  address: addressInputSchema.optional(),
  slot: bookedSlotSchema,
  techPreference: techPreferenceSchema.default('any'),
  /** Required only when `techPreference` is `specific`. */
  technicianId: z.string().min(1).optional(),
  paymentMode: paymentModeSchema,
})
export type BookingDraft = z.infer<typeof bookingDraftSchema>

/**
 * The draft while it is still being filled in: every step may be missing until
 * its screen is reached. `bookingDraftSchema` is what it must satisfy before it
 * can be submitted.
 */
export const partialBookingDraftSchema = bookingDraftSchema.partial()
export type PartialBookingDraft = z.infer<typeof partialBookingDraftSchema>

// ---------------------------------------------------------------------------
// Per-step validation, for the wizard
// ---------------------------------------------------------------------------

export const bookingStepSchemas = {
  brand: z.object({ brandId: brandIdSchema }),
  details: z.object({
    applianceType: z.string().min(1).optional(),
    modelNumber: z.string().trim().max(60).optional(),
    modelPhotoPath: z.string().min(1).optional(),
  }),
  issue: z
    .object({
      issueIds: z.array(z.string().min(1)),
      otherIssueText: z.string().trim().max(500).optional(),
    })
    .refine(
      (v) => v.issueIds.length > 0 || Boolean(v.otherIssueText?.trim()),
      { message: 'Pick an issue or describe it', path: ['issueIds'] }
    ),
  media: z.object({ media: z.array(mediaItemSchema) }),
  address: z.object({
    addressId: z.string().min(1).optional(),
    address: addressInputSchema.optional(),
  }).refine((v) => Boolean(v.addressId || v.address), {
    message: 'Choose or add an address',
    path: ['addressId'],
  }),
  slot: z.object({ slot: bookedSlotSchema }),
  technician: z
    .object({
      techPreference: techPreferenceSchema,
      technicianId: z.string().min(1).optional(),
    })
    .refine((v) => v.techPreference !== 'specific' || Boolean(v.technicianId), {
      message: 'Choose a technician',
      path: ['technicianId'],
    }),
} as const

// ---------------------------------------------------------------------------
// Price
// ---------------------------------------------------------------------------

/**
 * Computed server-side on every change and written whole. `total` is what the
 * customer pays; `taxable + cgst + sgst + igst` reconstructs it exactly.
 */
export const priceBreakdownSchema = z.object({
  visitFee: paiseSchema,
  /** Approved repair line items only. Declined and pending ones are not here. */
  additional: paiseSchema,
  discount: paiseSchema,
  taxable: paiseSchema,
  cgst: paiseSchema,
  sgst: paiseSchema,
  igst: paiseSchema,
  total: paiseSchema,
  paid: paiseSchema,
  due: paiseSchema,
})
export type PriceBreakdown = z.infer<typeof priceBreakdownSchema>

export const paymentInfoSchema = z.object({
  mode: paymentModeSchema,
  status: paymentStatusSchema,
  razorpayOrderId: z.string().min(1).optional(),
  razorpayPaymentId: z.string().min(1).optional(),
  refundId: z.string().min(1).optional(),
})
export type PaymentInfo = z.infer<typeof paymentInfoSchema>

// ---------------------------------------------------------------------------
// Technician
// ---------------------------------------------------------------------------

/** The only technician fields a customer is ever shown. */
export const technicianPublicSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  rating: z.number().min(0).max(5),
  jobsCount: z.number().int().min(0),
  specializations: z.array(z.string().min(1)),
  photo: z.string().optional(),
})
export type TechnicianPublic = z.infer<typeof technicianPublicSchema>

// ---------------------------------------------------------------------------
// The booking document
// ---------------------------------------------------------------------------

export const cancellationSchema = z.object({
  reason: z.string().max(500),
  cancelledAt: z.number().int().min(0),
  cancelledBy: z.enum(['customer', 'support', 'system']),
  feeCharged: paiseSchema,
  refundPaise: paiseSchema,
  refundDays: z.number().int().min(0),
})
export type Cancellation = z.infer<typeof cancellationSchema>

export const bookingSchema = z.object({
  id: z.string().min(1),
  /** Human-readable reference, `#AP` plus five digits. */
  displayId: z.string().regex(/^#AP\d{5}$/),
  uid: z.string().min(1),

  applianceId: applianceIdSchema,
  serviceKey: serviceKeySchema,
  brandId: brandIdSchema,
  applianceType: z.string().min(1).optional(),
  modelNumber: z.string().max(60).optional(),
  modelPhotoPath: z.string().min(1).optional(),
  userApplianceId: z.string().min(1).optional(),

  issueIds: z.array(z.string().min(1)),
  otherIssueText: z.string().max(500).optional(),
  diagnosisShown: z.array(z.string().min(1)),
  media: z.array(mediaItemSchema),

  address: addressSnapshotSchema,
  slot: bookedSlotSchema,
  /** When the slot hold lapses, if the booking is still unpaid. */
  holdExpiresAt: z.number().int().min(0).optional(),

  techPreference: techPreferenceSchema,
  technicianId: z.string().min(1).optional(),
  technicianSnapshot: technicianPublicSchema.optional(),

  status: bookingStatusSchema,
  stage: bookingStageSchema.optional(),

  price: priceBreakdownSchema,
  payment: paymentInfoSchema,
  /**
   * The platform's percent of the whole bill, written when the job completes
   * and never changed after, so a new rate in settings does not rewrite what
   * an old job earned or a paid payout.
   */
  commissionPct: z.number().min(0).max(100).optional(),

  /**
   * What already covered part of this bill before it was quoted.
   *
   * Recorded on the booking rather than worked out again later, because a
   * membership lapses and a plan runs out — and when they do, the bill for a
   * job booked while they were live must not quietly change. It is also what
   * makes a covered visit traceable: the plan named here is the one a visit
   * comes off when the job is finished.
   */
  cover: z
    .object({
      /** 24X7 Plus was live when this was booked. */
      membership: z.boolean().default(false),
      /** The plan covering the visit, if one did. */
      userPlanId: z.string().min(1).optional(),
      /** Stamped when the visit is taken off that plan, so it happens once. */
      visitConsumedAt: z.number().int().min(0).optional(),
    })
    .optional(),

  /** Only when each OTP was revealed. The values live in a private subcollection. */
  otp: z
    .object({
      startShownAt: z.number().int().min(0).optional(),
      completeShownAt: z.number().int().min(0).optional(),
      startVerifiedAt: z.number().int().min(0).optional(),
      completeVerifiedAt: z.number().int().min(0).optional(),
    })
    .optional(),

  /** A masking-provider number. The technician's real number is never stored here. */
  contact: z.object({ maskedNumber: z.string().min(1).optional() }).optional(),

  etaMinutes: z.number().int().min(0).optional(),

  warrantyId: z.string().min(1).optional(),
  invoiceId: z.string().min(1).optional(),
  reviewId: z.string().min(1).optional(),
  cancellation: cancellationSchema.optional(),
  rescheduleCount: z.number().int().min(0).default(0),

  createdAt: z.number().int().min(0),
  updatedAt: z.number().int().min(0),
})
export type Booking = z.infer<typeof bookingSchema>

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

export const bookingEventSchema = z.object({
  id: z.string().min(1),
  status: bookingStatusSchema,
  stage: bookingStageSchema.optional(),
  title: z.string().min(1),
  note: z.string().optional(),
  at: z.number().int().min(0),
})
export type BookingEvent = z.infer<typeof bookingEventSchema>

// ---------------------------------------------------------------------------
// Additional repair, and its approval
// ---------------------------------------------------------------------------

export const repairItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  partPaise: paiseSchema,
  labourPaise: paiseSchema,
})
export type RepairItem = z.infer<typeof repairItemSchema>

export function repairItemTotal(item: RepairItem): number {
  return item.partPaise + item.labourPaise
}

export const repairRequestSchema = z.object({
  id: z.string().min(1),
  items: z.array(repairItemSchema).min(1),
  reason: z.string().min(1),
  photos: z.array(z.string().min(1)),
  status: repairRequestStatusSchema,
  approvedItemIds: z.array(z.string().min(1)),
  createdAt: z.number().int().min(0),
  respondedAt: z.number().int().min(0).optional(),
})
export type RepairRequest = z.infer<typeof repairRequestSchema>

// ---------------------------------------------------------------------------
// Live tracking
// ---------------------------------------------------------------------------

export const trackingSchema = z.object({
  bookingId: z.string().min(1),
  techLocation: geoPointSchema.optional(),
  customerLocation: geoPointSchema.optional(),
  etaMinutes: z.number().int().min(0).optional(),
  updatedAt: z.number().int().min(0),
})
export type Tracking = z.infer<typeof trackingSchema>

// ---------------------------------------------------------------------------
// Invoice, warranty, review
// ---------------------------------------------------------------------------

export const invoiceLineSchema = z.object({
  label: z.string().min(1),
  amount: paiseSchema,
})

export const invoiceSchema = z.object({
  id: z.string().min(1),
  bookingId: z.string().min(1),
  uid: z.string().min(1),
  /** Sequential, from the `counters/invoice` document. */
  number: z.string().min(1),
  issuedAt: z.number().int().min(0),
  seller: z.object({
    legalName: z.string().min(1),
    gstin: z.string().min(1),
    address: z.string().min(1),
  }),
  buyer: z.object({
    name: z.string().min(1),
    address: z.string().min(1),
  }),
  sacCode: z.string().min(1),
  gstRate: z.number().min(0).max(100),
  lines: z.array(invoiceLineSchema).min(1),
  price: priceBreakdownSchema,
  paymentStatus: paymentStatusSchema,
  /** Storage path of the rendered PDF. */
  pdfPath: z.string().min(1).optional(),
})
export type Invoice = z.infer<typeof invoiceSchema>

export const warrantySchema = z.object({
  id: z.string().min(1),
  bookingId: z.string().min(1),
  uid: z.string().min(1),
  applianceId: applianceIdSchema,
  brandId: brandIdSchema,
  serviceKey: serviceKeySchema,
  startsAt: z.number().int().min(0),
  expiresAt: z.number().int().min(0),
  /** What the warranty does and does not cover, copied from the service. */
  covers: z.array(z.string().min(1)),
  excludes: z.array(z.string().min(1)),
})
export type Warranty = z.infer<typeof warrantySchema>

export const reviewInputSchema = z.object({
  rating: z.number().int().min(1, 'Pick a rating').max(5),
  techRating: z.number().int().min(1).max(5).optional(),
  tags: z.array(z.string().min(1)).max(8).default([]),
  text: z.string().trim().max(1000).optional(),
})
export type ReviewInput = z.infer<typeof reviewInputSchema>

export const reviewSchema = reviewInputSchema.extend({
  id: z.string().min(1),
  bookingId: z.string().min(1),
  uid: z.string().min(1),
  technicianId: z.string().min(1).optional(),
  /**
   * What was reviewed, copied off the booking when the review is filed.
   *
   * Without these a review can only be grouped by the booking it came from,
   * which means answering "what do people say about AC repair" is a scan of
   * every booking anyone has ever made. Optional because reviews filed before
   * this existed do not have them.
   */
  applianceId: applianceIdSchema.optional(),
  serviceKey: serviceKeySchema.optional(),
  createdAt: z.number().int().min(0),
})
export type Review = z.infer<typeof reviewSchema>

/**
 * A review as everyone else sees it.
 *
 * The same arrangement the technicians have: the record with the uid and the
 * booking id on it stays private, and this is the part that goes on a public
 * page. It is a separate document rather than a rule that hides fields,
 * because a rule cannot hide a field — a client reading a document reads all
 * of it, and "the uid is only an opaque id" is the sentence people say right
 * before it turns out to be joinable with something else.
 *
 * The name is a first name and nothing else, taken from the profile at the
 * moment the review is filed. A customer reviewing their washing machine did
 * not agree to have their full name on a page about washing machines.
 */
export const serviceReviewSchema = z.object({
  id: z.string().min(1),
  applianceId: applianceIdSchema,
  serviceKey: serviceKeySchema,
  rating: z.number().int().min(1).max(5),
  text: z.string().trim().max(1000).optional(),
  /** First name, or "A customer" where there is no name to use. */
  authorName: z.string().min(1).max(40),
  createdAt: z.number().int().min(0),
})
export type ServiceReview = z.infer<typeof serviceReviewSchema>
