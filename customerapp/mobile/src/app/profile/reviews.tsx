import { useCallback } from 'react'
import { View } from 'react-native'
import { Star } from 'lucide-react-native'
import type { Booking } from '@app/shared'

import { ProfileShell, SignInPrompt } from '@/components/ProfileShell'
import { ReviewCard } from '@/components/ReviewCard'
import { EmptyState , ErrorState } from '@/components/ui/States'

import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { fetchAllServices } from '@/lib/catalog'
import { fetchBooking } from '@/lib/api/booking'
import { fetchMyReviews } from '@/lib/api/reviews'
import { useAsync } from '@/lib/useAsync'

/**
 * What this customer told us, kept where they can read it back.
 *
 * Read-only. A review is a record of what someone thought at the time, and one
 * that can be quietly rewritten later is worth less to everyone — including the
 * next customer reading a technician's rating.
 */
export default function ReviewsScreen() {
  return (
    <ProfileShell
      title="Your reviews"
      signedOut={
        <SignInPrompt
          icon={Star}
          title="What you told us"
          description="What you told us about a finished job, and what we did about it. Log in to see yours."
        />
      }
    >
      {(user) => <ReviewList uid={user.uid} />}
    </ProfileShell>
  )
}

function ReviewList({ uid }: { uid: string }) {
  const load = useCallback(async () => {
    const [reviews, services] = await Promise.all([fetchMyReviews(uid), fetchAllServices()])

    // The service a review was left against lives on its booking. The review
    // carries the booking id, so each is one document read by key rather than a
    // query — no second index, and nothing to keep in step.
    const bookings = new Map<string, Booking>()
    await Promise.all(
      reviews.map(async (review) => {
        const booking = await fetchBooking(review.bookingId)
        if (booking) bookings.set(review.id, booking)
      })
    )

    return { reviews, services, bookings }
  }, [uid])

  const data = useAsync(load)

  if (data.status === 'loading') {
    return (
      <SkeletonGroup label="Loading reviews" className="mt-6 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </SkeletonGroup>
    )
  }

  if (data.status === 'error') {
    return <ErrorState className="py-16" onRetry={data.reload} retrying={data.refreshing} />
  }

  if ((data.data?.reviews.length ?? 0) === 0) {
    return (
      <EmptyState
        className="py-16"
        icon={Star}
        title="You have not rated anything yet"
        description="After a job is finished you can rate the service and the expert. It takes a tap."
        action={{ label: 'See your bookings', href: '/bookings' }}
      />
    )
  }

  return (
    <View className="mt-5 gap-3">
      {data.data?.reviews.map((review) => {
        const booking = data.data?.bookings.get(review.id)
        const serviceName = booking
          ? data.data?.services.find(
              (service) => service.applianceId === booking.applianceId && service.serviceKey === booking.serviceKey
            )?.name
          : undefined
        const technicianName = booking?.technicianSnapshot?.name
        return (
          <ReviewCard
            key={review.id}
            review={review}
            {...(serviceName ? { serviceName } : {})}
            {...(technicianName ? { technicianName } : {})}
          />
        )
      })}
    </View>
  )
}
