import { View } from 'react-native'
import type { Href } from 'expo-router'
import { Check, FileText, ShieldCheck, Star } from 'lucide-react-native'
import type { Booking, BookingEvent } from '@app/shared'

import { BookingShell } from '@/components/BookingShell'
import { PriceSummary } from '@/components/PriceSummary'
import { StatusTimeline } from '@/components/StatusTimeline'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Text } from '@/components/ui/Text'
import { EmptyState } from '@/components/ui/States'
import { formatPaise } from '@/lib/format'
import { BlockTitle, SecondaryLink, useSettle } from '@/screens/bookings/parts'

/**
 * The job, closed out.
 *
 * What is left after a visit is three things, and they are the three things on
 * this screen: what it cost, the paperwork it produced, and the chance to say
 * how it went. Anything still owed is the first thing, because a bill nobody
 * mentions is a bill that turns into a phone call.
 */
export default function CompletedScreen() {
  return (
    <BookingShell title="Job complete">
      {({ booking, events }) => <Completed booking={booking} events={events} />}
    </BookingShell>
  )
}

function Completed({ booking, events }: { booking: Booking; events: BookingEvent[] }) {
  const { paying, settle } = useSettle(booking.id, 'final_due')

  if (booking.status !== 'completed') {
    return (
      <EmptyState
        className="py-16"
        icon={Check}
        title="Not finished yet"
        description="This screen fills in once your expert marks the job complete."
        action={{
          label: 'See the booking',
          href: `/bookings/detail?id=${booking.id}` as Href,
        }}
      />
    )
  }

  return (
    <>
      <View className="mt-6 items-center">
        <View className="size-14 items-center justify-center rounded-full bg-success-soft">
          <Icon as={Check} className="size-7 text-success" />
        </View>
        <Text accessibilityRole="header" className="mt-3 text-center text-2xl font-bold text-ink">
          All done
        </Text>
        <Text className="mt-1 text-center text-sm text-muted">
          {booking.displayId}
          {booking.technicianSnapshot ? ` · ${booking.technicianSnapshot.name}` : ''}
        </Text>
      </View>

      {booking.price.due > 0 ? (
        <Card className="mt-6 border-warning p-4">
          <Text className="text-sm font-semibold text-ink">{formatPaise(booking.price.due)} still to pay</Text>
          <Text className="mt-0.5 text-sm text-muted">The visit fee and everything you approved.</Text>
          <Button className="mt-3" fullWidth loading={paying} onPress={() => void settle()}>
            {`Pay ${formatPaise(booking.price.due)}`}
          </Button>
        </Card>
      ) : null}

      <PriceSummary className="mt-6" price={booking.price} />

      <View className="mt-6 gap-3">
        <SecondaryLink href={`/bookings/invoice?id=${booking.id}` as Href} label="Invoice" icon={FileText} />
        <SecondaryLink href={`/bookings/warranty?id=${booking.id}` as Href} label="Warranty" icon={ShieldCheck} />
        <SecondaryLink
          href={`/bookings/review?id=${booking.id}` as Href}
          label={booking.reviewId ? 'Your review' : 'Rate this job'}
          icon={Star}
        />
      </View>

      <View className="mt-7">
        <BlockTitle>What happened</BlockTitle>
        <StatusTimeline events={events} />
      </View>
    </>
  )
}
