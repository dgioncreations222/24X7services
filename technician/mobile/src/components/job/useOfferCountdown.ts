import { useEffect, useState } from 'react'
import { isNetworkError, rejectJob } from '@/lib/data'

/** How long a technician has to answer a new request. */
export const OFFER_SECONDS = 30

// When each offer was first shown, so moving between the popup and the full
// details screen does not restart its clock.
const shownAt = new Map<string, number>()
/** How long to wait before declining an expired offer again after a failure. */
const RETRY_MS = 5_000
const expired = new Set<string>()
// Offers whose accept or reject is in flight: the clock must not decline them meanwhile.
const answering = new Set<string>()

/** Wrap the technician's own answer so the countdown holds off until it lands. */
export async function answerOffer<T>(id: string, answer: () => Promise<T>): Promise<T> {
  answering.add(id)
  try {
    return await answer()
  } finally {
    answering.delete(id)
  }
}

/** The first time `id` was on screen; `now` the first time it is asked. */
function firstShown(id: string, now: number): number {
  if (!shownAt.has(id)) shownAt.set(id, now)
  return shownAt.get(id)!
}

/**
 * Decline an expired offer, once. If the network dropped the answer, the id
 * is freed again after RETRY_MS so any clock still showing the offer (pop-up,
 * Home, request screen) declines it on its next tick. The retry belongs to
 * the module, not a component, so closing a screen cannot cancel it. Any other
 * failure (already answered, gone) is final.
 */
export function autoDecline(id: string, decline: (id: string) => Promise<unknown> = rejectJob) {
  if (expired.has(id) || answering.has(id)) return
  expired.add(id)
  decline(id).catch((e: unknown) => {
    if (isNetworkError(e)) setTimeout(() => expired.delete(id), RETRY_MS)
  })
}

/**
 * Seconds left to answer offer `id`. At zero the offer is turned down
 * automatically (dispatch then tries the next technician).
 */
export function useOfferCountdown(id: string | undefined): number {
  const [now, setNow] = useState(() => Date.now())
  const start = id ? firstShown(id, now) : now
  const left = Math.max(0, OFFER_SECONDS - Math.floor((now - start) / 1000))

  useEffect(() => {
    if (!id) return
    const timer = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(timer)
  }, [id])

  // `now` keeps ticking while left stays at 0, so a freed id is declined again.
  useEffect(() => {
    if (id && left === 0) autoDecline(id)
  }, [id, left, now])

  return left
}
