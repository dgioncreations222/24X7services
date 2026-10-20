import { useCallback, useEffect } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { Lightbulb, Stethoscope } from 'lucide-react-native'

import { BookingStep } from '@/components/BookingStep'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { Text } from '@/components/ui/Text'
import { ErrorState } from '@/components/ui/States'
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { callFn } from '@/lib/callables'
import { patchDraft, useBookingDraft } from '@/lib/bookingDraft'
import { useAsync } from '@/lib/useAsync'

/**
 * What might be wrong, and what it is not.
 *
 * This is a lookup against the catalog, not a diagnosis and not a model. The
 * wording says so in three places and never softens: "possible causes", "your
 * expert will confirm", and no price anywhere on the screen. A number beside a
 * cause would read as a quote for a repair nobody has looked at yet, and a
 * customer who arrives at the review screen expecting that figure has been
 * misled by this one.
 *
 * What is shown is recorded on the booking. If a customer later says they were
 * told it was the compressor, the record is of what this screen actually put in
 * front of them.
 */
export default function DiagnosisScreen() {
  const { draft } = useBookingDraft()
  const applianceId = draft.applianceId
  const issueIds = draft.issueIds ?? []
  const issueKey = issueIds.join(',')

  const load = useCallback(async () => {
    if (!applianceId || issueIds.length === 0) {
      return { possibleCauses: [], tips: [] }
    }
    return callFn('getDiagnosis', {
      applianceId,
      // The callable takes ten at most; nobody ticks more than that in practice.
      issueIds: issueIds.slice(0, 10),
    })
    // issueKey stands in for the array, which is a new object every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applianceId, issueKey])

  const diagnosis = useAsync(load)
  const causes = diagnosis.data?.possibleCauses ?? []
  const tips = diagnosis.data?.tips ?? []

  // Recorded as soon as it is on screen, so the booking matches what was read.
  useEffect(() => {
    if (diagnosis.status !== 'ready') return
    patchDraft({ diagnosisShown: causes })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagnosis.status, causes.join('|')])

  return (
    <BookingStep
      stepKey="diagnosis"
      title="What it might be"
      cta={{ label: 'Continue', onClick: () => router.push('/book/media') }}
    >
      {diagnosis.status === 'loading' ? (
        <SkeletonGroup label="Loading" className="mt-6 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </SkeletonGroup>
      ) : diagnosis.status === 'error' ? (
        <ErrorState
          className="py-16"
          onRetry={diagnosis.reload}
          retrying={diagnosis.refreshing}
          description="We could not load the possible causes. You can carry on booking without them."
        />
      ) : causes.length === 0 ? (
        <Card className="mt-6 p-4">
          <Text className="text-sm leading-[22px] text-muted">
            We do not have common causes listed for what you described. Your expert will inspect it and explain
            what they find before any work starts.
          </Text>
        </Card>
      ) : (
        <>
          <View className="mt-5 flex-row items-start gap-2">
            <Icon as={Stethoscope} className="mt-1 size-4 text-muted" />
            <Text className="flex-1 text-sm leading-[22px] text-muted">
              These are the usual reasons for what you described. None of it is confirmed — your expert checks the
              appliance on site and tells you what it actually is before anything is repaired.
            </Text>
          </View>

          {/* A list, not a stack of cards: this step collects nothing, so
              nothing here should look tappable. Picking a cause would be the
              customer diagnosing their own appliance, which is the one thing
              this screen says three times it is not doing. */}
          <View className="mt-6">
            <Text accessibilityRole="header" className="text-sm font-semibold text-muted">
              Possible causes
            </Text>
            <View className="mt-3 gap-3">
              {causes.map((cause) => (
                <View key={cause} className="flex-row items-start gap-2.5">
                  <View className="mt-2 size-1.5 rounded-full bg-border" />
                  <Text className="flex-1 text-sm leading-[22px] text-ink">{cause}</Text>
                </View>
              ))}
            </View>
          </View>

          {tips.length > 0 ? (
            <View className="mt-7">
              <View className="flex-row items-center gap-1.5">
                <Icon as={Lightbulb} className="size-4 text-muted" />
                <Text accessibilityRole="header" className="text-sm font-semibold text-muted">
                  Worth trying first
                </Text>
              </View>
              <View className="mt-2 gap-2">
                {tips.map((tip) => (
                  <View key={tip} className="rounded-card bg-surface px-4 py-3">
                    <Text className="text-sm leading-[22px] text-ink">{tip}</Text>
                  </View>
                ))}
              </View>
              <Text className="mt-2 text-xs text-muted">
                If one of these fixes it, you can stop here — no visit needed.
              </Text>
            </View>
          ) : null}
        </>
      )}
    </BookingStep>
  )
}
