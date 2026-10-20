import { View } from 'react-native'
import type { Href } from 'expo-router'
import { CalendarDays, FileText, MapPin, Navigation, ShieldCheck, Star, Wrench } from 'lucide-react-native'
import { ACTIVE_STATUSES, TRACKABLE_STATUSES, type Booking, type BookingEvent } from '@app/shared'

import { BookingActions } from '@/components/BookingActions'
import { BookingShell } from '@/components/BookingShell'
import { StatusBadge } from '@/components/ui/States'
import { StatusTimeline } from '@/components/StatusTimeline'
import { TechnicianCard } from '@/components/TechnicianCard'
import { PriceSummary } from '@/components/PriceSummary'
import { JobOtpPanel } from '@/components/JobOtpPanel'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Text } from '@/components/ui/Text'
import { formatPaise, formatSlotWindow, relativeDateLabel, shortAddress } from '@/lib/format'
import { STATUS_PRESENTATION } from '@/lib/status'
import { BlockTitle, PrimaryAction, Row, SecondaryLink, useSettle } from '@/screens/bookings/parts'

/**
 * Everything about one booking, and every door out of it.
 *
 * The screen changes shape with the status, because what a customer wants from
 * a booking is different at every stage: before the visit it is when and where,
 * during it it is where the expert is, and after it is the invoice and the
 * warranty. Whatever matters most right now is the first thing on the screen
 * and the only full-width button.
 */
export default function DetailScreen() {
  return (
    <BookingShell title="Your booking" backFallback="/bookings">
      {({ booking, events }) => <Detail booking={booking} events={events} />}
    </BookingShell>
  )
}

function Detail({ booking, events }: { booking: Booking; events: BookingEvent[] }) {
  const { paying, settle } = useSettle(
    booking.id,
    booking.status === 'pending_payment' ? 'visit_fee' : 'final_due'
  )

  const presentation = STATUS_PRESENTATION[booking.status]
  const live = ACTIVE_STATUSES.includes(booking.status)
  const trackable = TRACKABLE_STATUSES.includes(booking.status)

  return (
    <>
      <View className="mt-5 flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text accessibilityRole="header" className="text-xl font-bold text-ink">
            {booking.displayId}
          </Text>
          <Text className="mt-0.5 text-sm text-muted">{presentation.description}</Text>
        </View>
        <StatusBadge status={booking.status} />
      </View>

      {/* The one thing to do right now, whatever that is. */}
      {booking.status === 'awaiting_approval' ? (
        <PrimaryAction
          href={`/bookings/approval?id=${booking.id}` as Href}
          label="Review the quote"
          note="Work is paused until you answer."
          icon={Wrench}
        />
      ) : trackable ? (
        <PrimaryAction
          href={`/bookings/track?id=${booking.id}` as Href}
          label="Track your expert"
          note={booking.etaMinutes ? `About ${booking.etaMinutes} minutes away.` : 'See where they are on the way.'}
          icon={Navigation}
        />
      ) : booking.status === 'in_progress' ? (
        <PrimaryAction
          href={`/bookings/progress?id=${booking.id}` as Href}
          label="See progress"
          note="Follow the job as it happens."
          icon={Wrench}
        />
      ) : null}

      {booking.status === 'pending_payment' || booking.price.due > 0 ? (
        <Card className="mt-4 p-4">
          <Text className="text-sm font-semibold text-ink">
            {booking.status === 'pending_payment'
              ? 'Your slot is held until the visit fee is paid'
              : 'There is a balance to settle'}
          </Text>
          <Text className="mt-0.5 text-sm text-muted">
            {booking.status === 'pending_payment'
              ? 'Pay now to confirm this booking.'
              : 'Pay the remaining amount for this job.'}
          </Text>
          <Button className="mt-3" fullWidth loading={paying} onPress={() => void settle()}>
            {`Pay ${formatPaise(booking.price.due || booking.price.total)}`}
          </Button>
        </Card>
      ) : null}

      {booking.technicianSnapshot ? (
        <View className="mt-6">
          <BlockTitle className="mb-2">Your expert</BlockTitle>
          <TechnicianCard technician={booking.technicianSnapshot} maskedNumber={booking.contact?.maskedNumber} />
        </View>
      ) : null}

      <JobOtpPanel className="mt-6" booking={booking} />

      <Card className="mt-6 gap-4 p-4">
        <Row icon={CalendarDays} label="When">
          <Text className="text-sm font-medium leading-[22px] text-ink">
            {relativeDateLabel(booking.slot.date)}, {formatSlotWindow(booking.slot.start, booking.slot.end)}
          </Text>
        </Row>
        <Row icon={MapPin} label="Where">
          <Text className="text-sm font-medium leading-[22px] text-ink">{shortAddress(booking.address)}</Text>
          {booking.address.landmark ? (
            <Text className="text-xs text-muted">Near {booking.address.landmark}</Text>
          ) : null}
        </Row>
      </Card>

      {booking.status === 'completed' ? (
        <View className="mt-6 gap-3">
          <SecondaryLink href={`/bookings/invoice?id=${booking.id}` as Href} label="Invoice" icon={FileText} />
          <SecondaryLink href={`/bookings/warranty?id=${booking.id}` as Href} label="Warranty" icon={ShieldCheck} />
          <SecondaryLink
            href={`/bookings/review?id=${booking.id}` as Href}
            label={booking.reviewId ? 'Your review' : 'Leave a review'}
            icon={Star}
          />
        </View>
      ) : null}

      <BookingActions booking={booking} />

      <View className="mt-7">
        <BlockTitle>What has happened</BlockTitle>
        <StatusTimeline events={events} live={live} />
      </View>

      <View className="mt-7">
        <BlockTitle>The cost</BlockTitle>
        <PriceSummary price={booking.price} />
      </View>
    </>
  )
}
