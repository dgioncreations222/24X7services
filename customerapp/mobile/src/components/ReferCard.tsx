import { useState } from 'react'
import { Linking, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Circle, Defs, Mask, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg'
import {
  Copy,
  Gift,
  Link2,
  MessageCircle,
  MessageSquare,
  Share2,
  type LucideIcon,
} from 'lucide-react-native'
import { REFERRAL_WELCOME, formatPaise, referralShareText } from '@app/shared'

import { useToast } from '@/components/Toast'
import { Icon, useColor } from '@/components/ui/Icon'
import { Tappable } from '@/components/ui/Tappable'
import { Text } from '@/components/ui/Text'
import { copyText, shareText } from '@/lib/share'
import { cn } from '@/lib/cn'
import { brand } from '@/config/brand'

/** Where the invite points. The web build uses its own origin; the app has none. */
const APP_URL = brand.appUrl

/**
 * The offer, the code, and the ways to send it — one block, because they are
 * one thought: here is what it is worth, here is the thing to send, here is
 * how to send it.
 *
 * Brand colours and the same speckle as the balance card, because this is the
 * other screen in the app that hands a customer a number worth money, and a
 * second decorative treatment invented for one card is how a design system
 * starts leaking.
 */
export function ReferCard({ code }: { code: string }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const deep = useColor('text-brand-deep')
  const blue = useColor('text-brand')

  const message = referralShareText(code, APP_URL)

  async function sheet(): Promise<void> {
    if (busy) return
    setBusy(true)
    const outcome = await shareText(message, `Try ${brand.name}`)
    setBusy(false)
    if (outcome === 'copied') {
      toast.show('Invite copied. Paste it wherever you like.', { tone: 'success' })
    } else if (outcome === 'failed') {
      toast.show('We could not open the share sheet. Copy the code instead.', {
        tone: 'error',
      })
    }
    // 'shared' and 'dismissed' are the customer's own doing — nothing to say.
  }

  async function copyLink(): Promise<void> {
    const outcome = await copyText(message)
    toast.show(outcome === 'copied' ? 'Invite copied.' : 'We could not copy that.', {
      tone: outcome === 'copied' ? 'success' : 'error',
    })
  }

  async function copyCode(): Promise<void> {
    const outcome = await copyText(code)
    toast.show(outcome === 'copied' ? `${code} copied` : 'We could not copy that.', {
      tone: outcome === 'copied' ? 'success' : 'error',
    })
  }

  return (
    <View className="relative mt-5 overflow-hidden rounded-card">
      <LinearGradient
        colors={[deep, blue]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
      />
      <Speckle />

      <View className="relative p-5">
        <View className="flex-row items-start justify-between gap-4">
          <View className="min-w-0 flex-1">
            <Text className="text-2xl font-bold leading-[33px] text-white">
              Refer a friend, you both get {formatPaise(REFERRAL_WELCOME)}
            </Text>
            <Text className="mt-2 max-w-[352px] text-sm text-white/80">
              Credits land on both balances once their first job is finished — not when they sign up.
            </Text>
          </View>
          <Icon as={Gift} className="size-10 text-white/70" />
        </View>

        {/* The code as a thing you can press, because the first instinct is to
            grab it rather than to read it. */}
        <Tappable
          onPress={() => void copyCode()}
          accessibilityLabel={`Your code ${code}. Copy`}
          className="mt-5 w-full flex-row items-center justify-between gap-3 rounded-card border border-dashed border-white/40 px-4 py-3 active:bg-white/10 active:opacity-100"
        >
          <View className="min-w-0 flex-1">
            <Text className="text-xs font-semibold uppercase tracking-[0.96px] text-white/70">Your code</Text>
            <Text className="mt-0.5 font-mono text-xl font-bold tracking-[2.6px] text-white">{code}</Text>
          </View>
          <Icon as={Copy} className="size-5 text-white/80" />
        </Tappable>
      </View>

      <View className="relative border-t border-white/20 px-5 py-4">
        <Text className="text-center text-xs font-semibold uppercase tracking-[0.72px] text-white/70">
          Refer via
        </Text>
        <View className="mt-3 flex-row gap-2">
          <Channel
            icon={MessageCircle}
            label="WhatsApp"
            href={`https://wa.me/?text=${encodeURIComponent(message)}`}
          />
          <Channel icon={MessageSquare} label="SMS" href={`sms:?body=${encodeURIComponent(message)}`} />
          <Channel icon={Link2} label="Copy link" onPress={() => void copyLink()} />
          <Channel icon={Share2} label="More" onPress={() => void sheet()} disabled={busy} />
        </View>
      </View>
    </View>
  )
}

/**
 * The dotted corner the web draws with a radial-gradient background, masked
 * to fade out from the top right. Drawn here as an SVG pattern under a mask.
 */
function Speckle() {
  const dot = useColor('text-bg')
  const opaque = useColor('text-white')
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="absolute -right-10 -top-10 size-56 opacity-25"
    >
      <Svg width="100%" height="100%" viewBox="0 0 224 224">
        <Defs>
          <Pattern id="dots" width="14" height="14" patternUnits="userSpaceOnUse">
            <Circle cx="7" cy="7" r="1.5" fill={dot} />
          </Pattern>
          <RadialGradient id="fade" cx="70%" cy="30%" r="70%">
            <Stop offset="0" stopColor={opaque} stopOpacity="1" />
            <Stop offset="1" stopColor={opaque} stopOpacity="0" />
          </RadialGradient>
          <Mask id="mask">
            <Rect width="224" height="224" fill="url(#fade)" />
          </Mask>
        </Defs>
        <Rect width="224" height="224" fill="url(#dots)" mask="url(#mask)" />
      </Svg>
    </View>
  )
}

/**
 * One way to send the invite.
 *
 * A link where the channel is a URL the operating system knows how to open,
 * and a button where it is something this app does. They are drawn the same
 * because to a customer they are the same thing: a way to get the code to
 * somebody.
 */
function Channel({
  icon,
  label,
  href,
  onPress,
  disabled = false,
}: {
  icon: LucideIcon
  label: string
  href?: string
  onPress?: () => void
  disabled?: boolean
}) {
  return (
    <Tappable
      onPress={href ? () => void Linking.openURL(href).catch(() => undefined) : onPress}
      disabled={disabled}
      accessibilityRole={href ? 'link' : 'button'}
      accessibilityLabel={`Refer via ${label}`}
      className={cn(
        'min-w-0 flex-1 items-center gap-1.5 rounded-card py-1',
        disabled ? 'opacity-60' : 'active:bg-white/10 active:opacity-100'
      )}
    >
      <View className="size-11 items-center justify-center rounded-full bg-white">
        <Icon as={icon} className="size-5 text-royal" />
      </View>
      <Text numberOfLines={1} className="text-xs font-medium text-white/90">
        {label}
      </Text>
    </Tappable>
  )
}
