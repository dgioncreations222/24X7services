import { useEffect } from 'react'
import { router, useLocalSearchParams, usePathname, type Href } from 'expo-router'
import type { Booking, BookingEvent } from '@app/shared'

import { Header, Screen } from '@/components/Screen'
import { ErrorState, Skeleton, SkeletonGroup } from '@/components/ui/States'
import { useAuth } from '@/lib/auth'
import { useBookingLive } from '@/lib/useBookingLive'

/**
 * The frame every screen about one booking sits in.
 *
 * All of them take the booking as `?id=`, all of them need the customer signed
 * in, and all of them have the same three ways of going wrong — no id, not
 * signed in, no such booking. Doing that once means the screens behind it only
 * contain what makes them different from each other.
 *
 * A booking that belongs to someone else is reported as missing, not forbidden.
 * "You cannot see this" confirms it exists.
 */

export interface BookingData {
  booking: Booking
  events: BookingEvent[]
}

export interface BookingShellProps {
  title: string
  subtitle?: string
  /** Where back goes when this screen was opened from a link. */
  backFallback?: Href
  right?: React.ReactNode
  /**
   * The bar pinned under the scroll (a StickyCTA), once the booking is in. On
   * the web this sat inside the page as a fixed element; here it has to be
   * Screen's footer to stay put.
   */
  footer?: (data: BookingData) => React.ReactNode
  onRefresh?: () => void
  refreshing?: boolean
  children: (data: BookingData) => React.ReactNode
}

export function BookingShell({
  title,
  subtitle,
  backFallback = '/bookings',
  right,
  footer,
  onRefresh,
  refreshing,
  children,
}: BookingShellProps) {
  const pathname = usePathname()
  const { id } = useLocalSearchParams<{ id?: string }>()
  const bookingId = typeof id === 'string' && id ? id : null
  const { user, ready } = useAuth()

  const { booking, events, status } = useBookingLive(ready && user ? bookingId : null)

  useEffect(() => {
    if (ready && !user) {
      const here = bookingId ? `${pathname}?id=${bookingId}` : pathname
      router.replace(`/login?next=${encodeURIComponent(here)}` as Href)
    }
  }, [ready, user, pathname, bookingId])

  const loaded = ready && status === 'ready' && booking ? { booking, events } : null

  return (
    <Screen
      header={
        <Header
          title={title}
          {...(subtitle ? { subtitle } : {})}
          showBack
          backFallback={backFallback}
          right={right}
        />
      }
      footer={loaded && footer ? footer(loaded) : undefined}
      {...(onRefresh ? { onRefresh } : {})}
      {...(refreshing === undefined ? {} : { refreshing })}
    >
      {!ready || status === 'loading' ? (
        <SkeletonGroup label="Loading" className="mt-6 gap-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-40 w-full" />
        </SkeletonGroup>
      ) : status === 'missing' ? (
        <ErrorState
          className="py-20"
          kind="notFound"
          title="We could not find that booking"
          description="It may have been removed, or the link may be out of date."
        />
      ) : status === 'error' || !booking ? (
        <ErrorState className="py-20" />
      ) : (
        children({ booking, events })
      )}
    </Screen>
  )
}
