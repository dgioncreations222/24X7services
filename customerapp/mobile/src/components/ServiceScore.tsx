import { View } from 'react-native'
import { Star } from 'lucide-react-native'
import { cn } from '@/lib/cn'
import { Icon } from '@/components/ui/Icon'
import { Text } from '@/components/ui/Text'

/**
 * What people scored a service, and how many of them did.
 *
 * Both or neither, everywhere it appears. 4.9 from three people and 4.9 from
 * three thousand are not the same claim, and a star with a bare number beside
 * it invites a reader to assume the second — so a catalog row that carries
 * only one of the two draws no score at all. That rule lives here, in the
 * component, rather than in each of the four screens that show one.
 *
 * `full` is for a card with a line to spare; `compact` for a rail card or a
 * grid tile, where "reviews" is a word the reader can supply themselves and
 * the space is better spent on the name.
 */

export interface ServiceScoreProps {
  rating: number | undefined
  reviewCount: number | undefined
  variant?: 'full' | 'compact'
  className?: string
}

export function ServiceScore({
  rating,
  reviewCount,
  variant = 'full',
  className,
}: ServiceScoreProps) {
  if (rating === undefined || reviewCount === undefined) return null

  const compact = variant === 'compact'
  const size = compact ? 'text-xs' : 'text-sm'
  return (
    <View className={cn('flex-row items-center gap-1.5', className)}>
      <Icon as={Star} filled className={cn('text-ink', compact ? 'size-3' : 'size-3.5')} />
      <Text className={cn(size, 'font-bold text-ink')}>{rating.toFixed(1)}</Text>
      <Text numberOfLines={1} className={cn(size, 'shrink text-muted')}>
        ({countNote(reviewCount)}
        {compact ? '' : ' reviews'})
      </Text>
    </View>
  )
}

/**
 * A review count at a glance rather than to the unit.
 *
 * Nobody reads "2140" as anything other than "a lot", and the four digits ask
 * them to. Under a thousand the exact figure is short enough to be read, so it
 * stays: rounding 240 to "0.2K" would be less information in more characters.
 */
export function countNote(count: number): string {
  if (count < 1000) return String(count)
  const thousands = count / 1000
  // 12.4K is noise at that size; 12K says the same thing. One decimal only
  // while it is still telling the reader something.
  const rounded =
    thousands < 10 ? thousands.toFixed(1) : String(Math.round(thousands))
  return `${rounded.replace(/\.0$/, '')}K`
}

/**
 * What a screen says out loud for a score it drew.
 *
 * The visual is a star, a number and a count in brackets, which a screen
 * reader would otherwise read as "star 4.8 bracket 1.3K reviews".
 */
export function scoreLabel(
  rating: number | undefined,
  reviewCount: number | undefined
): string | null {
  if (rating === undefined || reviewCount === undefined) return null
  return `rated ${rating.toFixed(1)} from ${reviewCount.toLocaleString('en-IN')} reviews`
}
