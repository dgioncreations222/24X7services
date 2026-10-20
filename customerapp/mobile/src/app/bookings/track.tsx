import { View } from 'react-native'
import { Clock, MapPin } from 'lucide-react-native'
import { TRACKABLE_STATUSES, type Booking } from '@app/shared'

import { BookingShell } from '@/components/BookingShell'
import { TrackingMap } from '@/components/TrackingMap'
import { TechnicianCard } from '@/components/TechnicianCard'
import { StatusBadge } from '@/components/ui/States'
import { JobOtpPanel } from '@/components/JobOtpPanel'
import { Card } from '@/components/ui/Card'
import { Text } from '@/components/ui/Text'
import { useTracking } from '@/lib/useTracking'
import { relativeTime, shortAddress } from '@/lib/format'
import { STATUS_PRESENTATION } from '@/lib/status'
import { BlockTitle, Row } from '@/screens/bookings/parts'

/**
 * Where the expert is.
 *
 * The ETA leads, because it is the only thing on this screen anyone is actually
 * waiting for — the map shows it, the number says it. Both come from the
 * tracking document the technician's side writes; nothing here estimates
 * anything, so the app never contradicts what the expert was told.
 *
 * "Last updated" is shown rather than hidden. A position that stopped moving
 * ten minutes ago is worth knowing about, and a stale marker with no timestamp
 * is how a customer ends up waiting at a window for someone who is stuck in
 * traffic with no signal.
 */
export default function TrackScreen() {
  return (
    <BookingShell title="Track your expert">
      {({ booking }) => <Track booking={booking} />}
    </BookingShell>
  )
}

function Track({ booking }: { booking: Booking }) {
  const tracking = useTracking(booking.id)
  const onTheWay = TRACKABLE_STATUSES.includes(booking.status)
  const eta = tracking?.etaMinutes ?? booking.etaMinutes

  return (
    <>
      <View className="mt-5 flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text accessibilityRole="header" className="text-xl font-bold text-ink">
            {STATUS_PRESENTATION[booking.status].label}
          </Text>
          <Text className="mt-0.5 text-sm text-muted">{STATUS_PRESENTATION[booking.status].description}</Text>
        </View>
        <StatusBadge status={booking.status} />
      </View>

      <TrackingMap
        className="mt-5"
        {...(tracking?.techLocation ? { technician: tracking.techLocation } : {})}
        {...(tracking?.customerLocation ?? booking.address.geo
          ? { customer: tracking?.customerLocation ?? booking.address.geo }
          : {})}
      />

      <Card className="mt-4 gap-4 p-4">
        <Row icon={Clock} label="Arriving in">
          <Text className="text-lg font-bold text-ink">
            {!onTheWay
              ? '—'
              : eta === undefined
                ? 'Working it out'
                : eta <= 1
                  ? 'Any moment'
                  : `About ${eta} minutes`}
          </Text>
          {tracking?.updatedAt ? (
            <Text className="mt-0.5 text-xs text-muted">Updated {relativeTime(tracking.updatedAt)}</Text>
          ) : null}
        </Row>

        <Row icon={MapPin} label="Coming to">
          <Text className="text-sm font-medium leading-[22px] text-ink">{shortAddress(booking.address)}</Text>
        </Row>
      </Card>

      {booking.technicianSnapshot ? (
        <View className="mt-6">
          <BlockTitle className="mb-2">Your expert</BlockTitle>
          <TechnicianCard technician={booking.technicianSnapshot} maskedNumber={booking.contact?.maskedNumber} />
        </View>
      ) : null}

      <JobOtpPanel className="mt-6" booking={booking} />

      {!onTheWay ? (
        <Text className="mt-6 text-sm leading-[22px] text-muted">
          Live tracking appears while your expert is on the way. Right now this booking is{' '}
          {STATUS_PRESENTATION[booking.status].label.toLowerCase()}.
        </Text>
      ) : null}
    </>
  )
}
