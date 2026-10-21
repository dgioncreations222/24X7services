import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { ArrowLeft } from 'lucide-react-native'
import { useBack } from '@/lib/nav'
import { cn } from '@/lib/cn'
import { Logo } from '../Logo'
import { Icon } from '../base/Icon'
import { Tappable } from '../base/Tappable'
import { Text } from '../base/Text'

/**
 * The frame for sign-in and onboarding: a short navy header with the logo
 * and the screen's one question, then the form on a white sheet that scrolls
 * and lifts over the keyboard. `footer` sticks to the bottom (the main button),
 * above the home indicator.
 */
export function AuthFrame({
  title,
  subtitle,
  step,
  back,
  footer,
  children,
}: {
  title: string
  subtitle?: string
  /** Onboarding progress, e.g. { at: 1, of: 3 }. */
  step?: { at: number; of: number }
  back?: Parameters<typeof useBack>[0]
  footer?: React.ReactNode
  children: React.ReactNode
}) {
  const insets = useSafeAreaInsets()
  const goBack = useBack(back ?? '/sign-in')
  return (
    <View className="flex-1 bg-brand-ink">
      <StatusBar style="light" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <View className="px-5 pb-10" style={{ paddingTop: insets.top + 16 }}>
          <View className="flex-row items-center justify-between">
            {back ? (
              <Tappable accessibilityLabel="Back" onPress={goBack} className="-ml-2 size-12 items-center justify-center rounded-full active:bg-white/10">
                <Icon as={ArrowLeft} className="size-5 text-white" />
              </Tappable>
            ) : (
              <Logo inverted />
            )}
            {step ? (
              <Text className="text-xs font-bold uppercase tracking-[0.14em] text-white/60">
                Step {step.at} of {step.of}
              </Text>
            ) : null}
          </View>
          {step ? (
            <View className="mt-4 flex-row gap-1.5">
              {Array.from({ length: step.of }, (_, i) => (
                <View key={i} className={cn('h-1 flex-1 rounded-full', i < step.at ? 'bg-white' : 'bg-white/20')} />
              ))}
            </View>
          ) : null}
          <Text accessibilityRole="header" className="mt-6 text-[26px] font-extrabold leading-[30px] tracking-tight text-white">
            {title}
          </Text>
          {subtitle ? <Text className="mt-2 text-sm font-medium text-white/65">{subtitle}</Text> : null}
        </View>
        <View className="-mt-6 flex-1 rounded-t-3xl bg-card">
          <ScrollView contentContainerClassName="px-5 pt-6 pb-6" keyboardShouldPersistTaps="handled">
            <View className="w-full max-w-md gap-5 self-center">{children}</View>
          </ScrollView>
          {footer ? (
            <View className="border-t border-line bg-card px-5 pt-3" style={{ paddingBottom: insets.bottom + 12 }}>
              <View className="w-full max-w-md self-center">{footer}</View>
            </View>
          ) : (
            <View style={{ height: insets.bottom }} />
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}
