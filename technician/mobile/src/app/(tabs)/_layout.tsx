import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs'
import { BriefcaseBusiness, House, UserRound, Wallet, type LucideIcon } from 'lucide-react-native'
import { cn } from '@/lib/cn'
import { useT } from '@/lib/i18n'
import { Icon, InTabs, Tappable, Text } from '@/components/ui'

/**
 * The four places a technician goes. Everything else is pushed over them.
 */

const TABS: Record<string, { label: string; icon: LucideIcon }> = {
  home: { label: 'Home', icon: House },
  jobs: { label: 'Jobs', icon: BriefcaseBusiness },
  earnings: { label: 'Earnings', icon: Wallet },
  profile: { label: 'Profile', icon: UserRound },
}

function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()
  const t = useT()
  return (
    <View className="flex-row border-t border-line bg-card" style={{ paddingBottom: insets.bottom }}>
      {state.routes.map((route, index) => {
        const tab = TABS[route.name]
        if (!tab) return null
        const active = state.index === index
        return (
          <Tappable
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={t(tab.label)}
            accessibilityState={{ selected: active }}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
              if (!active && !event.defaultPrevented) navigation.navigate(route.name)
            }}
            className="h-16 flex-1 items-center justify-center gap-1"
          >
            {active && <View className="absolute inset-x-5 top-0 h-[3px] rounded-b-full bg-brand" />}
            <Icon as={tab.icon} className={cn('size-[22px]', active ? 'text-brand' : 'text-faint')} strokeWidth={active ? 2.3 : 1.8} />
            <Text className={cn('text-[11px] font-bold', active ? 'text-brand' : 'text-faint')}>{t(tab.label)}</Text>
          </Tappable>
        )
      })}
    </View>
  )
}

export default function TabsLayout() {
  return (
    <InTabs.Provider value>
      <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }} backBehavior="history">
        <Tabs.Screen name="home" />
        <Tabs.Screen name="jobs" />
        {/* AI Assist (ai.tsx) is kept in the repo but no longer a tab. */}
        <Tabs.Screen name="ai" options={{ href: null }} />
        <Tabs.Screen name="earnings" />
        <Tabs.Screen name="profile" />
      </Tabs>
    </InTabs.Provider>
  )
}
