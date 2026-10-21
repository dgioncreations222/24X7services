import { Modal, Pressable, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { X } from 'lucide-react-native'
import { Icon } from '../base/Icon'
import { Tappable } from '../base/Tappable'
import { Text } from '../base/Text'

/** A bottom sheet. A system modal, so Android's back button closes it. */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: React.ReactNode
  children: React.ReactNode
}) {
  const insets = useSafeAreaInsets()
  return (
    <Modal visible={open} transparent animationType="slide" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Pressable accessibilityLabel="Close" className="absolute inset-0 bg-ink/50" onPress={onClose} />
        <View accessibilityViewIsModal className="max-h-[88%] rounded-t-2xl bg-card" style={{ paddingBottom: insets.bottom }}>
          <View className="flex-row items-center justify-between border-b border-line px-4 py-3">
            {typeof title === 'string' ? (
              <Text accessibilityRole="header" className="flex-1 text-base font-extrabold">
                {title}
              </Text>
            ) : (
              <View className="flex-1">{title}</View>
            )}
            <Tappable onPress={onClose} accessibilityLabel="Close" className="size-10 items-center justify-center rounded-full active:bg-canvas">
              <Icon as={X} className="size-5" />
            </Tappable>
          </View>
          <ScrollView contentContainerClassName="p-4" keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}
