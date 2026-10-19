import { createContext, useContext } from 'react'
import { ScrollView, View, type ScrollViewProps } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { Href } from 'expo-router'
import { ArrowLeft } from 'lucide-react-native'
import { cn } from '@/lib/cn'
import { useBack } from '@/lib/nav'
import { Icon } from '../base/Icon'
import { Tappable } from '../base/Tappable'
import { Text } from '../base/Text'
import { MenuButton } from '../menu'

/**
 * True inside the four tab screens, whose bottom inset the tab bar already
 * takes. Pushed screens cover the tab bar, so they pad for the home indicator.
 */
export const InTabs = createContext(false)

/** The header every inner screen wears. */
export function ScreenHeader({
  title,
  subtitle,
  back,
  right,
}: {
  title: React.ReactNode
  subtitle?: React.ReactNode
  back?: Href | true
  right?: React.ReactNode
}) {
  // `back` is only where to go when there is no previous screen.
  const goBack = useBack(back === true || !back ? '/home' : back)
  const insets = useSafeAreaInsets()
  return (
    <View className="z-30 border-b border-line bg-card" style={{ paddingTop: insets.top }}>
      <View className="h-14 flex-row items-center gap-2 px-2">
        {back && (
          <Tappable accessibilityLabel="Back" onPress={goBack} className="size-11 items-center justify-center rounded-full active:bg-canvas">
            <Icon as={ArrowLeft} className="size-5 text-ink" />
          </Tappable>
        )}
        <View className={cn('min-w-0 flex-1', !back && 'pl-2')}>
          {typeof title === 'string' ? (
            <Text accessibilityRole="header" numberOfLines={1} className="text-[17px] font-extrabold tracking-tight">
              {title}
            </Text>
          ) : (
            title
          )}
          {subtitle ? (
            typeof subtitle === 'string' ? (
              <Text numberOfLines={1} className="text-xs font-medium text-muted">
                {subtitle}
              </Text>
            ) : (
              subtitle
            )
          ) : null}
        </View>
        <View className="flex-row items-center gap-1 pr-1">
          {right}
          <MenuButton />
        </View>
      </View>
    </View>
  )
}

/**
 * The scrolling page body. Put the ScreenHeader above it and an ActionDock
 * below it, as siblings inside the screen — the dock sits under the scroll
 * rather than over it, so the page needs no bottom spacer.
 */
export function Page({
  children,
  className,
  scrollRef,
  ...props
}: Omit<ScrollViewProps, 'children'> & {
  children: React.ReactNode
  className?: string
  scrollRef?: React.Ref<ScrollView>
}) {
  const tabs = useContext(InTabs)
  const insets = useSafeAreaInsets()
  return (
    <ScrollView
      ref={scrollRef}
      className="flex-1 bg-canvas"
      contentContainerClassName={cn('px-4 pt-4', className)}
      contentContainerStyle={{ paddingBottom: 32 + (tabs ? 0 : insets.bottom) }}
      keyboardShouldPersistTaps="handled"
      {...props}
    >
      {children}
    </ScrollView>
  )
}

/** Buttons pinned to the foot of the screen, under the page. */
export function ActionDock({ children }: { children: React.ReactNode; withNav?: boolean }) {
  const tabs = useContext(InTabs)
  const insets = useSafeAreaInsets()
  return (
    <View className="border-t border-line bg-card px-4 pt-3" style={{ paddingBottom: 12 + (tabs ? 0 : insets.bottom) }}>
      <View className="flex-row gap-2.5">{children}</View>
    </View>
  )
}
