import { useState } from 'react'
import { View } from 'react-native'
import { Star } from 'lucide-react-native'
import type { ServiceReview } from '@app/shared'
import { relativeTime } from '@/lib/format'
import { cn } from '@/lib/cn'
import { Icon } from '@/components/ui/Icon'
import { Tappable } from '@/components/ui/Tappable'
import { Text } from '@/components/ui/Text'

/**
 * What people said about this service.
 *
 * The breakdown is above the list because it is the honest summary and the
 * list is the evidence: five bars say at a glance whether a 4.6 is everybody
 * agreeing or two camps averaging out, and those are very different services
 * to book. The counts are drawn from the reviews on screen, so the bars and
 * the rows underneath cannot disagree.
 *
 * Nothing is filtered and nothing is sorted by sentiment. The list is newest
 * first, ones and fives together, because a page that quietly floats its good
 * reviews is a page whose good reviews stop meaning anything.
 *
 * Ten at a time. A service with two hundred reviews is two hundred rows
 * between the customer and the button that books it.
 *
 * Shown even with nothing in it, so the section is always where a customer
 * looks for it, and always carries the way to add one (`action`).
 */

const PAGE = 10

export function ServiceReviews({
  reviews,
  serviceNames,
  action,
  className,
}: {
  reviews: readonly ServiceReview[]
  /**
   * The name of each service, on a page that pools the reviews of several —
   * every row then says which service it is about.
   */
  serviceNames?: ReadonlyMap<ServiceReview['serviceKey'], string>
  /** Under the heading: the way to write one. */
  action?: React.ReactNode
  className?: string
}) {
  const [shown, setShown] = useState(PAGE)

  if (reviews.length === 0) {
    return (
      <View className={cn('mt-8', className)}>
        <Text accessibilityRole="header" className="text-xl font-bold text-ink">
          Customer reviews
        </Text>
        <Text className="mt-2 text-sm text-muted">No reviews yet. Every review here comes from a finished job.</Text>
        {action ? <View className="mt-3">{action}</View> : null}
      </View>
    )
  }

  const total = reviews.length
  const sum = reviews.reduce((all, review) => all + review.rating, 0)
  const average = Math.round((sum / total) * 10) / 10

  // Five buckets, five to one, in the order a breakdown is always read.
  const buckets = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((review) => review.rating === star).length,
  }))

  return (
    <View className={cn('mt-8', className)}>
      <Text accessibilityRole="header" className="text-xl font-bold text-ink">
        Customer reviews
      </Text>
      {action ? <View className="mt-2">{action}</View> : null}

      <View className="mt-3 flex-row items-start gap-5">
        <View className="shrink-0 items-center">
          <View className="flex-row items-center gap-1">
            <Icon as={Star} filled className="size-6 text-ink" />
            <Text className="text-3xl font-bold text-ink">{average.toFixed(1)}</Text>
          </View>
          <Text className="mt-0.5 text-xs text-muted" style={{ fontVariant: ['tabular-nums'] }}>
            {total} {total === 1 ? 'review' : 'reviews'}
          </Text>
        </View>

        <View className="min-w-0 flex-1">
          {buckets.map((bucket) => (
            <View key={bucket.star} className="flex-row items-center gap-2 py-0.5">
              <Text className="w-3 shrink-0 text-xs text-muted">{bucket.star}</Text>
              <Icon as={Star} filled className="size-3 text-muted" />
              <View aria-hidden className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-pill bg-surface">
                <View className="h-full rounded-pill bg-ink" style={{ width: `${(bucket.count / total) * 100}%` }} />
              </View>
              <Text className="w-8 shrink-0 text-right text-xs text-muted">{bucket.count}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className="mt-5 border-t border-border">
        {reviews.slice(0, shown).map((review, index) => (
          <View key={review.id} className={cn('py-4', index > 0 && 'border-t border-border')}>
            <View className="flex-row items-center justify-between gap-3">
              <Text numberOfLines={1} className="min-w-0 shrink text-base font-semibold text-ink">
                {review.authorName}
              </Text>
              <Score rating={review.rating} />
            </View>
            <Text className="mt-0.5 text-xs text-muted">
              {serviceNames?.get(review.serviceKey) ? (
                <>
                  {serviceNames.get(review.serviceKey)}
                  <Text className="text-xs text-border"> · </Text>
                </>
              ) : null}
              {relativeTime(review.createdAt)}
            </Text>
            {review.text ? <Text className="mt-2 text-sm leading-relaxed text-ink">{review.text}</Text> : null}
          </View>
        ))}
      </View>

      {shown < total ? (
        <Tappable
          onPress={() => setShown((count) => count + PAGE)}
          className="mt-4 min-h-12 w-full items-center justify-center rounded-card border border-border active:border-brand active:opacity-100"
        >
          <Text className="text-sm font-semibold text-ink">Show more reviews</Text>
        </Tappable>
      ) : null}
    </View>
  )
}

/**
 * The score on one review.
 *
 * Green or red rather than a row of stars: at this size five stars is a smear,
 * and the only thing anybody reads off a single review's score is whether it
 * went well. The number is there for everyone who cannot tell the two colours
 * apart.
 */
function Score({ rating }: { rating: number }) {
  const good = rating >= 4
  return (
    <View className={cn('shrink-0 flex-row items-center gap-1 rounded-card px-2 py-1', good ? 'bg-success' : 'bg-error')}>
      <Icon as={Star} filled className="size-3 text-white" />
      <Text className="text-xs font-bold text-white">{rating}</Text>
    </View>
  )
}
