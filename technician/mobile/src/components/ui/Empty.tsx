import { View } from 'react-native'
import { Inherit, Text } from '../base/Text'

export function Empty({ icon, title, body }: { icon: React.ReactNode; title: string; body?: string }) {
  return (
    <View className="items-center rounded-card border border-dashed border-line-strong bg-card px-6 py-10">
      <View className="mb-3 size-12 items-center justify-center rounded-full bg-canvas">
        <Inherit className="text-muted">{icon}</Inherit>
      </View>
      <Text className="text-center font-bold">{title}</Text>
      {body ? <Text className="mt-1 max-w-xs text-center text-sm text-muted">{body}</Text> : null}
    </View>
  )
}
