import { useCallback, useState } from 'react'
import { View } from 'react-native'
import { router, type Href } from 'expo-router'
import { Pencil } from 'lucide-react-native'
import {
  type Address,
  type BusinessConfig,
  type CatalogAppliance,
  type CatalogIssue,
  type CatalogService,
  type PaymentMode,
} from '@app/shared'

import { BookingStep } from '@/components/BookingStep'
import { Card, CardButton } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { Tappable } from '@/components/ui/Tappable'
import { Text } from '@/components/ui/Text'
import { ErrorState } from '@/components/ui/States'
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { fetchAppliance, fetchBusinessConfig, fetchIssuesFor, fetchServicesFor } from '@/lib/catalog'
import { fetchSavedAddress } from '@/lib/api/bookingAddresses'
import { useAuth } from '@/lib/auth'
import { formatPaise, formatSlotWindow, relativeDateLabel, shortAddress } from '@/lib/format'
import { patchDraft, useBookingDraft } from '@/lib/bookingDraft'
import { useAsync } from '@/lib/useAsync'

/**
 * Everything, in one place, before anything is charged.
 *
 * The visit fee shown here is read from the catalog, which is public — so it is
 * the same number `createBooking` will price the booking at, but it is not
 * where that number comes from. The server prices it again from the same
 * document inside a transaction, and what it returns is what the payment screen
 * charges. This screen is a quote to read, not a total to trust.
 *
 * Every line has a way back to the step that set it. A customer who spots the
 * wrong address here should not have to press back six times to fix it.
 */

interface ReviewData {
  appliance: CatalogAppliance | null
  service: CatalogService | null
  issues: CatalogIssue[]
  address: Address | null
  config: BusinessConfig | null
}

