import { useCallback, useEffect } from 'react'
import { View } from 'react-native'
import { router, useLocalSearchParams, type Href } from 'expo-router'
import { CalendarCheck, Check, Clock, MapPin, type LucideIcon } from 'lucide-react-native'
import type { Booking } from '@app/shared'

import { Header, Screen } from '@/components/Screen'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { Tappable } from '@/components/ui/Tappable'
import { Text } from '@/components/ui/Text'
import { StatusBadge , ErrorState } from '@/components/ui/States'

import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { fetchBooking } from '@/lib/api/booking'
import { useAuth } from '@/lib/auth'
import { formatPaise, formatSlotWindow, relativeDateLabel, shortAddress } from '@/lib/format'
import { useAsync } from '@/lib/useAsync'

/**
 * Done.
 *
 * It shows the reference first, because that is the thing a customer will be
 * asked for if they ring up, and then exactly what happens next in the order it
 * happens. No confetti and no "thank you for your order" — this is a stranger
 * coming to someone's home, and what they want to know is when, who, and what
 * it will cost.
 *
 * The booking is read back from Firestore rather than passed through the URL.
 * What is shown is what was actually written.
 */
export default function ConfirmedScreen() {
  const { b } = useLocalSearchParams<{ b?: string }>()
  const bookingId = typeof b === 'string' && b ? b : null
  const { user, ready } = useAuth()

  const load = useCallback(async (): Promise<Booking | null> => {
    if (!bookingId) return null
    return fetchBooking(bookingId)
  }, [bookingId])

  const booking = useAsync(load)

  useEffect(() => {
    if (ready && !user) router.replace('/login')
  }, [ready, user])

  return (
    <Screen
      // Back goes forward. The flow behind this screen no longer exists — the
      // slot is taken and the money is in — so walking into it would offer to
      // book a booking that has already happened.
      header={<Header showBack onBack={() => router.replace('/bookings')} />}
      contentClassName="px-4 pb-16"
    >
      {booking.status === 'loading' ? (
        <SkeletonGroup label="Loading" className="mt-8 gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </SkeletonGroup>
      ) : booking.status === 'error' || !booking.data ? (
        <ErrorState
          className="py-20"
          kind="notFound"
          title="We could not find that booking"
          description="It may still be on its way. Your bookings list will have it."
          onRetry={booking.reload}
          retrying={booking.refreshing}
        />
      ) : (
        <Confirmed booking={booking.data} />
      )}
    </Screen>
  )
}

const NEXT_STEPS = [
  'We assign a verified expert and tell you who is coming.',
  'They call before setting off, and you can follow them on the map.',
  'They inspect the appliance and quote any repair, itemised.',
  'Work starts only once you approve it. Then your invoice and warranty appear here.',
]

function Confirmed({ booking }: { booking: Booking }) {
  const awaitingPayment = booking.status === 'pending_payment'

  return (
    <>
      <View className="mt-8 items-center">
        <View className="size-14 items-center justify-center rounded-full bg-success-soft">
          <Icon as={Check} className="size-7 text-success" />
        </View>
        <Text accessibilityRole="header" className="mt-3 text-center text-2xl font-bold text-ink">
          {awaitingPayment ? 'Slot held' : 'Booking confirmed'}
        </Text>
        <Text className="mt-1 text-center text-sm text-muted">
          Reference <Text className="text-sm font-semibold text-ink">{booking.displayId}</Text>
        </Text>
        <StatusBadge className="mt-3" status={booking.status} />
      </View>

      <Card className="mt-6 gap-4 p-4">
        <Row
          icon={CalendarCheck}
          label="When"
          value={`${relativeDateLabel(booking.slot.date)}, ${formatSlotWindow(booking.slot.start, booking.slot.end)}`}
        />
        <Row icon={MapPin} label="Where" value={shortAddress(booking.address)} />
        <Row
          icon={Clock}
          label={booking.payment.status === 'paid' ? 'Visit fee paid' : 'Visit fee'}
          value={`${formatPaise(booking.price.visitFee)}${
            booking.payment.mode === 'pay_after_service' ? ' — due after the service' : ''
          }`}
        />
      </Card>

      <View className="mt-7">
        <Text accessibilityRole="header" className="mb-2 text-sm font-semibold text-muted">
          What happens now
        </Text>
        <View className="gap-2">
          {NEXT_STEPS.map((step, index) => (
            <Card key={step} className="flex-row items-start gap-3 p-4">
              <View className="size-6 items-center justify-center rounded-full bg-ink">
                <Text className="text-xs font-bold text-bg">{index + 1}</Text>
              </View>
              <Text className="flex-1 text-sm leading-[22px] text-ink">{step}</Text>
            </Card>
          ))}
        </View>
      </View>

      <View className="mt-7 gap-3">
        <Tappable
          href={`/bookings/detail?id=${booking.id}` as Href}
          className="min-h-12 items-center justify-center rounded-pill bg-ink px-5"
        >
          <Text className="text-base font-semibold text-bg">View this booking</Text>
        </Tappable>
        <Tappable
          href="/home"
          className="min-h-12 items-center justify-center rounded-pill border border-ink px-5"
        >
          <Text className="text-base font-semibold text-ink">Back to home</Text>
        </Tappable>
      </View>
    </>
  )
}

function Row({ icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <View className="flex-row items-start gap-3">
      <Icon as={icon} className="mt-0.5 size-4 text-muted" />
      <View className="min-w-0 flex-1">
        <Text className="text-xs text-muted">{label}</Text>
        <Text className="mt-0.5 text-sm font-medium leading-[22px] text-ink">{value}</Text>
      </View>
    </View>
  )
}
