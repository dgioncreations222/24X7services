import { useCallback, useState } from 'react'
import { View } from 'react-native'
import { router, type Href } from 'expo-router'
import { Star } from 'lucide-react-native'
import type { Booking, Review } from '@app/shared'

import { BookingShell } from '@/components/BookingShell'
import { ReviewCard } from '@/components/ReviewCard'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Field'
import { Icon, useColor } from '@/components/ui/Icon'
import { Tappable } from '@/components/ui/Tappable'
import { Text } from '@/components/ui/Text'
import { EmptyState } from '@/components/ui/States'
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { useToast } from '@/components/Toast'
import { callFn, friendlyError } from '@/lib/callables'
import { fetchReview } from '@/lib/api/reviews'
import { useAsync } from '@/lib/useAsync'
import { cn } from '@/lib/cn'
import { BlockTitle } from '@/screens/bookings/parts'

/**
 * How it went.
 *
 * Asked once, after a job that actually happened, and never asked again — the
 * server enforces both, which is what makes the ratings on the technician cards
 * worth reading at all.
 *
 * Two ratings, because they are two different questions: the service is the
 * business's to answer for, and the expert is a person who was in someone's
 * home. A single star rating conflates a late arrival with a rude one.
 *
 * Nothing is required except the first rating. A customer who taps four stars
 * and closes the app has told us something useful, and a form that demands a
 * paragraph before it accepts that gets fewer of both.
 */

/** Deliberately neutral: praise and complaint in the same list, same weight. */
const TAGS = [
  'On time',
  'Explained clearly',
  'Tidy work',
  'Fair price',
  'Fixed first time',
  'Arrived late',
  'Had to come back',
  'Cost more than expected',
] as const

export default function ReviewScreen() {
  return (
    <BookingShell title="Rate this job">
      {({ booking }) => <ReviewBody booking={booking} />}
    </BookingShell>
  )
}

function ReviewBody({ booking }: { booking: Booking }) {
  const reviewId = booking.reviewId

  const load = useCallback(async (): Promise<Review | null> => {
    if (!reviewId) return null
    return fetchReview(reviewId)
  }, [reviewId])

  const existing = useAsync(load)

  if (booking.status !== 'completed') {
    return (
      <EmptyState
        className="py-16"
        icon={Star}
        title="Not finished yet"
        description="You can rate a job once it is complete."
      />
    )
  }

  if (reviewId && existing.status === 'loading') {
    return (
      <SkeletonGroup label="Loading" className="mt-6">
        <Skeleton className="h-40 w-full" />
      </SkeletonGroup>
    )
  }

  if (existing.data) {
    return (
      <>
        <Text className="mt-5 text-sm text-muted">Thank you — this is what you told us.</Text>
        <ReviewCard
          className="mt-4"
          review={existing.data}
          {...(booking.technicianSnapshot ? { technicianName: booking.technicianSnapshot.name } : {})}
        />
      </>
    )
  }

  return <ReviewForm booking={booking} />
}

function ReviewForm({ booking }: { booking: Booking }) {
  const toast = useToast()

  const [rating, setRating] = useState(0)
  const [techRating, setTechRating] = useState(0)
  const [tags, setTags] = useState<string[]>([])
  const [text, setText] = useState('')
  const [error, setError] = useState<string | undefined>(undefined)
  const [saving, setSaving] = useState(false)

  async function submit(): Promise<void> {
    if (rating === 0) {
      setError('Pick a rating to continue')
      return
    }

    setSaving(true)
    try {
      await callFn('submitReview', {
        bookingId: booking.id,
        rating,
        tags,
        ...(techRating > 0 ? { techRating } : {}),
        ...(text.trim().length > 0 ? { text: text.trim() } : {}),
      })
      toast.show('Thank you — that helps.', { tone: 'success' })
      router.replace(`/bookings/detail?id=${booking.id}` as Href)
    } catch (caught) {
      toast.show(friendlyError(caught), { tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Card className="mt-5 p-4">
        <Text className="text-sm font-medium text-ink">How was the service?</Text>
        <StarPicker
          className="mt-3"
          value={rating}
          onChange={(value) => {
            setRating(value)
            setError(undefined)
          }}
          label="Service rating"
        />
        {error ? (
          <Text accessibilityRole="alert" className="mt-2 text-xs text-error">
            {error}
          </Text>
        ) : null}
      </Card>

      {booking.technicianSnapshot ? (
        <Card className="mt-3 p-4">
          <Text className="text-sm font-medium text-ink">And {booking.technicianSnapshot.name}?</Text>
          <Text className="mt-0.5 text-xs text-muted">Optional.</Text>
          <StarPicker className="mt-3" value={techRating} onChange={setTechRating} label="Expert rating" />
        </Card>
      ) : null}

      <View className="mt-6">
        <BlockTitle className="mb-2">Anything that stood out?</BlockTitle>
        <View className="flex-row flex-wrap gap-2">
          {TAGS.map((tag) => (
            <Chip
              key={tag}
              showCheck
              selected={tags.includes(tag)}
              onPress={() =>
                setTags((current) =>
                  current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag].slice(0, 8)
                )
              }
            >
              {tag}
            </Chip>
          ))}
        </View>
      </View>

      <View className="mt-6">
        <Textarea
          label="In your own words (optional)"
          value={text}
          onChangeText={(next) => setText(next.slice(0, 1000))}
          placeholder="What went well, or what should have gone better."
          rows={4}
        />
      </View>

      <Button className="mt-6" fullWidth size="lg" loading={saving} onPress={() => void submit()}>
        Submit
      </Button>
    </>
  )
}

/**
 * Five buttons, not a slider. The number is announced as well as drawn, because
 * a row of shapes is not a rating to anyone using a screen reader.
 */
function StarPicker({
  value,
  onChange,
  label,
  className,
}: {
  value: number
  onChange: (value: number) => void
  label: string
  className?: string
}) {
  const ink = useColor('text-ink')
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} className={cn('flex-row gap-1', className)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Tappable
          key={n}
          accessibilityRole="radio"
          accessibilityState={{ checked: value === n }}
          accessibilityLabel={`${n} out of 5`}
          onPress={() => onChange(n)}
          className="size-11 items-center justify-center rounded-full active:bg-surface active:opacity-100"
        >
          <Icon
            as={Star}
            className={cn('size-7', n <= value ? 'text-ink' : 'text-border')}
            {...(n <= value ? { fill: ink } : {})}
          />
        </Tappable>
      ))}
    </View>
  )
}
