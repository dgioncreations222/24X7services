import { View } from 'react-native'
import { Inherit, Text } from '../base/Text'
import { Button } from './Button'

/**
 * Nothing to show yet, said plainly, with the one thing the technician can do
 * about it (if anything). Short text: this is read at a glance in the field.
 */
export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode
  title: string
  body?: string
  action?: { label: string; onPress: () => void }
}) {
  return (
    <View className="items-center rounded-card border border-dashed border-line-strong bg-card px-6 py-10">
      <View className="mb-3 size-14 items-center justify-center rounded-full bg-canvas">
        <Inherit className="text-muted">{icon}</Inherit>
      </View>
      <Text accessibilityRole="header" className="text-center text-base font-extrabold">
        {title}
      </Text>
      {body ? <Text className="mt-1 max-w-xs text-center text-sm text-muted">{body}</Text> : null}
      {action ? (
        <Button size="lg" variant="secondary" className="mt-5 self-stretch" onPress={action.onPress}>
          {action.label}
        </Button>
      ) : null}
    </View>
  )
}
