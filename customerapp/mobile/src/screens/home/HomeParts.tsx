import { useEffect } from 'react'
import { View } from 'react-native'
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import type { Href } from 'expo-router'
import { ChevronRight, MapPinOff, ShieldCheck } from 'lucide-react-native'
import type { BannerTone } from '@app/shared'

import { useToneEdge } from '@/components/PromotionalBanner'
import { Icon } from '@/components/ui/Icon'
import { Tappable } from '@/components/ui/Tappable'
import { Text } from '@/components/ui/Text'

/** One tone's gradient behind the top of Home, fading in and out with the slide. */
export function ToneLayer({ tone, shown }: { tone: BannerTone; shown: boolean }) {
  const opacity = useSharedValue(shown ? 1 : 0)
  useEffect(() => {
    opacity.value = withTiming(shown ? 1 : 0, { duration: 500, reduceMotion: ReduceMotion.System })
  }, [shown, opacity])
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }))
  const edge = useToneEdge(tone)
  return (
    <Animated.View style={[{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }, style]}>
      <LinearGradient colors={edge} style={{ flex: 1 }} />
    </Animated.View>
  )
}

/**
 * The one thing on Home that is not a single visit. Both halves of it — the
 * annual plans and Plus — lived under Profile, behind an account, which is
 * where a price list goes to be unread.
 */
export function CarePlansLink() {
  return (
    <Tappable
      href="/profile/plans"
      className="mt-5 flex-row items-center gap-3 rounded-card bg-brand-soft p-4 active:opacity-70"
    >
      <View className="size-10 shrink-0 items-center justify-center rounded-full bg-bg">
        <Icon as={ShieldCheck} className="size-5 text-brand" />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-base font-bold text-ink">Care plans</Text>
        <Text className="mt-0.5 text-sm text-muted">
          Cover a whole year in one go, and stop paying the visit fee.
        </Text>
      </View>
      <Icon as={ChevronRight} className="size-4 text-muted" />
    </Tappable>
  )
}

export function UnserviceableNotice({ area, onChange }: { area: string; onChange: () => void }) {
  return (
    <View
      accessibilityLiveRegion="polite"
      className="mt-5 flex-row items-start gap-3 rounded-card border border-border bg-warning-soft p-4"
    >
      <Icon as={MapPinOff} className="mt-0.5 size-5 text-warning" />
      <View className="min-w-0 flex-1">
        <Text className="text-sm font-semibold text-ink">We do not service {area} yet</Text>
        <Text className="mt-0.5 text-sm text-muted">
          You can look around, but a booking needs an address in an area we cover.
        </Text>
        <Tappable onPress={onChange} className="mt-1 self-start">
          <Text className="text-sm font-semibold text-ink underline">Change location</Text>
        </Tappable>
      </View>
    </View>
  )
}

const FOOTER_LINKS = [
  { href: '/legal/terms', label: 'Terms' },
  { href: '/legal/privacy', label: 'Privacy' },
  { href: '/legal/cancellation', label: 'Cancellation' },
  { href: '/support', label: 'Support' },
] as const satisfies readonly { href: Href; label: string }[]

export function HomeFooter() {
  return (
    <View className="mt-10 border-t border-border pt-5">
      <View className="flex-row flex-wrap" style={{ columnGap: 20, rowGap: 4 }}>
        {FOOTER_LINKS.map((link) => (
          <Tappable key={link.href} href={link.href}>
            <Text className="text-sm text-muted">{link.label}</Text>
          </Tappable>
        ))}
      </View>
    </View>
  )
}
