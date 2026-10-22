import type { PartialBookingDraft, PriceBreakdown } from '@app/shared'
import { kv } from './storage'

/**
 * The booking the payment screen already created for this draft, kept on the
 * device. Without it, leaving the payment screen (or the app) and paying
 * again would create a second booking and hold a second slot. It belongs to
 * one draft: change anything in the draft and it no longer applies.
 *
 * TODO(backend): createBooking should also take an idempotency key, so a
 * retry from another device or a lost response cannot double-book either.
 */

const STORAGE_KEY = 'customerapp.pendingBooking.v1'

export interface PendingBooking {
  id: string
  displayId: string
  price: PriceBreakdown
}

interface Saved extends PendingBooking {
  /** The draft it was created from, as JSON. */
  draft: string
}

/**
 * The draft as text with every object's keys sorted. The draft in memory has
 * its fields in the order they were filled in; the one read back after a
 * restart comes out in schema order. Sorting makes both the same key.
 */
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((k) => [k, canonical((value as Record<string, unknown>)[k])])
    )
  return value
}

const keyOf = (draft: PartialBookingDraft) => JSON.stringify(canonical(draft))

/** The booking created for exactly this draft, if there is one. */
export function readPendingBooking(draft: PartialBookingDraft): PendingBooking | null {
  try {
    const raw = kv.getItem(STORAGE_KEY)
    if (!raw) return null
    const saved = JSON.parse(raw) as Saved
    if (saved.draft !== keyOf(draft)) return null
    return { id: saved.id, displayId: saved.displayId, price: saved.price }
  } catch {
    return null
  }
}

export function savePendingBooking(draft: PartialBookingDraft, booking: PendingBooking): void {
  try {
    kv.setItem(STORAGE_KEY, JSON.stringify({ ...booking, draft: keyOf(draft) } satisfies Saved))
  } catch {
    // Storage blocked: the screen still holds it for this session.
  }
}

export function clearPendingBooking(): void {
  try {
    kv.removeItem(STORAGE_KEY)
  } catch {
    // Nothing to clear.
  }
}
