import { useCallback, useState } from 'react'
import { View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { BadgeCheck, Check, Sparkles } from 'lucide-react-native'
import {
  MEMBERSHIP_BENEFITS,
  MEMBERSHIP_OPTIONS,
  formatPaise,
  isMembershipActive,
  type Membership,
  type MembershipOptionId,
} from '@app/shared'

import { useSignInHref } from '@/components/ProfileShell'
import { ErrorState } from '@/components/ui/States'
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { Icon, useColor } from '@/components/ui/Icon'
import { Tappable } from '@/components/ui/Tappable'
import { Text } from '@/components/ui/Text'
import { useToast } from '@/components/Toast'
import { fetchMembership } from '@/lib/plans'
import { buy } from '@/lib/purchase'
import { daysUntil, formatDateTime } from '@/lib/format'
import { useAsync } from '@/lib/useAsync'
import { cn } from '@/lib/cn'
import { brand } from '@/config/brand'

/** Loads this customer's membership (none when `uid` is null) and shows it. */
export function Plus({ uid }: { uid: string | null }) {
  // Null means nobody is signed in. There is no membership to fetch and no
  // error in that — it is simply not a member.
  const load = useCallback(() => (uid ? fetchMembership(uid) : Promise.resolve(null)), [uid])
  const membership = useAsync(load)

  if (membership.status === 'loading') {
    return (
      <SkeletonGroup label="Loading your membership" className="mt-6 gap-4">
        <Skeleton className="h-44" />
        <Skeleton className="h-40" />
      </SkeletonGroup>
    )
  }

  if (membership.status === 'error') {
    return <ErrorState className="py-16" onRetry={membership.reload} retrying={membership.refreshing} />
  }

  return <PlusBody current={membership.data ?? null} onBought={uid ? membership.reload : undefined} />
}

/** The screen itself, given what is on the account. */
export function PlusBody({
  current,
  onBought,
}: {
  current: Membership | null
  /** Absent when nobody is signed in; the button becomes the way in. */
  onBought?: () => void
}) {
  const active = isMembershipActive(current)

  return (
    <>
      {active && current ? <ActiveCard membership={current} /> : <PitchCard lapsed={current !== null} />}

      <View className="mt-6">
        <Text accessibilityRole="header" className="text-lg font-bold text-ink">
          What you get
        </Text>
        <View className="mt-3 gap-3">
          {MEMBERSHIP_BENEFITS.map((benefit) => (
            <View key={benefit} className="flex-row items-start gap-3">
              <View className="mt-0.5 size-5 items-center justify-center rounded-full bg-success-soft">
                <Icon as={Check} className="size-3.5 text-success" />
              </View>
              <Text className="min-w-0 flex-1 text-base text-ink">{benefit}</Text>
            </View>
          ))}
        </View>
      </View>

      <View aria-hidden className="-mx-4 my-6 h-2 bg-surface" />

      <Buy active={active} {...(onBought ? { onBought } : {})} />

      <Text className="mt-6 pb-6 text-xs text-muted">
        {brand.name} Plus does not renew on its own. We will not charge you again unless you come back
        here and buy it. The visit fee is waived on every booking made while it is live, and 10%
        comes off repairs you approve — both are applied to the booking when it is made, so a
        membership that runs out later does not change a bill you have already been quoted.
      </Text>
    </>
  )
}

/**
 * The web card's dotted corner: a 14px grid of dots fading out from the top
 * right. Drawn as dots because RN has no radial mask; the fade is per dot.
 */
function DotField() {
  const rows = 16
  const cols = 16
  return (
    <View pointerEvents="none" aria-hidden className="absolute -right-10 -top-10 size-56">
      {Array.from({ length: rows }).map((_, r) => (
        <View key={r} className="h-[14px] flex-row">
          {Array.from({ length: cols }).map((__, c) => {
            // Centre of the mask at 70% / 30% of the field, fading by 70%.
            const dx = c / cols - 0.7
            const dy = r / rows - 0.3
            const fade = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / 0.7)
            return (
              <View key={c} className="size-[14px] items-center justify-center">
                {fade > 0 ? (
                  <View className="size-[3px] rounded-full bg-bg" style={{ opacity: 0.25 * fade }} />
                ) : null}
              </View>
            )
          })}
        </View>
      ))}
    </View>
  )
}

