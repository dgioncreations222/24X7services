import { View } from 'react-native'
import { Plus } from 'lucide-react-native'
import type { RateCardItem } from '@/lib/data'
import { useT } from '@/lib/i18n'
import { rupees } from '@/lib/money'
import { Icon } from '../base/Icon'
import { Tappable } from '../base/Tappable'
import { Text } from '../base/Text'

/**
 * The admin's rate card for this job's category. Prices are fixed — the
 * technician picks, never types, so the customer sees the same number.
 */
export function RateCardPicker({ items, onPick, busyId }: { items: RateCardItem[]; onPick: (item: RateCardItem) => void; busyId?: string | null }) {
  const t = useT()
  return (
    <View className="overflow-hidden rounded-card border border-line bg-card">
      {items.map((item, i) => (
        <View key={item.id} className={`flex-row items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-line' : ''}`}>
          <View className="min-w-0 flex-1">
            <Text className="text-base font-bold">{item.name}</Text>
            <Text className="num text-sm font-semibold text-muted">{rupees(item.price)}</Text>
          </View>
          <Tappable
            accessibilityLabel={t('Add {name}', { name: item.name })}
            disabled={busyId != null}
            onPress={() => onPick(item)}
            className="h-12 flex-row items-center gap-1.5 rounded-xl bg-brand-soft px-4 active:bg-brand/20"
          >
            <Icon as={Plus} className="size-4 text-brand" />
            <Text className="text-sm font-extrabold text-brand">{busyId === item.id ? t('Adding…') : t('Add')}</Text>
          </Tappable>
        </View>
      ))}
    </View>
  )
}
