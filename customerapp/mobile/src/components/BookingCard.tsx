import { View } from 'react-native'
import type { Href } from 'expo-router'
import { CalendarDays, ChevronRight, MapPin } from 'lucide-react-native'
import type { Booking } from '@app/shared'
import { CardLink } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { Text } from '@/components/ui/Text'
import { StatusBadge } from '@/components/ui/States'
import { formatPaise, formatSlotWindow, relativeDateLabel } from '@/lib/format'
import { STATUS_PRESENTATION } from '@/lib/status'
import { cn } from '@/lib/cn'

/**
 * One booking in the list. It leads with what the customer is looking for — the
 * service and when someone is coming — and puts the reference last, because the
 * reference only matters once they are talking to support about it.
 */

export interface BookingCardProps {
  booking: Pick<Booking, 'id' | 'displayId' | 'status' | 'slot' | 'price' | 'address' | 'technicianSnapshot'>
  /** The catalog name for the booked service, resolved by the caller. */
  serviceName: string
  className?: string
}

export function BookingCard({ booking, serviceName, className }: BookingCardProps) {
  const { description } = STATUS_PRESENTATION[booking.status]

  return (
    <CardLink
      href={`/bookings/detail?id=${booking.id}` as Href}
      ariaLabel={`${serviceName}, ${booking.displayId}`}
      className={cn('p-4', className)}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="text-base font-semibold text-ink">
            {serviceName}
          </Text>
          <Text className="mt-0.5 text-xs text-muted">{description}</Text>
        </View>
        <StatusBadge status={booking.status} />
      </View>

      <View className="mt-3 gap-1.5">
        <View className="flex-row items-center gap-2" accessibilityLabel="Slot">
          <Icon as={CalendarDays} className="size-4 text-muted" />
          <Text className="min-w-0 flex-1 text-sm text-ink">
            {relativeDateLabel(booking.slot.date)}, {formatSlotWindow(booking.slot.start, booking.slot.end)}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Icon as={MapPin} className="size-4 text-muted" />
          <Text numberOfLines={1} className="min-w-0 flex-1 text-sm text-muted">
            {booking.address.area}, {booking.address.city}
          </Text>
        </View>
      </View>

      <View className="mt-3 flex-row items-center justify-between border-t border-border pt-3">
        <Text className="text-xs text-muted">{booking.displayId}</Text>
        <View className="flex-row items-center gap-1">
          <Text className="text-sm font-semibold text-ink">{formatPaise(booking.price.total)}</Text>
          <Icon as={ChevronRight} className="size-4 text-muted" />
        </View>
      </View>
    </CardLink>
  )
}
