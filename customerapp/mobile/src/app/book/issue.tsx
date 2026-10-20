import { useCallback, useState } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import type { CatalogIssue } from '@app/shared'

import { BookingStep } from '@/components/BookingStep'
import { Chip } from '@/components/ui/Chip'
import { Textarea } from '@/components/ui/Field'
import { Text } from '@/components/ui/Text'
import { ErrorState } from '@/components/ui/States'
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { fetchIssuesFor } from '@/lib/catalog'
import { patchDraft, useBookingDraft } from '@/lib/bookingDraft'
import { useAsync } from '@/lib/useAsync'

/**
 * What is actually wrong.
 *
 * More than one thing can be wrong at once, and saying so is useful — a fridge
 * that is both noisy and not cooling points somewhere different from either on
 * its own. The list comes from the catalog, and "something else" is always
 * available, because a list of seven symptoms will never cover everything a
 * person can hear their washing machine doing.
 *
 * Either a tick or a description is enough to continue. Insisting on a tick
 * would make someone pick the nearest wrong answer.
 */

const MAX_OTHER = 500

export default function IssueScreen() {
  const { draft } = useBookingDraft()
  const applianceId = draft.applianceId

  const [selected, setSelected] = useState<string[]>(draft.issueIds ?? [])
  const [other, setOther] = useState(draft.otherIssueText ?? '')
  const [error, setError] = useState<string | undefined>(undefined)

  const load = useCallback(
    (): Promise<CatalogIssue[]> => (applianceId ? fetchIssuesFor(applianceId) : Promise.resolve([])),
    [applianceId]
  )
  const issues = useAsync(load)

  function toggle(issue: CatalogIssue): void {
    setError(undefined)
    setSelected((current) =>
      current.includes(issue.id)
        ? current.filter((id) => id !== issue.id)
        : // An issue marked allowMultiple:false is the only thing that can be
          // wrong — picking it clears the rest rather than sitting beside them.
          issue.allowMultiple
          ? [...current, issue.id]
          : [issue.id]
    )
  }

  function submit(): void {
    const described = other.trim()
    if (selected.length === 0 && described.length === 0) {
      setError('Tick what you are seeing, or describe it below')
      return
    }

    patchDraft({
      issueIds: selected,
      otherIssueText: described.length > 0 ? described : undefined,
      // The causes shown were for the old set of symptoms. Clearing them stops
      // a booking recording a diagnosis the customer never saw.
      diagnosisShown: [],
    })
    router.push('/book/diagnosis')
  }

  return (
    <BookingStep stepKey="issue" title="What is it doing?" cta={{ label: 'Continue', onClick: submit }}>
      {issues.status === 'loading' ? (
        <SkeletonGroup label="Loading" className="mt-6 flex-row flex-wrap gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-40 rounded-pill" />
          ))}
        </SkeletonGroup>
      ) : issues.status === 'error' ? (
        <ErrorState className="py-16" onRetry={issues.reload} retrying={issues.refreshing} />
      ) : (
        <>
          <Text className="mt-5 text-sm text-muted">Tick everything you have noticed. More than one is fine.</Text>

          <View className="mt-4 flex-row flex-wrap gap-2">
            {issues.data?.map((issue) => (
              <Chip
                key={issue.id}
                showCheck
                selected={selected.includes(issue.id)}
                onPress={() => toggle(issue)}
              >
                {issue.label}
              </Chip>
            ))}
          </View>

          {error ? (
            <Text accessibilityRole="alert" className="mt-3 text-xs text-error">
              {error}
            </Text>
          ) : null}

          <View className="mt-7">
            <Textarea
              label="Anything else? (optional)"
              value={other}
              onChangeText={(value) => {
                setOther(value.slice(0, MAX_OTHER))
                setError(undefined)
              }}
              hint={`In your own words. ${MAX_OTHER - other.length} characters left.`}
              placeholder="It started after the power cut last week, and there is a burning smell."
              rows={4}
            />
          </View>
        </>
      )}
    </BookingStep>
  )
}
