import { z } from 'zod'

/**
 * Every enum the frontend and the functions both need lives here, as a zod enum
 * with the TypeScript union derived from it. Deriving the type from the schema
 * (rather than declaring both) means a value can never be valid to the compiler
 * and invalid to the validator.
 */

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export const applianceIdSchema = z.enum([
  'refrigerator',
  'washing-machine',
  'air-conditioner',
  'microwave',
  'geyser',
])
export type ApplianceId = z.infer<typeof applianceIdSchema>
export const APPLIANCE_IDS = applianceIdSchema.options

/**
 * The manufacturers we service.
 *
 * A closed list rather than free text, because a booking's brand decides
 * whether we can take the job at all — the brand-appliance matrix is keyed on
 * it — and "LG", "lg" and "L.G." typed by three people is three brands we do
 * not cover. Adding one means this list, the seed, and the rule that validates
 * a saved appliance; there is no fourth place.
 */
export const brandIdSchema = z.enum(['lg', 'samsung', 'bosch', 'ifb'])
export type BrandId = z.infer<typeof brandIdSchema>
export const BRAND_IDS = brandIdSchema.options

/**
 * Service keys repeat across appliances where the meaning is the same, so a
 * service is identified by the pair (applianceId, serviceKey) rather than by the
 * key alone.
 */
export const serviceKeySchema = z.enum([
  'repair',
  'service',
  'installation',
  'uninstallation',
  'gas-refill',
  'deep-clean',
  'maintenance',
])
export type ServiceKey = z.infer<typeof serviceKeySchema>
export const SERVICE_KEYS = serviceKeySchema.options

// ---------------------------------------------------------------------------
// Booking lifecycle
// ---------------------------------------------------------------------------

/**
 * Forward path: pending_payment -> confirmed -> assigned -> en_route -> arrived
 * -> in_progress -> (awaiting_approval -> in_progress) -> completed.
 * `cancelled`, `refunded` and `failed` are terminal exits from that path.
 */
export const bookingStatusSchema = z.enum([
  'pending_payment',
  'confirmed',
  'assigned',
  'en_route',
  'arrived',
  'in_progress',
  'awaiting_approval',
  'completed',
  'cancelled',
  'refunded',
  'failed',
])
export type BookingStatus = z.infer<typeof bookingStatusSchema>
export const BOOKING_STATUSES = bookingStatusSchema.options

/** Sub-state while the technician is working; only meaningful during in_progress. */
export const bookingStageSchema = z.enum([
  'inspection',
  'diagnosis',
  'repair',
  'testing',
])
export type BookingStage = z.infer<typeof bookingStageSchema>
export const BOOKING_STAGES = bookingStageSchema.options

/**
 * The single source of truth for which status may follow which. Both the
 * simulator and the callables check against this, so an out-of-order write is a
 * rejected transition rather than a booking stuck in an impossible state.
 */
export const BOOKING_STATUS_TRANSITIONS: Readonly<
  Record<BookingStatus, readonly BookingStatus[]>
> = {
  pending_payment: ['confirmed', 'failed', 'cancelled'],
  confirmed: ['assigned', 'cancelled'],
  assigned: ['en_route', 'cancelled'],
  en_route: ['arrived', 'cancelled'],
  arrived: ['in_progress', 'cancelled'],
  in_progress: ['awaiting_approval', 'completed', 'cancelled'],
  awaiting_approval: ['in_progress', 'completed', 'cancelled'],
  completed: [],
  cancelled: ['refunded'],
  refunded: [],
  failed: [],
}

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return BOOKING_STATUS_TRANSITIONS[from].includes(to)
}

/** Statuses that put a booking in the "upcoming" tab. */
export const UPCOMING_STATUSES: readonly BookingStatus[] = [
  'pending_payment',
  'confirmed',
]
/** Statuses that put a booking in the "active" tab, where a technician is on the job. */
export const ACTIVE_STATUSES: readonly BookingStatus[] = [
  'assigned',
  'en_route',
  'arrived',
  'in_progress',
  'awaiting_approval',
]
/** Statuses that put a booking in the "completed" tab. */
export const CLOSED_STATUSES: readonly BookingStatus[] = [
  'completed',
  'cancelled',
  'refunded',
  'failed',
]

