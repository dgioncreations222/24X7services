import { useCallback } from 'react'
import { Linking, View } from 'react-native'
import type { Href } from 'expo-router'
import {
  BadgeCheck,
  CalendarClock,
  ChevronRight,
  Compass,
  MessageSquare,
  Phone,
  ReceiptIndianRupee,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from 'lucide-react-native'

import { AppShell, Section } from '@/components/AppShell'
import { Header } from '@/components/Screen'
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { Tappable } from '@/components/ui/Tappable'
import { Text } from '@/components/ui/Text'
import { SUPPORT_TOPICS } from '@/screens/support/topics'
import { fetchBusinessConfig } from '@/lib/catalog'
import { cn } from '@/lib/cn'
import { formatPhone } from '@/lib/format'
import { useAsync } from '@/lib/useAsync'

/**
 * Getting help.
 *
 * The phone number is on this screen, not buried under three taps of chat. Some
 * problems — an expert who has not turned up, a charge that looks wrong — are
 * problems people want to say out loud, and hiding the number to deflect them
 * into a form only makes the call angrier when it comes.
 *
 * Under it, every topic the inbox actually fills up with, each opening to its
 * questions answered in full rather than to an article somewhere else. The
 * answers live in `topics.ts`; this screen only decides the order they are
 * offered in, which is roughly the order people arrive needing them.
 */

/** Which icon stands for which topic. The topics themselves carry no JSX. */
const TOPIC_ICONS: Record<string, LucideIcon> = {
  'getting-started': Compass,
  'booking-changes': CalendarClock,
  payments: ReceiptIndianRupee,
  'plans-membership': BadgeCheck,
  warranty: ShieldCheck,
  account: UserRound,
}

export default function SupportScreen() {
  const load = useCallback(() => fetchBusinessConfig(), [])
  const config = useAsync(load)

  return (
    // A tab root on the phone, so no back arrow: the tab bar is the way out.
    <AppShell mobileHeader={<Header title="Support" />}>
      <Text className="mt-5 text-sm leading-[22px] text-muted">
        Tell us what happened and we will sort it out. Most things are quicker
        to fix than to explain.
      </Text>

      <View className="mt-5 gap-3">
        <Tappable
          href="/support/chat"
          className="flex-row items-center gap-3 rounded-card bg-ink p-4"
        >
          <Icon as={MessageSquare} className="size-5 shrink-0 text-bg" />
          <View className="min-w-0 flex-1">
            <Text className="text-base font-semibold text-bg">Start a conversation</Text>
            <Text className="mt-0.5 text-sm text-bg/70">Answered here, in the app</Text>
          </View>
        </Tappable>

        {config.status === 'loading' ? (
          <SkeletonGroup label="Loading">
            <Skeleton className="h-20 w-full" />
          </SkeletonGroup>
        ) : config.data ? (
          <Tappable
            accessibilityRole="link"
            onPress={() => void Linking.openURL(`tel:${config.data?.supportPhone}`)}
            className="flex-row items-center gap-3 rounded-card border border-ink p-4"
          >
            <Icon as={Phone} className="size-5 shrink-0 text-ink" />
            <View className="min-w-0 flex-1">
              <Text className="text-base font-semibold text-ink">Call us</Text>
              <Text className="mt-0.5 text-sm text-muted">
                {formatPhone(config.data.supportPhone)}
              </Text>
            </View>
          </Tappable>
        ) : null}
      </View>

      <Tappable
        href="/support/tickets"
        className="mt-3 min-h-12 items-center justify-center rounded-card border border-border active:border-brand"
      >
        <Text className="text-sm font-semibold text-ink">Your past conversations</Text>
      </Tappable>

      <Section title="All topics">
        <View className="-mx-4 border-y border-border">
          {SUPPORT_TOPICS.map((topic, index) => {
            const TopicIcon = TOPIC_ICONS[topic.id] ?? UserRound
            return (
              <Tappable
                key={topic.id}
                href={`/support/topic?t=${topic.id}` as Href}
                className={cn(
                  'flex-row items-center gap-4 px-4 py-4 active:bg-surface active:opacity-100',
                  index < SUPPORT_TOPICS.length - 1 && 'border-b border-border'
                )}
              >
                <Icon as={TopicIcon} className="size-5 shrink-0 text-ink" />
                <View className="min-w-0 flex-1">
                  <Text className="text-base font-medium text-ink">{topic.label}</Text>
                  <Text className="mt-0.5 text-xs text-muted">{topic.blurb}</Text>
                </View>
                <Icon as={ChevronRight} className="size-5 shrink-0 text-muted" />
              </Tappable>
            )
          })}
        </View>
      </Section>

      <Card className="mt-6 p-4">
        <Text className="text-sm leading-[22px] text-muted">
          If an expert has not arrived within your two-hour window, tell us
          straight away — we would rather hear it from you than from a review.
        </Text>
      </Card>
    </AppShell>
  )
}
