import { useCallback, useState } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import type { CatalogAppliance, DetailField } from '@app/shared'

import { BookingStep } from '@/components/BookingStep'
import { Chip } from '@/components/ui/Chip'
import { Card, CardButton } from '@/components/ui/Card'
import { Input } from '@/components/ui/Field'
import { Text } from '@/components/ui/Text'
import { ErrorState } from '@/components/ui/States'
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { MANUFACTURER_WARRANTY_NOTICE } from '@/config/brand'
import { fetchAppliance } from '@/lib/catalog'
import { fetchSavedAppliances, type ReusableAppliance } from '@/lib/api/booking'
import { useAuth } from '@/lib/auth'
import { patchDraft, useBookingDraft } from '@/lib/bookingDraft'
import { useAsync } from '@/lib/useAsync'

/**
 * What kind of appliance it is, and which model.
 *
 * The questions are data, not code. `detailFields` on the appliance decides
 * what is asked and what the options are, so a new appliance that needs a
 * different question is a seed entry rather than a new screen.
 *
 * Only the question marked required blocks the step. A customer standing in
 * front of a machine whose sticker has worn off still needs to be able to book;
 * the model number helps the expert arrive with the right part, and that is a
 * reason to ask, not a reason to insist.
 *
 * DECISION NEEDED: the draft carries `modelPhotoPath` and nothing here sets it.
 * Photographing the sticker belongs with saving an appliance to the profile,
 * which is Phase 5 — until then the number is typed or left out.
 *
 * DECISION NEEDED: the catalog lets an appliance declare several detail fields
 * — a washing machine has both a type and a capacity — but the draft carries a
 * single `applianceType`, so only one can be asked and the rest are ignored.
 * Only the field that decides the job is shown.
 */

export default function DetailsScreen() {
  const { draft } = useBookingDraft()
  const { user } = useAuth()

  const applianceId = draft.applianceId
  const brandId = draft.brandId
  const uid = user?.uid

  const [type, setType] = useState(draft.applianceType ?? '')
  const [modelNumber, setModelNumber] = useState(draft.modelNumber ?? '')
  const [error, setError] = useState<string | undefined>(undefined)

  const load = useCallback(async (): Promise<{
    appliance: CatalogAppliance | null
    saved: ReusableAppliance[]
  }> => {
    if (!applianceId) return { appliance: null, saved: [] }

    const appliance = await fetchAppliance(applianceId)

    // A returning customer has usually told us about this machine already.
    if (!uid || !brandId) return { appliance, saved: [] }
    const saved = await fetchSavedAppliances(uid, applianceId, brandId)
    return { appliance, saved }
  }, [applianceId, brandId, uid])

  const data = useAsync(load)
  const fields = data.data?.appliance?.detailFields ?? []
  // The one question that changes what the expert brings: the required one, or
  // the first if the appliance marks none. See the note above.
  const primaryField = fields.find((field) => field.required) ?? fields[0]

  function reuse(saved: ReusableAppliance): void {
    setType(saved.type ?? '')
    setModelNumber(saved.modelNumber ?? '')
    setError(undefined)
    patchDraft({
      userApplianceId: saved.id,
      applianceType: saved.type,
      modelNumber: saved.modelNumber,
    })
  }

  function submit(): void {
    if (primaryField?.required && type.trim().length === 0) {
      setError(`Please choose the ${primaryField.label.toLowerCase()}`)
      return
    }

    patchDraft({
      applianceType: type.trim().length > 0 ? type : undefined,
      modelNumber: modelNumber.trim().length > 0 ? modelNumber.trim() : undefined,
      // Choosing different details than the saved appliance's makes this a
      // different machine as far as the booking is concerned.
      userApplianceId:
        draft.userApplianceId &&
        data.data?.saved.some(
          (s) =>
            s.id === draft.userApplianceId &&
            (s.type ?? '') === type &&
            (s.modelNumber ?? '') === modelNumber.trim()
        )
          ? draft.userApplianceId
          : undefined,
    })
    router.push('/book/issue')
  }

  return (
    <BookingStep stepKey="details" title="About the appliance" cta={{ label: 'Continue', onClick: submit }}>
      {data.status === 'loading' ? (
        <SkeletonGroup label="Loading" className="mt-6 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </SkeletonGroup>
      ) : data.status === 'error' ? (
        <ErrorState className="py-16" onRetry={data.reload} retrying={data.refreshing} />
      ) : (
        <View className="mt-5 gap-7">
          {data.data && data.data.saved.length > 0 ? (
            <View>
              <Text accessibilityRole="header" className="mb-2 text-sm font-semibold text-muted">
                Your saved appliances
              </Text>
              <View className="gap-2">
                {data.data.saved.map((saved) => (
                  <CardButton
                    key={saved.id}
                    onPress={() => reuse(saved)}
                    selected={draft.userApplianceId === saved.id}
                    className="p-4"
                  >
                    <Text className="text-sm font-semibold text-ink">{saved.nickname ?? 'Saved appliance'}</Text>
                    <Text className="mt-0.5 text-xs text-muted">
                      {[saved.type, saved.modelNumber].filter(Boolean).join(' · ') || 'No details saved'}
                    </Text>
                  </CardButton>
                ))}
              </View>
            </View>
          ) : null}

          {primaryField ? (
            <DetailFieldInput
              field={primaryField}
              value={type}
              onChange={(value) => {
                setType(value)
                setError(undefined)
              }}
              error={error}
            />
          ) : null}

          <Input
            label="Model number (optional)"
            value={modelNumber}
            onChangeText={(value) => setModelNumber(value.slice(0, 60))}
            hint="Usually on a sticker inside the door or behind the unit."
            placeholder="e.g. RT34C4523S8"
            autoCapitalize="characters"
            autoCorrect={false}
          />

          {/* Said before a slot is chosen, not after the job is done. */}
          <Card className="p-4">
            <Text className="text-sm leading-[22px] text-muted">{MANUFACTURER_WARRANTY_NOTICE}</Text>
          </Card>
        </View>
      )}
    </BookingStep>
  )
}

/**
 * One catalog-defined question. Both kinds write to the same place — the draft
 * holds a single `applianceType`, which is what every appliance's required
 * field asks for.
 */
function DetailFieldInput({
  field,
  value,
  onChange,
  error,
}: {
  field: DetailField
  value: string
  onChange: (value: string) => void
  error?: string
}) {
  if (field.kind === 'text') {
    return (
      <Input
        label={field.label}
        required={field.required}
        value={value}
        onChangeText={onChange}
        error={error}
        placeholder={field.placeholder}
      />
    )
  }

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={field.label}>
      <Text className="text-sm font-medium text-ink">
        {field.label}
        {field.required ? <Text className="text-sm text-error"> *</Text> : null}
      </Text>
      <View className="mt-2 flex-row flex-wrap gap-2">
        {(field.options ?? []).map((option) => (
          <Chip key={option} selected={value === option} onPress={() => onChange(value === option ? '' : option)}>
            {option}
          </Chip>
        ))}
      </View>
      {error ? (
        <Text accessibilityRole="alert" className="mt-1.5 text-xs text-error">
          {error}
        </Text>
      ) : null}
    </View>
  )
}
