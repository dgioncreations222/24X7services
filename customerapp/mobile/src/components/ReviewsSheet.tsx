import { useMemo, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { Star } from 'lucide-react-native'
import type { ServiceReview } from '@app/shared'
import { BottomSheet } from '@/components/ui/Overlay'
import { countNote } from '@/components/ServiceScore'
import { cn } from '@/lib/cn'
import { Icon } from '@/components/ui/Icon'
import { Tappable } from '@/components/ui/Tappable'
import { Text } from '@/components/ui/Text'

/**
 * What opens from the rating under an appliance's name: the score, how the
 * written reviews spread across the five stars, and the reviews themselves,
 * in a panel from the bottom — the way the marketplaces answer "4.78 out of
 * what?" without taking the customer off the page they are choosing on.
 *
 * Two different numbers are on it, and it says which is which. The score and
 * its count are every rating the services here have had; the bars and the
 * list are the ratings that came with words. Scaling the bars up to the big
 * count would be inventing a distribution nobody measured.
 *
 * The chips narrow the list rather than re-sort the page: the newest first by
 * default, the longest first under "Most detailed", or one service's alone.
 * Tapping a bar keeps only that many stars, and tapping it again lets go.
 */

type Order = 'recent' | 'detailed'

export function ReviewsSheet({
  open,
  onClose,
  title,
  ...panel
}: {
  open: boolean
  onClose: () => void
  /** "Washing Machine reviews". */
  title: string
} & ReviewsPanelProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <ReviewsPanel {...panel} />
    </BottomSheet>
  )
}

interface ReviewsPanelProps {
  rating?: number
  ratingCount?: number
  reviews: readonly ServiceReview[]
  /** Short names per service, for the chips and the line under each author. */
  serviceNames: ReadonlyMap<ServiceReview['serviceKey'], string>
}

/**
 * The score, the bars and the list, without a frame — the sheet above wraps
 * it, and the service sheet shows it at its foot.
 */
