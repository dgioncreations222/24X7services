import { View } from 'react-native'
import { History, TrendingUp, X } from 'lucide-react-native'

import { Chip } from '@/components/ui/Chip'
import { Icon } from '@/components/ui/Icon'
import { Tappable } from '@/components/ui/Tappable'
import { Text } from '@/components/ui/Text'
import { TRENDING_SEARCHES } from '@/lib/trending'
import { Heading } from '@/screens/services/search/SearchParts'

/**
 * What an empty search box offers: what this person looked for before, and
 * what most people look for.
 */
export function Suggestions({
  recent,
  onPick,
  onClearRecent,
}: {
  recent: readonly string[]
  onPick: (term: string) => void
  onClearRecent: () => void
}) {
  return (
    <View className="mt-4">
      {recent.length > 0 ? (
        <View className="mb-8">
          <View className="mb-3 flex-row items-baseline justify-between gap-3">
            <Heading>Recent</Heading>
            <Tappable onPress={onClearRecent} className="flex-row items-center gap-1">
              <Icon as={X} className="size-3.5 text-muted" />
              <Text className="text-sm text-muted">Clear</Text>
            </Tappable>
          </View>
          <View className="flex-row flex-wrap gap-2">
            {recent.map((item) => (
              <Chip key={item} onPress={() => onPick(item)} accessibilityLabel={item}>
                <Icon as={History} className="size-3.5 text-muted" />
                <Text numberOfLines={1} className="text-sm font-medium text-ink">
                  {item}
                </Text>
              </Chip>
            ))}
          </View>
        </View>
      ) : null}

      <View>
        <Heading className="mb-4">Trending searches</Heading>
        <View className="flex-row flex-wrap gap-2.5">
          {TRENDING_SEARCHES.map((item) => (
            <Tappable
              key={item}
              onPress={() => onPick(item)}
              className="min-h-11 flex-row items-center gap-2 rounded-card border border-border px-3.5 active:border-brand active:opacity-100"
            >
              <Icon as={TrendingUp} className="size-4 text-muted" />
              <Text className="text-sm text-ink">{item}</Text>
            </Tappable>
          ))}
        </View>
      </View>
    </View>
  )
}
