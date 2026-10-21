import { useEffect, useState } from 'react'
import { rejectJob } from '@/lib/data'

/** How long a technician has to answer a new request. */
export const OFFER_SECONDS = 30

// When each offer was first shown, so moving between the popup and the full
// details screen does not restart its clock.
const shownAt = new Map<string, number>()
const expired = new Set<string>()

/** The first time `id` was on screen; `now` the first time it is asked. */
function firstShown(id: string, now: number): number {
  if (!shownAt.has(id)) shownAt.set(id, now)
  return shownAt.get(id)!
}

/**
 * Seconds left to answer offer `id`. At zero the offer is turned down
 * automatically (dispatch then tries the next technician), once.
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

  useEffect(() => {
    if (id && left === 0 && !expired.has(id)) {
      expired.add(id)
      rejectJob(id).catch(() => undefined)
    }
  }, [id, left])

  return left
}
