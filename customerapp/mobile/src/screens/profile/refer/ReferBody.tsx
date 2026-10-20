import { useCallback, useState } from 'react'
import { View } from 'react-native'
import type { Href } from 'expo-router'
import { Gift, Ticket, UserRoundPlus, type LucideIcon } from 'lucide-react-native'
import {
  REFERRAL_REWARD,
  REFERRAL_WELCOME,
  formatPaise,
  normaliseReferralCode,
  referralCodeSchema,
  REFERRAL_CODE_EXAMPLE,
} from '@app/shared'

import { ReferCard } from '@/components/ReferCard'
import { Faq } from '@/screens/profile/refer/ReferFaq'
import { ErrorState } from '@/components/ui/States'
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { Tappable } from '@/components/ui/Tappable'
import { Text } from '@/components/ui/Text'
import { useToast } from '@/components/Toast'
import { callFn, friendlyError } from '@/lib/callables'
import { useAsync } from '@/lib/useAsync'
import { cn } from '@/lib/cn'
import { brand } from '@/config/brand'

export function Refer() {
  const load = useCallback(() => callFn('getReferral', {}), [])
  const referral = useAsync(load)

  if (referral.status === 'loading') {
    return (
      <SkeletonGroup label="Loading your code" className="mt-6 gap-4">
        <Skeleton className="h-64" />
        <Skeleton className="h-24" />
      </SkeletonGroup>
    )
  }

  if (referral.status === 'error' || !referral.data) {
    return <ErrorState className="py-16" onRetry={referral.reload} retrying={referral.refreshing} />
  }

  return <ReferView {...referral.data} onApplied={referral.reload} />
}

/** The signed-in screen, once the referral record is in. */
export function ReferView({
  code,
  invited,
  earned,
  canApplyCode,
  usedCode,
  onApplied,
}: {
  code: string
  invited: number
  earned: number
  canApplyCode: boolean
  usedCode: boolean
  onApplied: () => void
}) {
  return (
    <>
      <ReferCard code={code} />

      <View className="mt-3 flex-row gap-3">
        <Stat icon={UserRoundPlus} label="Friends who booked" value={String(invited)} />
        <Stat icon={Gift} label="You have earned" value={formatPaise(earned)} />
      </View>

      <HowItWorks />

      <Faq />

      <Band />

      {canApplyCode ? (
        <ApplyCode onApplied={onApplied} />
      ) : (
        <View>
          <Text accessibilityRole="header" className="text-lg font-bold text-ink">
            Using someone&apos;s code
          </Text>
          <Text className="mt-2 text-sm text-muted">
            {usedCode
              ? 'You have already used a referral code on this account. One per customer.'
              : 'A referral code only works before your first booking, and you have already booked with us.'}
          </Text>
        </View>
      )}

      <View className="mt-6 items-center pb-6">
        <Tappable href={'/legal/terms' as Href}>
          <Text className="text-sm font-semibold text-brand">Terms and conditions</Text>
        </Tappable>
      </View>
    </>
  )
}

function Stat({ icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <View className="min-w-0 flex-1 rounded-card border border-border p-4">
      <Icon as={icon} className="size-5 text-muted" />
      <Text className="mt-3 text-sm text-muted">{label}</Text>
      <Text className="mt-0.5 text-lg font-bold text-ink tabular-nums">{value}</Text>
    </View>
  )
}

/**
 * The three steps, in a card, with the line that makes them a sequence.
 *
 * The third one is the one that matters and it is worded to be impossible to
 * misread: the money arrives when the job is done, not when somebody signs up.
 */
function HowItWorks() {
  const steps = [
    {
      title: 'Send your code',
      body: `To anyone who has not booked with ${brand.name} before.`,
    },
    {
      title: 'They enter it before their first booking',
      body: 'Under Profile, Refer & earn. It only works before that first job.',
    },
    {
      title: 'Their first job gets finished',
      body: `That is when we pay — ${formatPaise(REFERRAL_REWARD)} to you and ${formatPaise(
        REFERRAL_WELCOME
      )} to them, as credits. Not before, because a booking that never happened is not a referral.`,
    },
  ]

  return (
    <View className="mt-6 rounded-card bg-surface p-5">
      <Text accessibilityRole="header" className="text-lg font-bold text-ink">
        How it works
      </Text>
      <View className="mt-4">
        {steps.map((step, index) => (
          <View key={step.title} className="flex-row gap-3">
            <View className="items-center" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <View className="size-7 shrink-0 items-center justify-center rounded-full bg-bg">
                <Text className="text-sm font-bold text-ink">{index + 1}</Text>
              </View>
              {index < steps.length - 1 ? <View className="w-px flex-1 bg-border" /> : null}
            </View>
            <View className={cn('min-w-0 flex-1', index < steps.length - 1 && 'pb-5')}>
              <Text className="text-base font-semibold text-ink">{step.title}</Text>
              <Text className="mt-0.5 text-sm leading-[22px] text-muted">{step.body}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}

/**
 * The box for somebody else's code.
 *
 * Shown only while it can still work — before a first booking, and only once.
 * A field that takes a code and then explains why it was refused is a worse
 * screen than one that says up front that the moment has passed.
 */
function ApplyCode({ onApplied }: { onApplied: () => void }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  async function submit(): Promise<void> {
    if (busy) return

    const code = normaliseReferralCode(value)
    const parsed = referralCodeSchema.safeParse(code)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'That is not a valid code.')
      return
    }

    setError(undefined)
    setBusy(true)
    try {
      await callFn('applyReferralCode', { code: parsed.data })
      toast.show('Code applied. You will both be credited once your first job is done.', { tone: 'success' })
      setValue('')
      onApplied()
    } catch (caught) {
      setError(friendlyError(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <View>
      <Text accessibilityRole="header" className="text-lg font-bold text-ink">
        Have someone&apos;s code?
      </Text>
      <Text className="mt-1 text-sm text-muted">
        Enter it before your first booking and you both get {formatPaise(REFERRAL_WELCOME)} once that job is
        finished.
      </Text>

      <View className="mt-3 gap-3">
        <Input
          label="Referral code"
          hideLabel
          placeholder={REFERRAL_CODE_EXAMPLE}
          value={value}
          onChangeText={setValue}
          {...(error ? { error } : {})}
          autoCapitalize="characters"
          autoCorrect={false}
          spellCheck={false}
          returnKeyType="done"
          onSubmitEditing={() => void submit()}
          className="font-mono uppercase tracking-[1.9px]"
        />
        <Button
          onPress={() => void submit()}
          loading={busy}
          disabled={value.trim().length === 0}
          iconLeft={<Icon as={Ticket} className="size-4 text-white" />}
        >
          Apply code
        </Button>
      </View>
    </View>
  )
}

function Band() {
  return <View aria-hidden className="-mx-4 my-6 h-2 bg-surface" />
}
