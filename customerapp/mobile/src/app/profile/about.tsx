import { useCallback } from 'react'
import { Linking, View } from 'react-native'
import type { Href } from 'expo-router'
import Constants from 'expo-constants'
import {
  ChevronRight,
  FileText,
  Headset,
  Phone,
  ShieldCheck,
  Undo2,
  type LucideIcon,
} from 'lucide-react-native'

import { Header, Screen } from '@/components/Screen'
import { Icon } from '@/components/ui/Icon'
import { Img } from '@/components/ui/Img'
import { Tappable } from '@/components/ui/Tappable'
import { Text } from '@/components/ui/Text'
import { fetchBusinessConfig } from '@/lib/catalog'
import { useAsync } from '@/lib/useAsync'
import { cn } from '@/lib/cn'
import { brand } from '@/config/brand'

/**
 * Who we are, what you agreed to, and how to reach a person.
 *
 * Open to anyone, signed in or not. An About screen behind a login is a company
 * that will tell you its registered name once you have given it your phone
 * number, and the two things most often wanted from this screen — the support
 * number and the cancellation policy — are wanted most by people deciding
 * whether to book at all.
 *
 * The legal name, the GSTIN and the address are read from the same config
 * document that every invoice copies, so this screen and the bill can never
 * disagree about who took the money.
 */

/** The app's own version, from app.json. */
const APP_VERSION = Constants.expoConfig?.version

const LEGAL: readonly { href: Href; label: string; detail: string; icon: LucideIcon }[] = [
  {
    href: '/legal/terms',
    label: 'Terms of service',
    detail: 'What you agreed to when you signed in',
    icon: FileText,
  },
  {
    href: '/legal/privacy',
    label: 'Privacy policy',
    detail: 'What we keep, and for how long',
    icon: ShieldCheck,
  },
  {
    href: '/legal/cancellation',
    label: 'Cancellation and refunds',
    detail: 'What it costs to call one off',
    icon: Undo2,
  },
]

export default function AboutScreen() {
  const load = useCallback(() => fetchBusinessConfig(), [])
  const config = useAsync(load)
  const phone = config.data?.supportPhone

  return (
    <Screen header={<Header title={`About ${brand.name}`} showBack backFallback="/profile" />}>
      {/*
        The mark, the name and the build, in that order and at the top.
        It is the first thing an About screen is asked for — somebody
        reporting a problem is usually here to read the version number back
        to support, and making them scroll to the footer for it is the whole
        reason they rang.
      */}
      <View className="mt-6">
        <View className="size-16 overflow-hidden rounded-card bg-night">
          <Img src="/icons/icon-192.png" alt="" className="size-16" />
        </View>

        <Text accessibilityRole="header" className="mt-4 text-2xl font-bold text-ink">
          {brand.fullName}
        </Text>
        {APP_VERSION ? (
          <Text className="mt-0.5 text-sm text-muted tabular-nums">Version {APP_VERSION}</Text>
        ) : null}

        <Text className="mt-4 text-base leading-[26px] text-ink">
          Appliance repair that turns up when it said it would. We service refrigerators, washing
          machines, air conditioners, microwaves and geysers across Hyderabad.
        </Text>
        <Text className="mt-3 text-sm leading-[22px] text-muted">
          Every technician is on our own roster, not a marketplace of strangers. The visit fee is
          what you pay to book, and anything beyond it is itemised and quoted on site — nothing is
          started until you approve it. Every completed job carries a written warranty, and every
          bill is a GST invoice you can download.
        </Text>
      </View>

      <Band />

      <View>
        <Text accessibilityRole="header" className="text-lg font-bold text-ink">
          Talk to a person
        </Text>
        <View className="mt-2 border-y border-border">
          <Row href="/support" icon={Headset} label="Help & support" detail="Open a ticket about any booking" />
          {phone ? (
            <Row
              onPress={() => void Linking.openURL(`tel:${phone}`)}
              icon={Phone}
              label="Call us"
              detail={phone}
              divided
              tabular
            />
          ) : null}
        </View>
      </View>

      <Band />

      <View>
        <Text accessibilityRole="header" className="text-lg font-bold text-ink">
          The paperwork
        </Text>
        <View className="mt-2 border-y border-border">
          {LEGAL.map((item, index) => (
            <Row
              key={item.label}
              href={item.href}
              icon={item.icon}
              label={item.label}
              detail={item.detail}
              divided={index > 0}
            />
          ))}
        </View>
      </View>

      <Band />

      {/*
        The registered entity, read from the same document the invoices copy.
        It is small print because it is small print — but it is on a screen a
        customer can find, which is the difference between a business and a
        phone number.
      */}
      <View className="pb-6">
        <Text accessibilityRole="header" className="text-lg font-bold text-ink">
          Registered details
        </Text>
        {config.data ? (
          <View className="mt-3 gap-3">
            <Detail term="Legal name" value={config.data.legalName} />
            <Detail term="GSTIN" value={config.data.gstin} mono />
            <Detail term="Registered address" value={config.data.address} />
            <Detail
              term="Service tax rate"
              value={`${config.data.gstRate}% GST, included in every price shown`}
            />
          </View>
        ) : (
          <Text className="mt-3 text-sm text-muted">
            {config.status === 'loading'
              ? 'Loading…'
              : 'We could not load these right now. They are printed on every invoice.'}
          </Text>
        )}
      </View>
    </Screen>
  )
}

function Row({
  href,
  onPress,
  icon,
  label,
  detail,
  divided = false,
  tabular = false,
}: {
  href?: Href
  onPress?: () => void
  icon: LucideIcon
  label: string
  detail: string
  divided?: boolean
  tabular?: boolean
}) {
  return (
    <Tappable
      {...(href ? { href } : {})}
      onPress={onPress}
      className={cn(
        'flex-row items-center gap-4 py-4 active:bg-surface active:opacity-100',
        divided && 'border-t border-border'
      )}
    >
      <Icon as={icon} className="size-5 text-ink" />
      <View className="min-w-0 flex-1">
        <Text className="text-base font-medium text-ink">{label}</Text>
        <Text className={cn('mt-0.5 text-xs text-muted', tabular && 'tabular-nums')}>{detail}</Text>
      </View>
      <Icon as={ChevronRight} className="size-5 text-muted" />
    </Tappable>
  )
}

function Detail({
  term,
  value,
  mono = false,
}: {
  term: string
  value: string
  /** For a number that gets read out digit by digit. */
  mono?: boolean
}) {
  return (
    <View>
      <Text className="text-xs text-muted">{term}</Text>
      <Text className={cn('mt-0.5 text-sm text-ink', mono && 'tabular-nums')}>{value}</Text>
    </View>
  )
}

/** The full-width grey rule this app puts between unrelated blocks. */
function Band() {
  return <View aria-hidden className="-mx-4 my-6 h-2 bg-surface" />
}
