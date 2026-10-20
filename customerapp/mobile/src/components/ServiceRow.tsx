import { View, type LayoutChangeEvent } from 'react-native'
import { Star } from 'lucide-react-native'
import { countNote } from '@/components/ServiceScore'
import { cn } from '@/lib/cn'
import { Icon } from '@/components/ui/Icon'
import { Img } from '@/components/ui/Img'
import { Tappable } from '@/components/ui/Tappable'
import { Text } from '@/components/ui/Text'

/**
 * One thing to book in an appliance page's list, laid out as the marketplaces
 * lay theirs out: the words on the left — name, score, price, a rule, what it
 * covers, "View details" — and the picture on the right with "Add" sitting
 * across its bottom edge and the count of options under that.
 *
 * It holds no opinions about what it is showing. A service and a yearly plan
 * both render through it; the caller hands it the lines and the button.
 *
 * Two things to press, as on `ServiceCard`: the action, and anywhere else on
 * the row, which opens the details. The row is not a button with the action
 * inside — a screen reader cannot say where one ends — so the
 * open-the-details button is stretched across the row underneath, and the
 * action sits above it.
 */

export interface ServiceRowProps {
  /** Kept for parity with the web; on native the page finds a row by `onLayout`. */
  id?: string
  title: string
  rating?: number
  reviewCount?: number
  /**
   * "Starts at ₹299", with any struck-through price already inside it. Set
   * inside a Text, so it is strings and nested Text only.
   */
  price: React.ReactNode
  /** A green line under the price: "Save 22% on separate visits". */
  offer?: string
  points: readonly string[]
  photo?: string
  /** Rendered over the picture's bottom edge. */
  action: React.ReactNode
  /** "7 options", under the action. */
  actionNote?: string
  onOpen: () => void
  /** Spoken for the stretched open-the-details button. */
  openLabel: string
  /** Where the row sits, for a page that scrolls to it. */
  onLayout?: (event: LayoutChangeEvent) => void
  className?: string
}

export function ServiceRow({
  title,
  rating,
  reviewCount,
  price,
  offer,
  points,
  photo,
  action,
  actionNote,
  onOpen,
  openLabel,
  onLayout,
  className,
}: ServiceRowProps) {

  return (
    <View onLayout={onLayout} className={cn('relative flex-row gap-4 py-6', className)}>
      <Tappable
        onPress={onOpen}
        accessibilityLabel={openLabel}
        className="absolute inset-0 z-10 rounded-card active:bg-surface/40 active:opacity-100"
      />

      <View pointerEvents="none" className="min-w-0 flex-1">
        <Text className="text-lg font-bold leading-snug text-ink">{title}</Text>

        {rating !== undefined && reviewCount !== undefined ? (
          <View className="mt-1 flex-row items-center gap-1.5 self-start">
            <Icon as={Star} filled className="size-3.5 text-ink" />
            <Text className="text-sm text-muted underline decoration-dotted">
              {rating.toFixed(2)} ({countNote(reviewCount)} reviews)
            </Text>
          </View>
        ) : null}

        <Text className="mt-2 text-sm font-semibold text-ink">{price}</Text>
        {offer ? <Text className="mt-1 text-sm font-medium text-success">{offer}</Text> : null}

        {points.length > 0 ? (
          <View className="mt-3 gap-1.5 border-t border-dashed border-border pt-3">
            {points.map((point) => (
              <View key={point} className="flex-row items-start gap-2">
                <View aria-hidden className="mt-[9px] size-1 shrink-0 rounded-full bg-muted" />
                <Text className="flex-1 text-sm leading-relaxed text-muted">{point}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <Text aria-hidden className="mt-3 text-sm font-bold text-brand">
          View details
        </Text>
      </View>

      {/* The picture, with the action across its foot. The column is as wide
          as the picture plus the half of the button that hangs below it. */}
      <View pointerEvents="box-none" className="relative z-20 w-[36%] max-w-40 shrink-0">
        <View pointerEvents="none" className="aspect-square w-full overflow-hidden rounded-card bg-plate">
          {photo ? <Img src={photo} alt="" className="absolute inset-0" /> : null}
        </View>
        <View pointerEvents="box-none" className="relative -mt-5 items-center">
          {action}
          {actionNote ? <Text className="mt-1 text-xs text-muted">{actionNote}</Text> : null}
        </View>
      </View>
    </View>
  )
}
