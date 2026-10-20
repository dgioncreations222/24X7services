import { z } from 'zod'
import { bookingStatusSchema } from './enums'
import { paiseSchema } from './money'

/**
 * The generic catalog: Category → sub-category → Service → Questions.
 *
 * The first catalog (catalog.ts) is built around appliances, with the
 * appliances, brands and service keys as closed lists. Adding Cleaning or
 * Salon there means new enum members, a new seed and new screens. Here every
 * id is a plain string and every list is data, so a new category is a new
 * document and nothing else.
 *
 * Deliberately not exported from the package index yet. Its `Address` and
 * `Booking` would collide with the existing ones, and the functions and the
 * web app have not moved over. The mobile app reads it as
 * `@app/shared/catalog-v2` (see its tsconfig paths and metro.config.js). Once
 * the backend has migrated and the appliance enums are gone, this becomes the
 * catalog and the suffix goes.
 *
 * Kinds that change how a screen renders (a question's `kind`, an address
 * label) are still closed. A screen has to know how to draw each one, so
 * those are code. Everything that is content is data.
 */

const idSchema = z.string().min(1)
/** A picture, named the way the app names bundled assets ('/services/ac-repair.jpg') or a full URL. */
const imageSchema = z.string().min(1)

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

/**
 * A top-level category (Appliance Repair, Cleaning, Salon) or, with a
 * `parentId`, one of its sub-categories (AC, Bathroom cleaning, Haircut).
 * One shape for both, so the depth is whatever the data says.
 */
export const categorySchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  /** Sub-categories point at their parent; top-level ones have none. */
  parentId: idSchema.optional(),
  image: imageSchema.optional(),
  /** One line under the name on a tile or a section heading. */
  tagline: z.string().optional(),
  /** Sort order among siblings, lowest first. */
  order: z.number().int(),
})
export type Category = z.infer<typeof categorySchema>

/** One way to buy a service: "1 AC", "2 ACs", "Split", "Window". */
export const serviceVariantSchema = z.object({
  id: idSchema,
  label: z.string().min(1),
  price: paiseSchema,
  /** The struck-through price beside it, when there is one. */
  compareAt: paiseSchema.optional(),
  durationMinutes: z.number().int().positive().optional(),
})
export type ServiceVariant = z.infer<typeof serviceVariantSchema>

export const faqSchema = z.object({
  q: z.string().min(1),
  a: z.string().min(1),
})
export type Faq = z.infer<typeof faqSchema>

/**
 * Something a customer can add to the cart. It belongs to the most specific
 * category it sits in (a sub-category, usually). `price` is what it costs with
 * no variant chosen; a service with variants starts from the cheapest.
 */
export const serviceSchema = z.object({
  id: idSchema,
  categoryId: idSchema,
  name: z.string().min(1),
  image: imageSchema.optional(),
  price: paiseSchema,
  compareAt: paiseSchema.optional(),
  durationMinutes: z.number().int().positive().optional(),
  /** Out of 5, and how many reviews it is the average of. */
  rating: z.number().min(0).max(5).optional(),
  reviewCount: z.number().int().nonnegative().default(0),
  /** Short lines for the card: "Deep cleaning of filters and coils". */
  highlights: z.array(z.string().min(1)).default([]),
  included: z.array(z.string().min(1)).default([]),
  excluded: z.array(z.string().min(1)).default([]),
  faqs: z.array(faqSchema).default([]),
  variants: z.array(serviceVariantSchema).default([]),
  /** Shown in "Most booked" on Home. */
  popular: z.boolean().default(false),
})
export type Service = z.infer<typeof serviceSchema>

/**
 * How a booking question is drawn. A closed list on purpose: each kind is a
 * different control, and a kind no screen knows how to draw is a question
 * nobody can answer.
 */
export const questionKindSchema = z.enum(['single', 'multi', 'text', 'photo'])
export type QuestionKind = z.infer<typeof questionKindSchema>

/**
 * A question the booking asks: "Which brand?", "What is the problem?", "Add a
 * photo". Attached to a service, or to a category so every service under it
 * asks it.
 */
