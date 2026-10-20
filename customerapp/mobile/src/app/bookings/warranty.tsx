import { useCallback } from 'react'
import { View } from 'react-native'
import type { Href } from 'expo-router'
import { Check, ShieldCheck, ShieldX, X } from 'lucide-react-native'
import type { Booking, Warranty } from '@app/shared'

import { BookingShell } from '@/components/BookingShell'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { Tappable } from '@/components/ui/Tappable'
import { Text } from '@/components/ui/Text'
import { EmptyState , ErrorState } from '@/components/ui/States'

import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { fetchWarranty } from '@/lib/api/warranty'
import { daysUntil, formatDateTime } from '@/lib/format'
import { useAsync } from '@/lib/useAsync'
import { cn } from '@/lib/cn'
import { BlockTitle } from '@/screens/bookings/parts'

/**
 * What the service warranty covers, and what it does not.
 *
 * Both lists, side by side, at the same size. A warranty that prints what it
 * covers in bold and what it excludes in grey at the bottom is a warranty
 * written to be misread, and the argument it saves today costs more later.
 *
 * The terms come from the warranty document rather than from config, because
 * they were agreed on the day the job finished and must keep saying that.
 */
export default function WarrantyScreen() {
  return (
    <BookingShell title="Service warranty">
      {({ booking }) => <WarrantyBody booking={booking} />}
    </BookingShell>
  )
}

function WarrantyBody({ booking }: { booking: Booking }) {
  const warrantyId = booking.warrantyId

  const load = useCallback(async (): Promise<Warranty | null> => {
    if (!warrantyId) return null
    return fetchWarranty(warrantyId)
  }, [warrantyId])

  const warranty = useAsync(load)

  if (!warrantyId) {
    return (
      <EmptyState
        className="py-16"
        icon={ShieldCheck}
        title="No warranty yet"
        description="A service warranty starts the moment a job is marked complete."
      />
    )
  }

  if (warranty.status === 'loading') {
    return (
      <SkeletonGroup label="Loading warranty" className="mt-6 gap-3">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-40 w-full" />
      </SkeletonGroup>
    )
  }

  if (warranty.status === 'error' || !warranty.data) {
    return <ErrorState className="py-16" onRetry={warranty.reload} retrying={warranty.refreshing} />
  }

  const remaining = daysUntil(warranty.data.expiresAt)
  const active = remaining > 0

  return (
    <>
      <Card className="mt-5 items-center p-5">
        <View
          className={cn('size-14 items-center justify-center rounded-full', active ? 'bg-success-soft' : 'bg-surface')}
        >
          {active ? (
            <Icon as={ShieldCheck} className="size-7 text-success" />
          ) : (
            <Icon as={ShieldX} className="size-7 text-muted" />
          )}
        </View>
        <Text className="mt-3 text-center text-2xl font-bold text-ink">
          {active ? (remaining === 1 ? '1 day left' : `${remaining} days left`) : 'Expired'}
        </Text>
        <Text className="mt-1 text-center text-sm text-muted">
          {active ? 'Valid until' : 'Expired on'} {formatDateTime(warranty.data.expiresAt)}
        </Text>
      </Card>

      <View className="mt-6">
        <BlockTitle className="mb-2">What is covered</BlockTitle>
        <View className="gap-2">
          {warranty.data.covers.map((line) => (
            <Card key={line} className="flex-row items-start gap-3 p-4">
              <Icon as={Check} className="mt-0.5 size-4 text-success" />
              <Text className="min-w-0 flex-1 text-sm leading-[22px] text-ink">{line}</Text>
            </Card>
          ))}
        </View>
      </View>

      <View className="mt-6">
        <BlockTitle className="mb-2">What is not covered</BlockTitle>
        <View className="gap-2">
          {warranty.data.excludes.map((line) => (
            <Card key={line} className="flex-row items-start gap-3 p-4">
              <Icon as={X} className="mt-0.5 size-4 text-muted" />
              <Text className="min-w-0 flex-1 text-sm leading-[22px] text-ink">{line}</Text>
            </Card>
          ))}
        </View>
      </View>

      {active ? (
        <Card className="mt-6 p-4">
          <Text className="text-sm leading-[22px] text-muted">
            If the same fault comes back while this is valid, open a support request against booking{' '}
            {booking.displayId} and the return visit costs nothing.
          </Text>
          <Tappable
            href={'/support' as Href}
            className="mt-3 min-h-11 justify-center self-start rounded-pill border border-ink px-5"
          >
            <Text className="text-sm font-semibold text-ink">Report the same fault</Text>
          </Tappable>
        </Card>
      ) : null}
    </>
  )
}