export function ReviewsPanel({
  rating,
  ratingCount,
  reviews,
  serviceNames,
}: ReviewsPanelProps) {
  const [order, setOrder] = useState<Order>('recent')
  const [service, setService] = useState<ServiceReview['serviceKey'] | null>(
    null
  )
  const [stars, setStars] = useState<number | null>(null)

  const byStar = useMemo(() => {
    const counts = [0, 0, 0, 0, 0]
    for (const review of reviews) {
      const index = Math.min(5, Math.max(1, Math.round(review.rating))) - 1
      counts[index] = (counts[index] ?? 0) + 1
    }
    return counts
  }, [reviews])
  const most = Math.max(1, ...byStar)

  const reviewedServices = useMemo(
    () => [...new Set(reviews.map((review) => review.serviceKey))],
    [reviews]
  )

  const shown = useMemo(() => {
    const kept = reviews.filter(
      (review) =>
        (service === null || review.serviceKey === service) &&
        (stars === null || Math.round(review.rating) === stars)
    )
    return [...kept].sort((a, b) =>
      order === 'detailed'
        ? (b.text?.length ?? 0) - (a.text?.length ?? 0)
        : b.createdAt - a.createdAt
    )
  }, [reviews, service, stars, order])

  return (
    <>
      {rating !== undefined ? (
        <View>
          <View className="flex-row items-center gap-1.5">
            <Icon as={Star} filled className="size-7 text-ink" />
            <Text className="text-[36px] leading-[40px] font-bold text-ink">{rating.toFixed(2)}</Text>
          </View>
          {ratingCount !== undefined ? (
            <Text className="mt-1 text-base text-muted">
              {countNote(ratingCount)} ratings
            </Text>
          ) : null}
        </View>
      ) : null}

      {reviews.length > 0 ? (
        <>
          <View className="mt-5 gap-1" accessibilityLabel="Written reviews by stars">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = byStar[star - 1] ?? 0
              const on = stars === star
              return (
                <Tappable
                  key={star}
                  onPress={() => setStars(on ? null : star)}
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`${star} stars, ${count} ${count === 1 ? 'review' : 'reviews'}`}
                  className={cn(
                    'w-full flex-row items-center gap-4 rounded-md py-2',
                    stars !== null && !on && 'opacity-40'
                  )}
                >
                  <View className="w-8 shrink-0 flex-row items-center gap-1">
                    <Icon as={Star} filled className="size-3.5 text-ink" />
                    <Text className="text-base text-ink">{star}</Text>
                  </View>
                  <View className="h-1.5 flex-1 overflow-hidden rounded-pill bg-surface">
                    <View
                      className="h-full rounded-pill bg-ink"
                      style={{ width: `${(count / most) * 100}%` }}
                    />
                  </View>
                  <Text
                    className="w-10 shrink-0 text-right text-base text-muted"
                    style={{ fontVariant: ['tabular-nums'] }}
                  >
                    {count}
                  </Text>
                </Tappable>
              )
            })}
          </View>
          <Text className="mt-2 text-xs text-muted">
            From {reviews.length} written{' '}
            {reviews.length === 1 ? 'review' : 'reviews'}. Tap a bar to see
            only those.
          </Text>
        </>
      ) : null}

      <View className="-mx-5 mt-6 h-2 bg-surface" />

      <Text accessibilityRole="header" className="mt-6 text-2xl font-bold text-ink">
        All reviews
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="-mx-5 mt-4"
        contentContainerClassName="gap-2 px-5 pb-1"
        accessibilityLabel="Sort and filter reviews"
      >
        <Chip on={order === 'recent'} onPress={() => setOrder('recent')}>
          Most recent
        </Chip>
        <Chip on={order === 'detailed'} onPress={() => setOrder('detailed')}>
          Most detailed
        </Chip>
        {reviewedServices.length > 1
          ? reviewedServices.map((key) => (
              <Chip
                key={key}
                on={service === key}
                onPress={() => setService(service === key ? null : key)}
              >
                {serviceNames.get(key) ?? key}
              </Chip>
            ))
          : null}
      </ScrollView>

      {shown.length === 0 ? (
        <Text className="py-10 text-center text-sm text-muted">
          {reviews.length === 0
            ? 'No written reviews yet.'
            : 'No reviews match. Clear a filter to see more.'}
        </Text>
      ) : (
        <View className="mt-2">
          {shown.map((review, index) => (
            <View
              key={review.id}
              className={cn('py-5', index > 0 && 'border-t border-border')}
            >
              <View className="flex-row items-start justify-between gap-3">
                <View className="min-w-0 shrink">
                  <Text className="text-lg font-semibold text-ink">
                    {review.authorName}
                  </Text>
                  <Text className="mt-0.5 text-sm text-muted">
                    {formatReviewDate(review.createdAt)}
                    {serviceNames.get(review.serviceKey)
                      ? ` · For ${serviceNames.get(review.serviceKey)}`
                      : null}
                  </Text>
                </View>
                <View
                  accessible
                  accessibilityLabel={`${review.rating} out of 5`}
                  className={cn(
                    'shrink-0 flex-row items-center gap-1 rounded-md px-2 py-1',
                    review.rating >= 4
                      ? 'bg-success'
                      : review.rating >= 3
                        ? 'bg-warning'
                        : 'bg-error'
                  )}
                >
                  <Icon as={Star} filled className="size-3.5 text-white" />
                  <Text className="text-sm font-semibold text-white">{review.rating}</Text>
                </View>
              </View>
              {review.text ? (
                <Text className="mt-3 text-base leading-[26px] text-ink">
                  {review.text}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      )}
    </>
  )
}

function Chip({
  on,
  onPress,
  children,
}: {
  on: boolean
  onPress: () => void
  children: React.ReactNode
}) {
  return (
    <Tappable
      onPress={onPress}
      accessibilityState={{ selected: on }}
      className={cn(
        'shrink-0 rounded-card border px-4 py-2.5',
        on ? 'border-ink bg-ink' : 'border-border bg-bg active:border-ink'
      )}
    >
      <Text numberOfLines={1} className={cn('text-sm', on ? 'text-bg' : 'text-muted')}>
        {children}
      </Text>
    </Tappable>
  )
}

/** "Sep 26, 2026", as the list reads it. */
function formatReviewDate(ms: number): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(ms))
}
