import { View } from 'react-native'
import { cn } from '@/lib/cn'
import { Inherit, Text } from '../base/Text'
import { Labelled } from './Button'

export function Card({ className, children }: { className?: string; children?: React.ReactNode }) {
  return <View className={cn('rounded-card border border-line bg-card shadow-card', className)}>{children}</View>
}

export function SectionTitle({
  children,
  action,
  count,
  className,
}: {
  children: React.ReactNode
  action?: React.ReactNode
  count?: number
  className?: string
}) {
  return (
    <View className={cn('mb-3 flex-row items-end justify-between gap-3', className)}>
      <View className="min-w-0 flex-1 flex-row items-center gap-2">
        <Inherit className="text-[15px] font-extrabold tracking-tight text-ink">
          <View accessibilityRole="header" className="shrink flex-row items-center gap-2">
            <Labelled>{children}</Labelled>
          </View>
        </Inherit>
        {count !== undefined && (
          <View className="rounded-md bg-ink/[0.06] px-1.5 py-0.5">
            <Text className="num text-xs font-bold text-muted">{count}</Text>
          </View>
        )}
      </View>
      {action}
    </View>
  )
}

export function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <Text className={cn('text-[11px] font-bold uppercase tracking-[0.08em] text-faint', className)}>{children}</Text>
}
