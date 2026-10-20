import { View } from 'react-native'
import { ArrowDownToLine, Gift, ReceiptIndianRupee } from 'lucide-react-native'
import { formatPaise, isCreditEntry, type WalletEntry } from '@app/shared'

import { Icon } from '@/components/ui/Icon'
import { Tappable } from '@/components/ui/Tappable'
import { Text } from '@/components/ui/Text'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/cn'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'issued', label: 'Added' },
  { id: 'used', label: 'Used' },
] as const

export type FilterId = (typeof FILTERS)[number]['id']

/**
 * The statement, with the filter every wallet screen puts above it.
 *
 * All three tabs are always offered, including ones that come back empty. A
 * tab that appears only once it has something in it moves the two next to it,
 * and a control that moves under the finger is worse than one with nothing
 * behind it.
 */
export function Activity({
  entries,
  filter,
  onFilter,
  emptyNote,
}: {
  entries: readonly WalletEntry[]
  filter: FilterId
  onFilter: (next: FilterId) => void
  emptyNote: string
}) {
  const shown = entries.filter((entry) =>
    filter === 'all' ? true : filter === 'issued' ? isCreditEntry(entry.kind) : !isCreditEntry(entry.kind)
  )

  return (
    <View>
      <Text accessibilityRole="header" className="text-xl font-bold text-ink">
        Balance activity
      </Text>

      <View accessibilityRole="tablist" accessibilityLabel="Filter activity" className="mt-3 flex-row flex-wrap gap-2">
        {FILTERS.map((option) => {
          const active = option.id === filter
          return (
            <Tappable
              key={option.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => onFilter(option.id)}
              className={cn(
                'min-h-9 justify-center rounded-pill border px-4',
                active ? 'border-ink bg-surface' : 'border-border'
              )}
            >
              <Text className={cn('text-sm font-semibold', active ? 'text-ink' : 'text-muted')}>{option.label}</Text>
            </Tappable>
          )
        })}
      </View>

      {shown.length === 0 ? (
        <Text className="py-12 text-center text-sm text-muted">
          {entries.length === 0 ? emptyNote : 'Nothing under this filter.'}
        </Text>
      ) : (
        <View className="mt-2">
          {shown.map((entry, index) => (
            <View key={entry.id} className={cn(index > 0 && 'border-t border-border')}>
              <LedgerRow entry={entry} />
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

/**
 * One line of the statement. The direction is spelled out with a + or a − as
 * well as with colour, because a green number and a dark one are the same
 * number to anyone who cannot tell them apart.
 */
function LedgerRow({ entry }: { entry: WalletEntry }) {
  const added = isCreditEntry(entry.kind)
  const tone = added ? 'text-success' : 'text-muted'
  return (
    <View className="flex-row items-start justify-between gap-4 py-4">
      <View
        className={cn(
          'mt-0.5 size-9 shrink-0 items-center justify-center rounded-full',
          added ? 'bg-success-soft' : 'bg-surface'
        )}
      >
        <Icon
          as={entry.kind === 'topup' ? ArrowDownToLine : added ? Gift : ReceiptIndianRupee}
          className={cn('size-4', tone)}
        />
      </View>

      <View className="min-w-0 flex-1">
        <Text className="text-sm font-semibold text-ink">{entry.note}</Text>
        <Text className="mt-0.5 text-xs text-muted">{formatDateTime(entry.createdAt)}</Text>
      </View>

      <View className="shrink-0 items-end">
        <Text className={cn('text-sm font-bold tabular-nums', added ? 'text-success' : 'text-ink')}>
          {added ? '+' : '−'}
          {formatPaise(entry.amount)}
        </Text>
        <Text className="mt-0.5 text-xs tabular-nums text-muted">{formatPaise(entry.balanceAfter)} left</Text>
      </View>
    </View>
  )
}
