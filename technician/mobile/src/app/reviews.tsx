import { View } from 'react-native'
import { MessageSquareText, Star } from 'lucide-react-native'
import { Async } from '@/components/ui/Async'
import { Card, EmptyState, Icon, Page, ScreenHeader, SectionTitle, SkeletonList, Text } from '@/components/ui'
import { useRatingSummary, useReviews, type PartnerReview, type RatingSummary } from '@/lib/data'
import { cn } from '@/lib/cn'
import { useT } from '@/lib/i18n'
import { COLORS } from '@/lib/theme'
import { shortDate } from '@/lib/when'

/** The average customers give, how it splits by stars, and what they wrote. */
export default function ReviewsScreen() {
  const t = useT()
  const summary = useRatingSummary()
  const reviews = useReviews()
  return (
    <View className="flex-1 bg-canvas">
      <ScreenHeader back="/profile" title={t('Ratings & reviews')} />
      <Page className="gap-5">
        <Async query={summary} loading={<SkeletonList rows={1} />}>
          {(s) => <Summary summary={s} />}
        </Async>
        <View>
          <SectionTitle>{t('What customers said')}</SectionTitle>
          <Async
            query={reviews}
            loading={<SkeletonList rows={3} />}
            empty={
              <EmptyState
                icon={<Icon as={MessageSquareText} className="size-6" />}
                title={t('No reviews yet')}
                body={t('Customers can rate you in their app after each job.')}
              />
            }
          >
            {(list) => (
              <Card>
                {list.map((r, i) => (
                  <Review key={r.id} review={r} first={i === 0} />
                ))}
              </Card>
            )}
          </Async>
        </View>
      </Page>
    </View>
  )
}

function Summary({ summary: s }: { summary: RatingSummary }) {
  const t = useT()
  const most = Math.max(1, ...s.byStars)
  return (
    <Card className="flex-row items-center gap-5 p-5">
      <View className="items-center">
        <Text className="num text-[40px] font-extrabold leading-[46px]">{s.average.toFixed(2)}</Text>
        <Stars value={Math.round(s.average)} />
        <Text className="num mt-1 text-sm text-muted">{t('{n} ratings', { n: s.count.toLocaleString('en-IN') })}</Text>
      </View>
      <View className="min-w-0 flex-1 gap-1.5">
        {s.byStars.map((n, i) => (
          <View
            key={i}
            accessibilityLabel={t('{stars} stars: {n}', { stars: 5 - i, n })}
            className="flex-row items-center gap-2"
          >
            <Text className="num w-3 text-sm font-bold text-muted">{5 - i}</Text>
            <View className="h-2 flex-1 overflow-hidden rounded-full bg-canvas">
              <View className="h-full rounded-full bg-warning" style={{ width: `${(n / most) * 100}%` }} />
            </View>
          </View>
        ))}
      </View>
    </Card>
  )
}

function Review({ review: r, first }: { review: PartnerReview; first: boolean }) {
  return (
    <View className={cn('gap-1 px-4 py-3.5', !first && 'border-t border-line')}>
      <View className="flex-row items-center justify-between gap-3">
        <Text className="text-base font-bold">{r.authorName}</Text>
        <Text className="num text-sm text-muted">{shortDate(r.createdAt)}</Text>
      </View>
      <View className="flex-row items-center gap-2">
        <Stars value={r.rating} />
        <Text numberOfLines={1} className="shrink text-sm text-muted">
          {r.serviceName}
        </Text>
      </View>
      {r.text ? <Text className="mt-0.5 text-base text-ink-2">{r.text}</Text> : null}
    </View>
  )
}

function Stars({ value }: { value: number }) {
  return (
    <View accessibilityLabel={`${value} / 5`} className="flex-row gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon key={n} as={Star} className={cn('size-4', n <= value ? 'text-warning' : 'text-line-strong')} fill={n <= value ? COLORS.warning : 'transparent'} />
      ))}
    </View>
  )
}
