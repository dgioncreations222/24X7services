import { useEffect, useState } from 'react'
import { Modal, Pressable, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, {
  Easing,
  FadeIn,
  ReduceMotion,
  SlideInLeft,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import { router, usePathname, type Href } from 'expo-router'
import {
  Bell,
  BriefcaseBusiness,
  ChevronRight,
  Headset,
  House,
  LogOut,
  Map as MapIcon,
  Settings,
  Star,
  UserRound,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react-native'
import { cn } from '@/lib/cn'
import { useT } from '@/lib/i18n'
import { useStore } from '@/lib/store'
import { Avatar, Blink, Icon, Tappable, Text } from './ui'
import { AvailabilityToast } from './Availability'
import { IncomingRequest } from './IncomingRequest'
import { Logo } from './Logo'
import { MenuContext } from './menu'
import { TechnicianSheet } from './TechnicianSheet'

const SIDE: readonly { href: Href & string; label: string; icon: LucideIcon }[] = [
  { href: '/home', label: 'Dashboard', icon: House },
  { href: '/jobs', label: 'Jobs', icon: BriefcaseBusiness },
  { href: '/map', label: 'Map', icon: MapIcon },
  { href: '/earnings', label: 'Earnings', icon: Wallet },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/profile', label: 'Profile', icon: UserRound },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/support', label: 'Help & Support', icon: Headset },
]

/**
 * What the web's AppShell does around every screen, minus the bottom nav
 * (that is the tab bar now): holds the app on a splash until the saved state
 * is read, sends a signed-out technician to sign-in, owns the menu drawer,
 * and keeps the incoming-request takeover and the availability toast above
 * every screen.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const store = useStore()
  const bare = pathname === '/' || pathname.startsWith('/login')
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (store.ready && !store.signedIn && !bare) router.replace('/login')
  }, [store.ready, store.signedIn, bare])

  if (!store.ready) return <Splash />

  return (
    <MenuContext.Provider value={setMenuOpen}>
      <View className="flex-1 bg-canvas">
        {children}
        {!bare && store.signedIn && (
          <>
            <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} />
            <IncomingRequest />
            <AvailabilityToast />
          </>
        )}
      </View>
    </MenuContext.Provider>
  )
}

/** The web's phone drawer: the sidebar sliding in from the left. */
function Drawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets()
  return (
    <Modal visible={open} transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <View className="flex-1">
        <Animated.View entering={FadeIn.duration(200).reduceMotion(ReduceMotion.System)} className="absolute inset-0">
          <Pressable accessibilityLabel="Close menu" className="flex-1 bg-ink/50" onPress={onClose} />
        </Animated.View>
        <Animated.View
          entering={SlideInLeft.duration(240).reduceMotion(ReduceMotion.System)}
          accessibilityViewIsModal
          className="absolute inset-y-0 left-0 w-[82%] max-w-[300px] bg-card shadow-float"
          style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
        >
          <SidebarBody onNavigate={onClose} />
          <Tappable
            accessibilityLabel="Close menu"
            onPress={onClose}
            className="absolute right-2 size-10 items-center justify-center rounded-full active:bg-canvas"
            style={{ top: insets.top + 12 }}
          >
            <Icon as={X} className="size-5 text-muted" />
          </Tappable>
        </Animated.View>
      </View>
    </Modal>
  )
}

/** Logo, technician, every destination and the availability switch. */
function SidebarBody({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname()
  const store = useStore()
  const emergencies = store.jobs.filter((j) => j.status === 'request' && j.priority === 'emergency').length
  const unread = store.notices.filter((n) => !n.read).length
  const [details, setDetails] = useState(false)
  const t = useT()
  return (
    <>
      <View className="h-16 flex-row items-center border-b border-line px-5">
        <Logo />
      </View>
      <Tappable
        onPress={() => setDetails(true)}
        accessibilityLabel="Show technician details"
        className="w-full flex-row items-center gap-3 border-b border-line px-5 py-4 active:bg-canvas active:opacity-100"
      >
        <View>
          <Avatar name={store.tech.name} photo={store.tech.photo} size={40} />
          <View
            className={cn('absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card', store.online ? 'bg-success' : 'bg-faint')}
          />
        </View>
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="text-sm font-extrabold">
            {store.tech.name}
          </Text>
          <Text className="num text-xs font-semibold text-muted">{store.tech.id}</Text>
          <View className="mt-0.5 flex-row items-center gap-1">
            <Icon as={Star} className="size-3 text-warning" fill="#c9730f" />
            <Text className="text-[11px] font-bold text-muted">
              {store.tech.rating.toFixed(2)} • {store.tech.experienceYears} yrs exp.
            </Text>
          </View>
        </View>
        <Icon as={ChevronRight} className="size-4 shrink-0 text-faint" />
      </Tappable>
      <TechnicianSheet open={details} onClose={() => setDetails(false)} onProfile={onNavigate} />
      <ScrollView className="flex-1" contentContainerClassName="gap-0.5 p-3">
        {SIDE.map(({ href, label, icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`)
          const badge = href === '/emergency' ? emergencies : href === '/notifications' ? unread : 0
          return (
            <Tappable
              key={href}
              accessibilityState={{ selected: active }}
              onPress={() => {
                onNavigate()
                if (!active) router.navigate(href)
              }}
              className={cn('h-10 flex-row items-center gap-3 rounded-lg px-3 active:opacity-100', active ? 'bg-brand-soft' : 'active:bg-canvas')}
            >
              <Icon as={icon} className={cn('size-[18px]', active ? 'text-brand' : 'text-ink-2')} strokeWidth={active ? 2.3 : 1.9} />
              <Text className={cn('flex-1 text-sm font-semibold', active ? 'text-brand' : 'text-ink-2')}>{t(label)}</Text>
              {badge > 0 && (
                <View
                  className={cn('h-5 min-w-5 items-center justify-center rounded-full px-1.5', href === '/emergency' ? 'bg-danger' : 'bg-brand')}
                >
                  <Text className="num text-[11px] font-bold text-white">{badge}</Text>
                </View>
              )}
            </Tappable>
          )
        })}
      </ScrollView>
      <View className="border-t border-line p-3">
        <View className={cn('rounded-xl border p-2', store.online ? 'border-success/25 bg-success-soft' : 'border-line-strong bg-canvas')}>
          <View className="flex-row items-center gap-2 px-1 pb-2 pt-0.5" accessibilityLiveRegion="polite">
            {store.online ? (
              <Blink className="size-2 shrink-0 rounded-full bg-success" />
            ) : (
              <View className="size-2 shrink-0 rounded-full bg-faint" />
            )}
            <Text className={cn('text-xs font-bold', store.online ? 'text-success' : 'text-muted')}>
              {t(store.online ? 'Online' : 'Offline')}
            </Text>
            <Text className="text-xs font-bold text-faint">•</Text>
            <Text numberOfLines={1} className="flex-1 text-xs font-bold text-ink-2">
              {t(store.online ? 'Receiving jobs' : 'Not receiving jobs')}
            </Text>
          </View>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel={t('Availability')}
            className="flex-row gap-1 rounded-lg border border-line bg-card p-0.5"
          >
            {([true, false] as const).map((on) => {
              const selected = store.online === on
              return (
                <Tappable
                  key={String(on)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  onPress={() => store.setOnline(on)}
                  className={cn(
                    'h-8 flex-1 items-center justify-center rounded-md',
                    selected ? (on ? 'bg-success' : 'bg-ink-2') : 'active:bg-canvas'
                  )}
                >
                  <Text className={cn('text-[11px] font-extrabold tracking-[0.1em]', selected ? 'text-white' : 'text-muted')}>
                    {t(on ? 'ONLINE' : 'OFFLINE')}
                  </Text>
                </Tappable>
              )
            })}
          </View>
        </View>
        <Tappable
          onPress={() => {
            onNavigate()
            store.setOnline(false)
            store.signOut()
            router.replace('/login')
          }}
          className="mt-2 h-11 w-full flex-row items-center gap-2.5 rounded-xl px-3 active:bg-danger-soft active:opacity-100"
        >
          <Icon as={LogOut} className="size-[18px] text-danger" />
          <Text className="text-sm font-bold text-danger">{t('Logout')}</Text>
        </Tappable>
      </View>
    </>
  )
}

/** The brand-ink splash with the sliding loader, while the saved state is read. */
export function Splash() {
  const x = useSharedValue(-1)
  useEffect(() => {
    x.value = withRepeat(
      withTiming(2, { duration: 1100, easing: Easing.bezier(0.22, 0.61, 0.36, 1), reduceMotion: ReduceMotion.System }),
      -1
    )
  }, [x])
  const bar = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * 48 }] }))
  return (
    <View accessibilityLabel="Loading" className="flex-1 items-center justify-center bg-brand-ink">
      <View className="items-center gap-4">
        <Logo inverted large />
        <View className="h-1 w-24 overflow-hidden rounded-full bg-white/15">
          <Animated.View className="h-full w-1/2 rounded-full bg-white/70" style={bar} />
        </View>
      </View>
    </View>
  )
}
