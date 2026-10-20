import { useEffect, useRef } from 'react'

import type { useLocation } from '@/lib/useLocation'
import { callFn } from '@/lib/callables'
import { LOCATION_STALE_MS } from '@/lib/location'

/**
 * Re-ask whether we still cover the saved pincode, once a day, in the
 * background. It never blocks the screen and it never sends anyone anywhere —
 * the answer only changes what Home says at the top.
 */
export function useStaleLocationCheck(
  location: ReturnType<typeof useLocation>['location'],
  setLocation: ReturnType<typeof useLocation>['setLocation']
): void {
  const checked = useRef<string | null>(null)

  useEffect(() => {
    if (!location) return
    if (Date.now() - location.checkedAt < LOCATION_STALE_MS) return
    // Once per pincode per mount, whatever the network does.
    if (checked.current === location.pincode) return
    checked.current = location.pincode

    let live = true
    callFn('checkServiceability', { pincode: location.pincode })
      .then((result) => {
        if (!live) return
        setLocation({
          pincode: location.pincode,
          city: result.city ?? location.city,
          area: result.area ?? location.area,
          serviceable: result.serviceable,
          checkedAt: Date.now(),
        })
      })
      .catch(() => {
        // Offline, or the call failed. The saved answer stands until it can be
        // asked again; telling someone their area may have changed on the
        // strength of a failed request would be worse than saying nothing.
      })

    return () => {
      live = false
    }
  }, [location, setLocation])
}
