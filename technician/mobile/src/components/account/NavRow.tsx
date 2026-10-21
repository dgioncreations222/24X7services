import { View } from 'react-native'
import type { Href } from 'expo-router'
import { ChevronRight, type LucideIcon } from 'lucide-react-native'
import { cn } from '@/lib/cn'
import { Icon } from '../base/Icon'
import { Tappable } from '../base/Tappable'
import { Text } from '../base/Text'

/**
 * One row of a menu card: icon, title, an optional line under it, and a
 * chevron. A link with `href`, a button with `onPress`. 64px tall, so it takes
 * a thumb easily.
 */
export function NavRow({
  icon,
  title,
  sub,
  href,
  onPress,
  badge,
  first,
}: {
  icon: LucideIcon
  title: string
  sub?: string
  href?: Href
  onPress?: () => void
  badge?: number
  first?: boolean
}) {
  return (
    <Tappable
      href={href}
      onPress={onPress}
      className={cn('min-h-16 w-full flex-row items-center gap-3 px-4 py-3 active:bg-canvas active:opacity-100', !first && 'border-t border-line')}
    >
      <View className="size-10 shrink-0 items-center justify-center rounded-xl bg-canvas">
        <Icon as={icon} className="size-5 text-ink-2" />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-base font-bold">{title}</Text>
        {sub ? (
          <Text numberOfLines={1} className="text-sm text-muted">
            {sub}
          </Text>
        ) : null}
      </View>
      {badge ? (
        <View className="h-6 min-w-6 items-center justify-center rounded-full bg-brand px-1.5">
          <Text className="num text-xs font-bold text-white">{badge}</Text>
        </View>
      ) : null}
      <Icon as={ChevronRight} className="size-5 text-faint" />
    </Tappable>
  )
}
