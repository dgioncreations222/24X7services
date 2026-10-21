import { View } from 'react-native'
import { BRAND } from '@/lib/brand'
import { cn } from '@/lib/cn'
import { Text } from './base/Text'

/** The wordmark with the Partner tag that marks this as the work app. */
export function Logo({ inverted, large }: { inverted?: boolean; large?: boolean }) {
  return (
    <View className="flex-row items-center gap-2 self-start" accessibilityLabel={BRAND.app}>
      <View className={cn('items-center justify-center rounded-lg', large ? 'size-12' : 'size-8', inverted ? 'bg-white' : 'bg-brand')}>
        <Text
          className={cn(
            'font-extrabold tracking-[-0.04em]',
            large ? 'text-[19px] leading-[20px]' : 'text-[13px] leading-[14px]',
            inverted ? 'text-brand-ink' : 'text-white'
          )}
        >
          {BRAND.mark}
        </Text>
      </View>
      <View>
        <Text className={cn('font-extrabold tracking-tight', large ? 'text-2xl leading-[26px]' : 'text-[15px] leading-[16px]', inverted ? 'text-white' : 'text-ink')}>
          {BRAND.name}
        </Text>
        <Text
          className={cn(
            'mt-1 font-bold uppercase tracking-[0.18em]',
            large ? 'text-[11px] leading-[12px]' : 'text-[9.5px] leading-[10px]',
            inverted ? 'text-white/60' : 'text-brand'
          )}
        >
          Technician Partner
        </Text>
      </View>
    </View>
  )
}