/** The card for somebody who is already a member. */
function ActiveCard({ membership }: { membership: Membership }) {
  const left = daysUntil(membership.expiresAt)
  const deep = useColor('text-brand-deep')
  const blue = useColor('text-brand')

  return (
    <View className="mt-5 overflow-hidden rounded-card">
      <LinearGradient colors={[deep, blue]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 20 }}>
        <DotField />

        <View className="flex-row items-center gap-2">
          <Icon as={BadgeCheck} className="size-5 text-white" />
          <Text className="text-sm font-semibold uppercase tracking-[0.84px] text-white">{`${brand.name} Plus`}</Text>
        </View>

        <Text className="mt-8 text-2xl font-bold text-white">You are a member</Text>
        <Text className="mt-1 text-sm text-white/80">
          {left > 0
            ? `${left} ${left === 1 ? 'day' : 'days'} left — until ${formatDateTime(membership.expiresAt)}`
            : 'Ending today'}
        </Text>
        <Text className="mt-3 text-sm text-white/80">
          Paid {membership.period === 'yearly' ? 'yearly' : 'monthly'}. It will not renew on its own.
        </Text>
      </LinearGradient>
    </View>
  )
}

/** The card for somebody who is not — or is not any more. */
function PitchCard({ lapsed }: { lapsed: boolean }) {
  return (
    <View className="mt-5 overflow-hidden rounded-card border border-border p-5">
      <View className="flex-row items-center gap-2">
        <Icon as={Sparkles} className="size-5 text-brand" />
        <Text className="text-sm font-semibold uppercase tracking-[0.84px] text-brand">{`${brand.name} Plus`}</Text>
      </View>

      <Text className="mt-3 text-2xl font-bold text-ink">
        {lapsed ? 'Your membership has run out' : 'No visit fee. Ever. On anything.'}
      </Text>
      <Text className="mt-2 text-sm text-muted">
        {lapsed
          ? 'Buy it again and the visit fee goes back to nothing from your next booking.'
          : 'One membership on the account, every appliance in the house. The fee we charge to come out disappears, and 10% comes off every repair you approve.'}
      </Text>
    </View>
  )
}

/**
 * Choosing how long for.
 *
 * Two lengths, with what the yearly one saves stated as a number rather than as
 * a badge saying "best value" — the customer can check a number.
 */
function Buy({ active, onBought }: { active: boolean; onBought?: () => void }) {
  const [chosen, setChosen] = useState<MembershipOptionId>('plus-yearly')
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  const signIn = useSignInHref()

  const option = MEMBERSHIP_OPTIONS.find((each) => each.id === chosen) ?? MEMBERSHIP_OPTIONS[0]

  async function pay(): Promise<void> {
    if (busy) return
    setBusy(true)
    try {
      const outcome = await buy({ kind: 'membership', optionId: chosen })
      if (outcome.kind === 'bought') {
        toast.show(active ? 'Membership extended.' : `You are a ${brand.name} Plus member.`, { tone: 'success' })
        onBought?.()
      }
      // Cancelled: the customer closed the payment sheet. Nothing to announce.
    } catch {
      toast.show('We could not complete that. If money has left your account, contact support.', {
        tone: 'error',
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <View>
      <Text accessibilityRole="header" className="text-lg font-bold text-ink">
        {active ? 'Add more time' : 'Become a member'}
      </Text>
      {active ? (
        <Text className="mt-1 text-sm text-muted">
          Buying now adds to what is left rather than starting again.
        </Text>
      ) : null}

      <View className="mt-3 flex-row gap-3">
        {MEMBERSHIP_OPTIONS.map((each) => {
          const selected = each.id === chosen
          const saving = 'compareAt' in each && each.compareAt ? each.compareAt - each.price : 0
          return (
            <Tappable
              key={each.id}
              onPress={() => setChosen(each.id)}
              accessibilityState={{ selected }}
              className={cn(
                'min-w-0 flex-1 rounded-card border p-4 active:opacity-100',
                selected ? 'border-brand bg-brand-soft' : 'border-border active:border-brand'
              )}
            >
              <Text className="text-sm font-semibold text-ink">{each.label}</Text>
              <Text className="mt-1 text-xl font-bold text-ink tabular-nums">{formatPaise(each.price)}</Text>
              <Text className="mt-0.5 text-xs text-muted">
                {saving > 0 ? `Saves ${formatPaise(saving)} a year` : `${each.durationDays} days`}
              </Text>
            </Tappable>
          )
        })}
      </View>

      {onBought ? (
        <Button className="mt-4" fullWidth loading={busy} onPress={() => void pay()}>
          {`${active ? 'Extend for' : 'Join for'} ${formatPaise(option?.price ?? 0)}`}
        </Button>
      ) : (
        <Button className="mt-4" fullWidth href={signIn}>
          Sign in to join
        </Button>
      )}
    </View>
  )
}