/** Live technician location is only meaningful on the way to the customer. */
export const TRACKABLE_STATUSES: readonly BookingStatus[] = ['assigned', 'en_route']

// ---------------------------------------------------------------------------
// Payment
// ---------------------------------------------------------------------------

export const paymentModeSchema = z.enum(['online', 'pay_after_service'])
export type PaymentMode = z.infer<typeof paymentModeSchema>

export const paymentStatusSchema = z.enum([
  'not_required',
  'pending',
  'paid',
  'partially_paid',
  // Paid in full, then part of it given back (a goodwill or partial refund).
  'partially_refunded',
  'failed',
  'refunded',
])
export type PaymentStatus = z.infer<typeof paymentStatusSchema>

/**
 * How a customer would rather settle a bill.
 *
 * A preference, not an instrument. Nothing here is a stored card: the gateway
 * keeps those and we never see them, which is the whole reason this is an
 * enum of three habits rather than a list of last-four digits.
 *
 *   - balance_first  take it off the 24X7 balance, then charge the rest
 *   - online         card, UPI or netbanking, every time
 *   - pay_after_service  settle with the technician once the job is done
 */
export const paymentPreferenceSchema = z.enum([
  'balance_first',
  'online',
  'pay_after_service',
])
export type PaymentPreference = z.infer<typeof paymentPreferenceSchema>
export const PAYMENT_PREFERENCES = paymentPreferenceSchema.options
/** What an account that has never said applies. */
export const DEFAULT_PAYMENT_PREFERENCE: PaymentPreference = 'balance_first'

/** What a Razorpay order is being raised for. */
export const paymentPurposeSchema = z.enum(['visit_fee', 'final_due'])
export type PaymentPurpose = z.infer<typeof paymentPurposeSchema>

/** What a purchase order was raised to buy. */
export const purchaseKindSchema = z.enum(['plan', 'membership', 'gift_card'])
export type PurchaseKind = z.infer<typeof purchaseKindSchema>

// ---------------------------------------------------------------------------
// Job OTPs
// ---------------------------------------------------------------------------

export const otpKindSchema = z.enum(['start', 'complete'])
export type OtpKind = z.infer<typeof otpKindSchema>

// ---------------------------------------------------------------------------
// Repair approval
// ---------------------------------------------------------------------------

export const repairRequestStatusSchema = z.enum([
  'pending',
  'approved',
  'partially_approved',
  'declined',
])
export type RepairRequestStatus = z.infer<typeof repairRequestStatusSchema>

// ---------------------------------------------------------------------------
// Address, technician preference, media
// ---------------------------------------------------------------------------

export const addressLabelSchema = z.enum(['home', 'office', 'other'])
export type AddressLabel = z.infer<typeof addressLabelSchema>

export const techPreferenceSchema = z.enum(['any', 'top_rated', 'specific'])
export type TechPreference = z.infer<typeof techPreferenceSchema>

export const mediaTypeSchema = z.enum(['image', 'video'])
export type MediaType = z.infer<typeof mediaTypeSchema>

// ---------------------------------------------------------------------------
// Support
// ---------------------------------------------------------------------------

export const supportCategorySchema = z.enum([
  'booking',
  'payment',
  'technician',
  'warranty',
  'brand_not_listed',
  'account',
  'other',
])
export type SupportCategory = z.infer<typeof supportCategorySchema>

export const ticketStatusSchema = z.enum(['open', 'in_progress', 'resolved'])
export type TicketStatus = z.infer<typeof ticketStatusSchema>

export const ticketAssigneeSchema = z.enum(['ai', 'human'])
export type TicketAssignee = z.infer<typeof ticketAssigneeSchema>

export const messageAuthorSchema = z.enum(['user', 'ai', 'agent', 'system'])
export type MessageAuthor = z.infer<typeof messageAuthorSchema>

// ---------------------------------------------------------------------------
// Slot availability (derived server-side, never stored)
// ---------------------------------------------------------------------------

export const slotAvailabilitySchema = z.enum([
  'available',
  'limited',
  'unavailable',
])
export type SlotAvailability = z.infer<typeof slotAvailabilitySchema>

/** A window is "limited" once 20% or less of its capacity is left. */
export const LIMITED_SLOT_THRESHOLD = 0.2
