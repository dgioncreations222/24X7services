import { z } from 'zod'
import { paiseSchema } from './money'
import { phoneSchema } from './user'

// ---------------------------------------------------------------------------
// Partner (technician)
// ---------------------------------------------------------------------------

/**
 * Where a technician is on the way to taking jobs.
 *
 * applied → kyc_pending → approved | rejected → active ⇄ suspended.
 * `rejected` goes back to `kyc_pending` when the documents are uploaded
 * again; `approved` becomes `active` on the technician's first sign-in after
 * approval, so "approved but never opened the app" is visible to ops.
 */
export const partnerStatusSchema = z.enum(['applied', 'kyc_pending', 'approved', 'rejected', 'active', 'suspended'])
export type PartnerStatus = z.infer<typeof partnerStatusSchema>

/** Where payouts go — a bank account or a UPI id, never both. */
export const payoutDestinationSchema = z.union([
  z.object({
    kind: z.literal('bank'),
    accountName: z.string().trim().min(2).max(120),
    /** Only the last four digits are kept on the partner; the full number lives with the payout provider. */
    accountLast4: z.string().regex(/^\d{4}$/),
    ifsc: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'IFSC looks like HDFC0001234'),
  }),
  z.object({
    kind: z.literal('upi'),
    upiId: z.string().trim().regex(/^[\w.-]{2,}@[a-z]{2,}$/i, 'UPI ID looks like name@okhdfc'),
  }),
])
export type PayoutDestination = z.infer<typeof payoutDestinationSchema>

export const partnerSchema = z.object({
  /** The Firebase Auth uid. */
  id: z.string().min(1),
  name: z.string().trim().min(2).max(80),
  phone: phoneSchema,
  email: z.string().email(),
  photoPath: z.string().min(1).optional(),
  city: z.string().trim().min(1).max(80),
  zoneId: z.string().min(1).optional(),
  /** Category ids (catalog-v2) the technician is approved for. */
  skills: z.array(z.string().min(1)).min(1),
  experienceYears: z.number().int().min(0).max(60),
  status: partnerStatusSchema,
  /** The Home toggle. Only `active` partners can be online. */
  online: z.boolean(),
  rating: z.number().min(0).max(5),
  ratingCount: z.number().int().min(0),
  completedJobs: z.number().int().min(0),
  payout: payoutDestinationSchema.optional(),
  /** Shown to the technician when status is `rejected` or `suspended`. */
  statusReason: z.string().max(300).optional(),
  createdAt: z.number().int().min(0),
  updatedAt: z.number().int().min(0),
})
export type Partner = z.infer<typeof partnerSchema>

/** What the technician fills in at registration (step 1 of onboarding). */
export const partnerRegistrationInputSchema = partnerSchema.pick({
  name: true,
  phone: true,
  city: true,
  skills: true,
  experienceYears: true,
})
export type PartnerRegistrationInput = z.infer<typeof partnerRegistrationInputSchema>

// ---------------------------------------------------------------------------
// KYC
// ---------------------------------------------------------------------------

export const kycDocTypeSchema = z.enum(['aadhaar', 'pan', 'photo', 'bank'])
export type KycDocType = z.infer<typeof kycDocTypeSchema>

export const kycDocumentSchema = z.object({
  id: z.string().min(1),
  partnerId: z.string().min(1),
  type: kycDocTypeSchema,
  /** Storage path, readable by the partner and admins only. */
  filePath: z.string().min(1),
  status: z.enum(['pending', 'approved', 'rejected']),
  rejectReason: z.string().max(300).optional(),
  /** Admin uid. */
  reviewedBy: z.string().min(1).optional(),
  uploadedAt: z.number().int().min(0),
  reviewedAt: z.number().int().min(0).optional(),
})
export type KycDocument = z.infer<typeof kycDocumentSchema>

// ---------------------------------------------------------------------------
// Payouts
// ---------------------------------------------------------------------------

/**
 * One week's money for one technician: what their jobs earned, the
 * platform's commission, and what is paid out. `net` is stored rather than
 * worked out so a later commission change cannot rewrite a paid payout.
 */
export const payoutSchema = z.object({
  id: z.string().min(1),
  partnerId: z.string().min(1),
  periodStart: z.number().int().min(0),
  periodEnd: z.number().int().min(0),
  gross: paiseSchema,
  commission: paiseSchema,
  net: paiseSchema,
  jobIds: z.array(z.string().min(1)),
  status: z.enum(['pending', 'approved', 'paid']),
  /** Admin uid who approved it. */
  approvedBy: z.string().min(1).optional(),
  paidAt: z.number().int().min(0).optional(),
})
export type Payout = z.infer<typeof payoutSchema>

// ---------------------------------------------------------------------------
// Coupons
// ---------------------------------------------------------------------------

export const couponSchema = z.object({
  /** What the customer types, upper case. */
  code: z.string().trim().min(3).max(20).regex(/^[A-Z0-9]+$/),
  kind: z.enum(['flat', 'percent']),
  /** Paise for `flat`, whole percent (1–100) for `percent`. */
  value: z.number().int().positive(),
  minOrder: paiseSchema.optional(),
  /** Caps a `percent` coupon. */
  maxDiscount: paiseSchema.optional(),
  /** Category ids (catalog-v2); empty or missing means every category. */
  categoryIds: z.array(z.string().min(1)).optional(),
  validFrom: z.number().int().min(0),
  validTill: z.number().int().min(0),
  usageLimit: z.number().int().positive().optional(),
  perCustomerLimit: z.number().int().positive().optional(),
  active: z.boolean(),
})
export type Coupon = z.infer<typeof couponSchema>
