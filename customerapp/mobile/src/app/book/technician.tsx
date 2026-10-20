import { useCallback, useState } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { UserX } from 'lucide-react-native'
import type { TechnicianPublic, TechPreference } from '@app/shared'

import { BookingStep } from '@/components/BookingStep'
import { TechnicianCard } from '@/components/TechnicianCard'
import { CardButton } from '@/components/ui/Card'
import { Text } from '@/components/ui/Text'
import { EmptyState , ErrorState } from '@/components/ui/States'

import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { callFn } from '@/lib/callables'
import { pincodeOfSavedAddress } from '@/lib/api/bookingAddresses'
import { useAuth } from '@/lib/auth'
import { patchDraft, useBookingDraft } from '@/lib/bookingDraft'
import { useAsync } from '@/lib/useAsync'

/**
 * Who comes.
 *
 * "Any available expert" is the default and the honest one: assignment happens
 * against the roster on the day, and it is what gets someone there soonest.
 * Picking a name is a preference, not a reservation, and the screen says so
 * rather than letting a customer believe a particular person is now booked.
 *
 * Every expert listed covers this pincode, works on this appliance and knows
 * this brand — the server filters on all three, so the list is people who could
 * actually take the job rather than the whole roster.
 */

const CHOICES: readonly {
  value: Exclude<TechPreference, 'specific'>
  title: string
  detail: string
}[] = [
  {
    value: 'any',
    title: 'Any available expert',
    detail: 'Usually the fastest. Everyone we send is verified and trained.',
  },
  {
    value: 'top_rated',
    title: 'A top-rated expert',
    detail: 'Rated 4.5 and above. May mean a slightly longer wait.',
  },
]

export default function TechnicianScreen() {
  const { draft } = useBookingDraft()
  const { user } = useAuth()
  const uid = user?.uid

  const [preference, setPreference] = useState<TechPreference>(draft.techPreference ?? 'any')
  const [technicianId, setTechnicianId] = useState<string | undefined>(draft.technicianId)

  const addressId = draft.addressId
  const inlinePincode = draft.address?.pincode
  const { applianceId, brandId, slot } = draft

  const load = useCallback(async (): Promise<TechnicianPublic[]> => {
    if (!applianceId || !brandId || !slot) return []
    const pincode = addressId ? await pincodeOfSavedAddress(uid, addressId) : inlinePincode
    if (!pincode) return []

    const result = await callFn('getTechnicianOptions', {
      pincode,
      applianceId,
      brandId,
      slot,
      // The list is asked for as "anyone who could take this", and the choice
      // of a specific person is made from it here.
      preference: preference === 'specific' ? 'any' : preference,
    })
    return result.technicians
    // slot is an object; its identity changes every render, so the parts of it
    // that matter are what this depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, addressId, inlinePincode, applianceId, brandId, preference, slot?.date, slot?.start])

  const options = useAsync(load)

  function submit(): void {
    patchDraft({
      techPreference: preference,
      technicianId: preference === 'specific' ? technicianId : undefined,
    })
    router.push('/book/review')
  }

  return (
    <BookingStep
      stepKey="technician"
      title="Who should come?"
      cta={{
        label: 'Continue',
        onClick: submit,
        disabled: preference === 'specific' && !technicianId,
      }}
    >
      <View className="mt-5 gap-3">
        {CHOICES.map((choice) => (
          <CardButton
            key={choice.value}
            onPress={() => {
              setPreference(choice.value)
              setTechnicianId(undefined)
            }}
            selected={preference === choice.value}
            className="p-4"
          >
            <Text className="text-sm font-semibold text-ink">{choice.title}</Text>
            <Text className="mt-0.5 text-sm text-muted">{choice.detail}</Text>
          </CardButton>
        ))}

        <CardButton onPress={() => setPreference('specific')} selected={preference === 'specific'} className="p-4">
          <Text className="text-sm font-semibold text-ink">Choose someone</Text>
          <Text className="mt-0.5 text-sm text-muted">Pick from the experts who cover your area.</Text>
        </CardButton>
      </View>

      {preference === 'specific' ? (
        <View className="mt-6">
          {options.status === 'loading' ? (
            <SkeletonGroup label="Loading experts" className="gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </SkeletonGroup>
          ) : options.status === 'error' ? (
            <ErrorState
              onRetry={options.reload}
              retrying={options.refreshing}
              description="We could not load the experts for your area."
            />
          ) : (options.data?.length ?? 0) === 0 ? (
            <EmptyState
              icon={UserX}
              title="Nobody to choose from"
              description="No expert covering your area matches this appliance and brand. Any available expert is the way to get this booked."
              action={{
                label: 'Use any available expert',
                onClick: () => {
                  setPreference('any')
                  setTechnicianId(undefined)
                },
              }}
            />
          ) : (
            <>
              <View className="gap-3">
                {options.data?.map((technician) => (
                  <TechnicianCard
                    key={technician.id}
                    technician={technician}
                    onSelect={(chosen) => setTechnicianId(chosen.id)}
                    selected={technicianId === technician.id}
                  />
                ))}
              </View>
              <Text className="mt-3 text-xs leading-[19px] text-muted">
                A preference, not a reservation. If they are not free on the day we will send someone else and tell
                you before the visit.
              </Text>
            </>
          )}
        </View>
      ) : null}
    </BookingStep>
  )
}