export default function ReviewScreen() {
  const { draft } = useBookingDraft()
  const { user } = useAuth()
  const uid = user?.uid

  const [mode, setMode] = useState<PaymentMode>(draft.paymentMode ?? 'online')

  const { applianceId, serviceKey, addressId } = draft

  const load = useCallback(async (): Promise<ReviewData> => {
    if (!applianceId || !serviceKey) {
      return { appliance: null, service: null, issues: [], address: null, config: null }
    }

    const [appliance, services, issues, config, address] = await Promise.all([
      fetchAppliance(applianceId),
      fetchServicesFor(applianceId),
      fetchIssuesFor(applianceId),
      fetchBusinessConfig(),
      addressId && uid ? fetchSavedAddress(uid, addressId) : Promise.resolve(null),
    ])

    return {
      appliance,
      service: services.find((s) => s.serviceKey === serviceKey) ?? null,
      issues,
      address,
      config,
    }
  }, [applianceId, serviceKey, addressId, uid])

  const data = useAsync(load)
  const service = data.data?.service
  const config = data.data?.config
  const address = data.data?.address ?? draft.address ?? null

  const issueLabels = (draft.issueIds ?? [])
    .map((id) => data.data?.issues.find((issue) => issue.id === id)?.label)
    .filter((label): label is string => Boolean(label))

  function submit(): void {
    patchDraft({ paymentMode: mode })
    router.push('/book/payment')
  }

  return (
    <BookingStep
      stepKey="review"
      title="Check your booking"
      cta={{
        label: mode === 'online' ? 'Pay visit fee' : 'Confirm booking',
        onClick: submit,
        disabled: !service,
      }}
      ctaDetail={
        service ? (
          <Text className="text-sm text-muted">
            Visit fee <Text className="text-base font-bold text-ink">{formatPaise(service.visitFee)}</Text>
          </Text>
        ) : null
      }
    >
      {data.status === 'loading' ? (
        <SkeletonGroup label="Loading" className="mt-6 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </SkeletonGroup>
      ) : data.status === 'error' || !service ? (
        <ErrorState className="py-16" onRetry={data.reload} retrying={data.refreshing} />
      ) : (
        <>
          <View className="mt-5 gap-3">
            <Line label="Service" value={service.name} detail={data.data?.appliance?.name} editRoute="/services" />
            <Line label="Brand" value={(draft.brandId ?? '').toUpperCase()} editRoute="/book/brand" />
            <Line
              label="Appliance"
              value={draft.applianceType ?? 'Not specified'}
              detail={draft.modelNumber}
              editRoute="/book/details"
            />
            <Line
              label="Problem"
              value={issueLabels.length > 0 ? issueLabels.join(', ') : 'Described in your own words'}
              detail={draft.otherIssueText}
              editRoute="/book/issue"
            />
            {draft.media && draft.media.length > 0 ? (
              <Line label="Photos" value={`${draft.media.length} attached`} editRoute="/book/media" />
            ) : null}
            <Line
              label="Address"
              value={address ? shortAddress(address) : 'Not chosen'}
              detail={address?.landmark ? `Near ${address.landmark}` : undefined}
              editRoute="/book/address"
            />
            <Line
              label="When"
              value={
                draft.slot
                  ? `${relativeDateLabel(draft.slot.date)}, ${formatSlotWindow(draft.slot.start, draft.slot.end)}`
                  : 'Not chosen'
              }
              editRoute="/book/slot"
            />
            <Line
              label="Expert"
              value={
                draft.techPreference === 'specific'
                  ? 'A specific expert'
                  : draft.techPreference === 'top_rated'
                    ? 'A top-rated expert'
                    : 'Any available expert'
              }
              editRoute="/book/technician"
            />
          </View>

          <View className="mt-7">
            <Text accessibilityRole="header" className="mb-2 text-sm font-semibold text-muted">
              What you pay now
            </Text>

            <View className="gap-3">
              <CardButton onPress={() => setMode('online')} selected={mode === 'online'} className="p-4">
                <Text className="text-sm font-semibold text-ink">Pay {formatPaise(service.visitFee)} now</Text>
                <Text className="mt-0.5 text-sm text-muted">
                  The visit and inspection fee. It confirms your slot straight away.
                </Text>
              </CardButton>

              {config?.allowPayAfterService ? (
                <CardButton
                  onPress={() => setMode('pay_after_service')}
                  selected={mode === 'pay_after_service'}
                  className="p-4"
                >
                  <Text className="text-sm font-semibold text-ink">Pay after the service</Text>
                  <Text className="mt-0.5 text-sm text-muted">
                    Settle everything when the job is done. Your slot is confirmed now.
                  </Text>
                </CardButton>
              ) : null}
            </View>

            <Card className="mt-4 p-4">
              <Text className="text-sm leading-[22px] text-muted">
                Anything beyond the visit fee is quoted on site, itemised, and started only after you approve it.
                Nothing is charged without your say-so.
              </Text>
              {config ? (
                <Text className="mt-2 text-xs leading-[19px] text-muted">
                  Cancelling more than {config.cancellationPolicy.freeUntilHours} hours before your slot is free.
                  After that a {formatPaise(config.cancellationPolicy.feePaise)} fee applies.
                </Text>
              ) : null}
            </Card>
          </View>
        </>
      )}
    </BookingStep>
  )
}

function Line({
  label,
  value,
  detail,
  editRoute,
}: {
  label: string
  value: string
  detail?: string | undefined
  editRoute: Href
}) {
  return (
    <Card className="flex-row items-start gap-3 p-4">
      <View className="min-w-0 flex-1">
        <Text className="text-xs text-muted">{label}</Text>
        <Text className="mt-0.5 text-sm font-medium leading-[22px] text-ink">{value}</Text>
        {detail ? <Text className="mt-0.5 text-xs leading-[19px] text-muted">{detail}</Text> : null}
      </View>
      <Tappable
        onPress={() => router.push(editRoute)}
        accessibilityLabel={`Change ${label.toLowerCase()}`}
        className="-m-2 size-11 items-center justify-center rounded-full active:bg-surface active:opacity-100"
      >
        <Icon as={Pencil} className="size-4 text-muted" />
      </Tappable>
    </Card>
  )
}
