import { z } from 'zod'
import { paiseSchema } from './money'

/**
 * A part or charge on the admin's rate card, at a fixed price.
 *
 * On site the technician adds extras from this list — the customer sees the
 * same name and price in their app and approves it — or as an "Other" line
 * with a typed name and amount, which also needs the customer's approval.
 * Prices on the card are the whole price to the customer, parts and fitting.
 */
export const rateCardItemSchema = z.object({
  id: z.string().min(1),
  /** Category id (catalog-v2) the item belongs to. */
  categoryId: z.string().min(1),
  name: z.string().trim().min(2).max(80),
  price: paiseSchema,
  /** Hidden items stay on old bookings but cannot be added to new ones. */
  active: z.boolean(),
  order: z.number().int().min(0),
  updatedAt: z.number().int().min(0),
})
export type RateCardItem = z.infer<typeof rateCardItemSchema>

/** An extra added to a booking on site, from the rate card or typed in. */
export const bookingExtraSchema = z.object({
  id: z.string().min(1),
  source: z.enum(['rate_card', 'other']),
  /** Set when `source` is `rate_card`. */
  rateCardItemId: z.string().min(1).optional(),
  name: z.string().trim().min(2).max(80),
  amount: paiseSchema,
  status: z.enum(['pending', 'approved', 'rejected']),
  addedAt: z.number().int().min(0),
  decidedAt: z.number().int().min(0).optional(),
})
export type BookingExtra = z.infer<typeof bookingExtraSchema>
