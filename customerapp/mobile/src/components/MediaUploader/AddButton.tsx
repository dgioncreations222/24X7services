import { ActivityIndicator } from 'react-native'
import type { LucideIcon } from 'lucide-react-native'
import { cn } from '@/lib/cn'
import { Icon } from '@/components/ui/Icon'
import { Tappable } from '@/components/ui/Tappable'
import { Text } from '@/components/ui/Text'

export function AddButton({
  label,
  icon,
  busy = false,
  disabled,
  spinner,
  onPress,
}: {
  label: string
  icon: LucideIcon
  busy?: boolean
  disabled: boolean
  spinner: string
  onPress: () => void
}) {
  return (
    <Tappable
      onPress={onPress}
      disabled={disabled}
      accessibilityState={{ disabled, busy }}
      className={cn(
        'min-h-11 flex-1 flex-row items-center justify-center gap-2 rounded-pill border',
        disabled ? 'border-border' : 'border-ink active:bg-surface active:opacity-100'
      )}
    >
      {busy ? (
        <ActivityIndicator size="small" color={spinner} />
      ) : (
        <Icon as={icon} className={cn('size-4', disabled ? 'text-muted' : 'text-ink')} />
      )}
      <Text className={cn('text-sm font-semibold', disabled ? 'text-muted' : 'text-ink')}>{label}</Text>
    </Tappable>
  )
}

export function SourceRow({ icon, label, onPress }: { icon: LucideIcon; label: string; onPress: () => void }) {
  return (
    <Tappable
      onPress={onPress}
      className="min-h-14 flex-row items-center gap-3 rounded-card border border-border px-4 active:bg-surface active:opacity-100"
    >
      <Icon as={icon} className="size-5 text-brand" />
      <Text className="text-base font-medium text-ink">{label}</Text>
    </Tappable>
  )
}
