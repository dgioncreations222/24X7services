import { useCallback } from 'react'
import { View } from 'react-native'
import { useLocalSearchParams, type Href } from 'expo-router'
import { PackageOpen, WashingMachine } from 'lucide-react-native'

import { ProfileShell, SignInPrompt } from '@/components/ProfileShell'
import { BookingCard } from '@/components/BookingCard'
import { Card } from '@/components/ui/Card'
import { Tappable } from '@/components/ui/Tappable'
import { Text } from '@/components/ui/Text'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { Skeleton, SkeletonGroup } from '@/components/SkeletonLoader'
import { fetchAllServices, fetchAppliances } from '@/lib/catalog'
import { fetchApplianceBookings, fetchMyAppliance } from '@/lib/api/appliances'
import { relativeTime } from '@/lib/format'
import { useAsync } from '@/lib/useAsync'

/**
 * One saved appliance and everything we have done to it.
 *
 * The history is the point. A fridge that has been repaired three times in a
 * year is a fridge worth replacing, and the customer is the only one in a
 * position to draw that conclusion — so the record is theirs to see, plainly,
 * without anyone selling them the fourth repair.
 */
export default function ApplianceDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>()
  const applianceDocId = params.id ?? null

  return (
    <ProfileShell
      title="Appliance"
      backFallback="/profile/appliances"
      signedOut={
        <SignInPrompt
          icon={WashingMachine}
          title="This appliance"
          description="Its details and everything we have ever done to it are on your account. Log in to see them."
          // The only profile screen identified by a query parameter, so it
          // hands the way back over itself rather than losing the id.
          next={
            applianceDocId
              ? `/profile/appliances/detail?id=${encodeURIComponent(applianceDocId)}`
              : '/profile/appliances'
          }
        />
      }
    >
      {(user) => <ApplianceDetail uid={user.uid} applianceDocId={applianceDocId} />}
    </ProfileShell>
  )
}

function ApplianceDetail({ uid, applianceDocId }: { uid: string; applianceDocId: string | null }) {
  const load = useCallback(async () => {
    if (!applianceDocId) return null

    const saved = await fetchMyAppliance(uid, applianceDocId)
    if (!saved) return null

    const [catalog, services, bookings] = await Promise.all([
      fetchAppliances(),
      fetchAllServices(),
      fetchApplianceBookings(uid, applianceDocId),
    ])

    return {
      appliance: saved.appliance,
      lastServicedAt: saved.lastServicedAt,
      applianceName: catalog.find((a) => a.id === saved.appliance.applianceId)?.name ?? saved.appliance.applianceId,
      services,
      bookings,
    }
  }, [uid, applianceDocId])

  const data = useAsync(load)

  if (data.status === 'loading') {
    return (
      <SkeletonGroup label="Loading" className="mt-6 gap-3">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-40 w-full" />
      </SkeletonGroup>
    )
  }

  if (data.status === 'error') {
    return <ErrorState className="py-16" onRetry={data.reload} retrying={data.refreshing} />
  }

  if (!data.data) {
    return (
      <EmptyState
        className="py-16"
        icon={PackageOpen}
        title="We could not find that appliance"
        description="It may have been removed from your saved list."
        action={{ label: 'Back to my appliances', href: '/profile/appliances' }}
      />
    )
  }

  const { appliance, applianceName, lastServicedAt, services, bookings } = data.data

  return (
    <>
      <Card className="mt-5 p-4">
        <Text accessibilityRole="header" className="text-lg font-bold text-ink">
          {appliance.nickname ?? applianceName}
        </Text>
        <View className="mt-3 gap-2">
          <Row label="Appliance" value={applianceName} />
          <Row label="Brand" value={appliance.brandId.toUpperCase()} />
          {appliance.type ? <Row label="Type" value={appliance.type} /> : null}
          {appliance.modelNumber ? <Row label="Model" value={appliance.modelNumber} /> : null}
          <Row label="Last serviced" value={lastServicedAt ? relativeTime(lastServicedAt) : 'Not by us yet'} />
        </View>
      </Card>

      <View className="mt-7">
        <Text accessibilityRole="header" className="mb-3 text-sm font-semibold text-muted">
          Service history
        </Text>

        {bookings.length === 0 ? (
          <Card className="p-4">
            <Text className="text-sm text-muted">Nothing yet. Bookings made against this appliance collect here.</Text>
          </Card>
        ) : (
          <View className="gap-3">
            {bookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                serviceName={
                  services.find(
                    (service) =>
                      service.applianceId === booking.applianceId && service.serviceKey === booking.serviceKey
                  )?.name ?? 'Service'
                }
              />
            ))}
          </View>
        )}
      </View>

      <Tappable
        href={`/services/appliance?a=${appliance.applianceId}` as Href}
        className="mt-6 min-h-12 items-center justify-center rounded-pill border border-ink px-5"
      >
        <Text className="text-sm font-semibold text-ink">Book this appliance again</Text>
      </Tappable>
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-baseline justify-between gap-4">
      <Text className="text-sm text-muted">{label}</Text>
      <Text className="flex-shrink text-right text-sm font-medium text-ink">{value}</Text>
    </View>
  )
}
