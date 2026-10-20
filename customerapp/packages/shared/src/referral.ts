import { z } from 'zod'
import { CODE_PREFIX, withoutCodePrefix } from './giftcard'
import { paiseSchema, type Paise } from './money'

/**
 * Bringing someone in, and what both people get for it.
 *
 * The rule is one sentence and the code is built to make it true: nobody is
 * paid until the person they brought in has had a job finished. Not signed up,
 * not booked — finished. Every other moment is one somebody can manufacture
 * from a second phone number, and a referral scheme that pays on sign-up is a
 * sign-up scheme.
 *
 * Both sides are paid at that same moment, which also settles the question of
 * what the new customer gets: credits on their balance, not a discount on the
 * booking that earns them. A discount at checkout would have to survive
 * cancellation, partial approval and a refund; credits after the fact do not.
 */

/** What the person who shared the code gets. */
export const REFERRAL_REWARD = 25_000 as Paise // ₹250
/** What the person who used it gets, at the same moment. */
export const REFERRAL_WELCOME = 25_000 as Paise // ₹250

/**
 * `<prefix>-ABCDEF`, with the gift card's prefix. Same alphabet as a gift card
 * — no O, 0, I or 1 — because this is read off one phone screen and typed
 * into another.
 */
export const REFERRAL_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
/** What a referral code looks like, for screens to show as an example. */
export const REFERRAL_CODE_EXAMPLE = `${CODE_PREFIX}-ABCDEF`
export const referralCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(
    new RegExp(`^${CODE_PREFIX}-[${REFERRAL_CODE_ALPHABET}]{6}$`),
    `A referral code looks like ${REFERRAL_CODE_EXAMPLE}`
  )

export function normaliseReferralCode(input: string): string {
  const body = withoutCodePrefix(input)
  if (body.length !== 6) return input.trim().toUpperCase()
  return `${CODE_PREFIX}-${body}`
}

/**
 * One per customer, keyed by uid, written only by the server.
 *
 * `referredBy` is on the same document as the code the customer hands out,
 * which is deliberate: both halves of a referral are one fact about this
 * account, and keeping them apart is how a reward gets paid twice.
 */
export const referralSchema = z.object({
  code: referralCodeSchema,
  /** How many people have completed a first job on this code. */
  invited: z.number().int().min(0).default(0),
  /** What this account has been paid for those. */
  earned: paiseSchema.default(0),
  /** The uid whose code this customer used, if they used one. */
  referredBy: z.string().min(1).optional(),
  /** Set the moment both sides are paid. Its presence is what stops a second. */
  rewardedAt: z.number().int().min(0).optional(),
  createdAt: z.number().int().min(0),
  updatedAt: z.number().int().min(0),
})
export type Referral = z.infer<typeof referralSchema>

/** The reverse lookup, keyed by the code itself. Never client-readable. */
export const referralCodeDocSchema = z.object({
  uid: z.string().min(1),
  createdAt: z.number().int().min(0),
})
export type ReferralCodeDoc = z.infer<typeof referralCodeDocSchema>

/** The line that goes out on WhatsApp. One place, so it cannot drift. */
export function referralShareText(code: string, url: string): string {
  return (
    `I use 24X7 for appliance repairs — technicians turn up when they say ` +
    `they will. Use my code ${code} on your first booking and we both get ` +
    `₹${REFERRAL_WELCOME / 100} in credits. ${url}`
  )
}