export const questionSchema = z.object({
  id: idSchema,
  /** Exactly one of these is set. */
  serviceId: idSchema.optional(),
  categoryId: idSchema.optional(),
  label: z.string().min(1),
  /** One line of help under the label. */
  hint: z.string().optional(),
  kind: questionKindSchema,
  /** The choices, for `single` and `multi`. */
  options: z.array(z.string().min(1)).default([]),
  required: z.boolean().default(false),
  placeholder: z.string().optional(),
  /** Photos a `photo` question accepts at most. */
  maxPhotos: z.number().int().positive().optional(),
  order: z.number().int(),
}).refine((q) => !!q.serviceId !== !!q.categoryId, {
  // Neither and the question is never asked; both and it is asked of services it is not about.
  message: 'A question belongs to exactly one service or one category',
  path: ['serviceId'],
})
export type Question = z.infer<typeof questionSchema>

/** A customer's answer: the chosen option(s), the text, or the photo URIs. */
export const answerSchema = z.union([z.string(), z.array(z.string())])
export type Answer = z.infer<typeof answerSchema>

// ---------------------------------------------------------------------------
// Cart, address, booking
// ---------------------------------------------------------------------------

export const cartItemSchema = z.object({
  serviceId: idSchema,
  variantId: idSchema.optional(),
  qty: z.number().int().positive(),
  /** The price when it went in the cart, so a catalog change cannot re-price it silently. */
  unitPrice: paiseSchema,
})
export type CartItem = z.infer<typeof cartItemSchema>

export const addressLabelSchema = z.enum(['home', 'work', 'other'])
export type AddressLabel = z.infer<typeof addressLabelSchema>

export const addressSchema = z.object({
  id: idSchema,
  label: addressLabelSchema,
  /** House or flat number, building. */
  line1: z.string().min(1),
  /** Street, area, landmark. */
  line2: z.string().optional(),
  city: z.string().min(1),
  pincode: z.string().regex(/^[1-9][0-9]{5}$/, 'Enter a valid 6-digit pincode'),
  geo: z.object({ lat: z.number(), lng: z.number() }).optional(),
  isDefault: z.boolean().default(false),
})
export type Address = z.infer<typeof addressSchema>

/** A booked slot: a day and a start time, both as the customer picked them. */
export const slotSchema = z.object({
  /** YYYY-MM-DD, local. */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** HH:mm, 24-hour, local. */
  start: z.string().regex(/^\d{2}:\d{2}$/),
})
export type Slot = z.infer<typeof slotSchema>

/** As much of the technician as the customer's screens show. */
export const technicianLiteSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  photo: imageSchema.optional(),
  rating: z.number().min(0).max(5).optional(),
  jobs: z.number().int().nonnegative().optional(),
  phone: z.string().optional(),
})
export type TechnicianLite = z.infer<typeof technicianLiteSchema>

export const priceBreakupSchema = z.object({
  items: paiseSchema,
  discount: paiseSchema.default(0),
  fees: paiseSchema.default(0),
  taxes: paiseSchema.default(0),
  total: paiseSchema,
})
export type PriceBreakup = z.infer<typeof priceBreakupSchema>

/** One moment on the booking's timeline. */
export const bookingEventSchema = z.object({
  status: bookingStatusSchema,
  /** ISO 8601. */
  at: z.string(),
  note: z.string().optional(),
})
export type BookingEvent = z.infer<typeof bookingEventSchema>

/**
 * A booking. The status is the backend's own lifecycle (enums.ts), so the
 * transitions it checks are the ones the screens draw.
 */
export const bookingSchema = z.object({
  id: idSchema,
  uid: idSchema,
  categoryId: idSchema,
  items: z.array(cartItemSchema).min(1),
  /** Question id → answer. */
  answers: z.record(idSchema, answerSchema).default({}),
  address: addressSchema,
  slot: slotSchema,
  status: bookingStatusSchema,
  price: priceBreakupSchema,
  technician: technicianLiteSchema.optional(),
  timeline: z.array(bookingEventSchema).default([]),
  photos: z
    .object({ before: z.array(imageSchema).default([]), after: z.array(imageSchema).default([]) })
    .default({ before: [], after: [] }),
  /** Set once the customer has rated it. */
  rating: z.number().int().min(1).max(5).optional(),
  /** ISO 8601. */
  createdAt: z.string(),
})
export type Booking = z.infer<typeof bookingSchema>
