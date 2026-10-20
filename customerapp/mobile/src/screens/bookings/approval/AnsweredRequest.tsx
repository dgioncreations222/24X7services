import { View } from 'react-native'
import { repairItemTotal, type RepairRequest } from '@app/shared'

import { Card } from '@/components/ui/Card'
import { Tag } from '@/components/ui/Chip'
import { Text } from '@/components/ui/Text'
import { formatPaise } from '@/lib/format'
import { cn } from '@/lib/cn'

export function AnsweredRequest({ request }: { request: RepairRequest }) {
  const approvedItems = request.items.filter((item) => request.approvedItemIds.includes(item.id))
  const total = approvedItems.reduce((sum, item) => sum + repairItemTotal(item), 0)

  return (
    <Card className="p-4">
      <View className="flex-row items-start justify-between gap-3">
        <Text className="min-w-0 flex-1 text-sm leading-[22px] text-ink">{request.reason}</Text>
        <Tag>
          {request.status === 'approved'
            ? 'Approved'
            : request.status === 'partially_approved'
              ? 'Part approved'
              : 'Declined'}
        </Tag>
      </View>

      <View className="mt-3 gap-1.5">
        {request.items.map((item) => {
          const taken = request.approvedItemIds.includes(item.id)
          return (
            <View key={item.id} className="flex-row items-baseline justify-between gap-3">
              <Text className={cn('min-w-0 flex-1 text-sm', taken ? 'text-ink' : 'text-muted line-through')}>
                {item.label}
              </Text>
              <Text className={cn('text-sm tabular-nums', taken ? 'font-medium text-ink' : 'text-muted')}>
                {formatPaise(repairItemTotal(item))}
              </Text>
            </View>
          )
        })}
      </View>

      <View className="mt-3 border-t border-border pt-3">
        <Text className="text-sm text-muted">
          Added to your bill: <Text className="text-sm font-bold text-ink">{formatPaise(total)}</Text>
        </Text>
      </View>
    </Card>
  )
}
