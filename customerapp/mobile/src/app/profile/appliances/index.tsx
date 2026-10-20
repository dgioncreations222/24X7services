import { useCallback, useState } from 'react'
import { View } from 'react-native'
import type { Href } from 'expo-router'
import { ChevronRight, PackageOpen, Trash2, WashingMachine } from 'lucide-react-native'
import type { CatalogAppliance } from '@app/shared'

import { ProfileShell, SignInPrompt } from '@/components/ProfileShell'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { Tappable } from '@/components/ui/Tappable'
import { Text } from '@/components/ui/Text'
import { ConfirmModal } from '@/components/Modal'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { Skeleton, SkeletonGroup } from '@/components/SkeletonLoader'
import { useToast } from '@/components/Toast'
import { fetchAppliances } from '@/lib/catalog'
import { deleteMyAppliance, fetchMyAppliances, type SavedAppliance } from '@/lib/api/appliances'
import { relativeTime } from '@/lib/format'
import { useAsync } from '@/lib/useAsync'

/**
 * The machines in this customer's home that we know about.
 *
 * They are added by booking, not by filling in a form — the details come from
 * what was told to us when the job was booked, which is the only moment anyone
 * is willing to look behind a fridge for a model number. This screen is where
 * they are reviewed, and where one that has been thrown out is removed.
 */


export default function AppliancesScreen() {
  return (
    <ProfileShell
      title="My appliances"
      signedOut={
        <SignInPrompt
          icon={WashingMachine}
          title="Your appliances"
          description="Save the make and model of what you own and booking a repair takes two taps. Log in to see yours."
        />
      }
    >
      {(user) => <ApplianceList uid={user.uid} />}
    </ProfileShell>
  )
}

/**
 * The heading in the body, under the bar: what you are looking at, in the
 * customer's words, at a size worth reading.
 */
function PageTitle() {
  return (
    <Text accessibilityRole="header" className="mt-6 text-2xl font-bold text-ink">
      Your appliances
    </Text>
  )
}

function ApplianceList({ uid }: { uid: string }) {
  const toast = useToast()
  const [deleting, setDeleting] = useState<SavedAppliance | null>(null)
  const [busy, setBusy] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const load = useCallback(async () => {
    const [saved, catalog] = await Promise.all([fetchMyAppliances(uid), fetchAppliances()])

    return { saved, catalog }
    // reloadKey is the point: bumping it re-runs the load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, reloadKey])

  const data = useAsync(load)

  async function remove(appliance: SavedAppliance): Promise<void> {
    setBusy(true)
    try {
      await deleteMyAppliance(uid, appliance.id)
      setDeleting(null)
      setReloadKey((key) => key + 1)
      toast.show('Removed.')
    } catch {
      toast.show('We could not remove that. Please try again.', { tone: 'error' })
    } finally {
      setBusy(false)
    }
  }

  const nameOf = (applianceId: string): string =>
    data.data?.catalog.find((a: CatalogAppliance) => a.id === applianceId)?.name ?? applianceId

  if (data.status === 'loading') {
    return (
      <SkeletonGroup label="Loading appliances" className="mt-6 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </SkeletonGroup>
    )
  }

  if (data.status === 'error') {
    return <ErrorState className="py-16" onRetry={data.reload} retrying={data.refreshing} />
  }

  if ((data.data?.saved.length ?? 0) === 0) {
    return (
      <>
        <PageTitle />
        <EmptyState
          className="py-14"
          icon={PackageOpen}
          title="No appliances yet"
          description="Appliances are saved from the details you give when you book, so the next booking for the same machine is two taps shorter."
          action={{ label: 'Explore our services', href: '/services' }}
        />
      </>
    )
  }

  return (
    <>
      <PageTitle />

      <View className="mt-4 gap-3">
        {data.data?.saved.map((appliance) => (
          <Card key={appliance.id} className="overflow-hidden">
            <Tappable
              href={`/profile/appliances/detail?id=${appliance.id}` as Href}
              className="flex-row items-start gap-3 p-4 active:bg-surface active:opacity-100"
            >
              <View className="min-w-0 flex-1">
                <Text numberOfLines={1} className="text-sm font-semibold text-ink">
                  {appliance.nickname ?? nameOf(appliance.applianceId)}
                </Text>
                <Text className="mt-0.5 text-xs text-muted">
                  {[appliance.brandId.toUpperCase(), nameOf(appliance.applianceId), appliance.type]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
                {appliance.modelNumber ? (
                  <Text className="mt-0.5 text-xs text-muted">Model {appliance.modelNumber}</Text>
                ) : null}
                <Text className="mt-2 text-xs text-muted">
                  {appliance.lastServicedAt
                    ? `Last serviced ${relativeTime(appliance.lastServicedAt)}`
                    : 'Not serviced by us yet'}
                </Text>
              </View>
              <Icon as={ChevronRight} className="mt-0.5 size-4 shrink-0 text-muted" />
            </Tappable>
            <Tappable
              onPress={() => setDeleting(appliance)}
              className="min-h-11 w-full flex-row items-center justify-center gap-2 border-t border-border active:bg-error-soft active:opacity-100"
            >
              <Icon as={Trash2} className="size-4 text-error" />
              <Text className="text-sm font-medium text-error">Remove</Text>
            </Tappable>
          </Card>
        ))}
      </View>

      <ConfirmModal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) void remove(deleting)
        }}
        loading={busy}
        destructive
        title="Remove this appliance?"
        description="Its service history stays on the bookings it belongs to. Only the saved shortcut goes."
        confirmLabel="Remove"
      />
    </>
  )
}
