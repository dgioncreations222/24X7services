import { useCallback, useState } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { Banknote, Check, Lock, Smartphone, WalletMinimal, type LucideIcon } from 'lucide-react-native'
import { DEFAULT_PAYMENT_PREFERENCE, formatPaise, type PaymentPreference } from '@app/shared'

import { ProfileShell, useSignInHref } from '@/components/ProfileShell'
import { ErrorState } from '@/components/ui/States'
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { useToast } from '@/components/Toast'
import { Icon } from '@/components/ui/Icon'
import { Tappable } from '@/components/ui/Tappable'
import { Text } from '@/components/ui/Text'
import { fetchPaymentPreference, savePaymentPreference } from '@/lib/api/payment-methods'
import { fetchWallet } from '@/lib/wallet'
import { useAsync } from '@/lib/useAsync'
import { cn } from '@/lib/cn'
import { brand } from '@/config/brand'

/**
 * How this customer would rather pay.
 *
 * What this screen is not, and says so in the first line: a list of saved
 * cards. We do not have one and will not: the card details go from the
 * customer's phone to Razorpay and never touch this app, which is the only
 * arrangement where a breach here cannot cost anyone money.
 *
 * What it manages instead is a preference — one of three habits, stated once
 * and honoured at checkout. That is a real setting with a real effect, and it
 * is the thing people are actually looking for when they open a screen with
 * this name: not the card number, but "stop asking me every time".
 *
 * Signed out it still draws itself. Three ways to pay and the fact that we
 * hold no cards are things about this business, not about one account. Only
 * the tick needs an account, so only the tick waits for one.
 */

const OPTIONS = [
  {
    id: 'balance_first',
    label: `Use my ${brand.name} balance first`,
    detail: 'Credits and money you have added come off the bill, and you pay the rest.',
    icon: WalletMinimal,
  },
  {
    id: 'online',
    label: 'Card, UPI or netbanking',
    detail: 'Pay the whole bill through the payment sheet, every time.',
    icon: Smartphone,
  },
  {
    id: 'pay_after_service',
    label: 'Pay after the service',
    detail: 'Settle with the technician once the job is done, where the service allows it.',
    icon: Banknote,
  },
] as const satisfies readonly {
  id: PaymentPreference
  label: string
  detail: string
  icon: LucideIcon
}[]

export function PaymentMethodsScreen() {
  return (
    <ProfileShell title="Payment methods" signedOut={<Methods uid={null} />}>
      {(user) => <Methods uid={user.uid} />}
    </ProfileShell>
  )
}

function Methods({ uid }: { uid: string | null }) {
  const signIn = useSignInHref()
  const load = useCallback(async () => {
    if (!uid) {
      return { preference: DEFAULT_PAYMENT_PREFERENCE, balance: 0 }
    }
    const [preference, wallet] = await Promise.all([fetchPaymentPreference(uid), fetchWallet(uid)])
    return { preference, balance: wallet.balance }
  }, [uid])

  const data = useAsync(load)
  const toast = useToast()

  // Held here rather than re-read, so the tick moves under the finger and the
  // write happens behind it. A radio that waits for a round trip feels broken.
  const [chosen, setChosen] = useState<PaymentPreference | null>(null)
  const [saving, setSaving] = useState(false)

  if (data.status === 'loading') {
    return (
      <SkeletonGroup label="Loading payment methods" className="mt-6 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </SkeletonGroup>
    )
  }

  if (data.status === 'error' || !data.data) {
    return <ErrorState className="py-16" onRetry={data.reload} retrying={data.refreshing} />
  }

  const current = chosen ?? data.data.preference
  const balance = data.data.balance

  async function choose(next: PaymentPreference): Promise<void> {
    if (saving || next === current || !uid) return
    const previous = current
    setChosen(next)
    setSaving(true)
    try {
      await savePaymentPreference(uid, next)
    } catch {
      // Put the tick back where it was. A preference that silently did not
      // save is one the customer finds out about at checkout.
      setChosen(previous)
      toast.show('We could not save that. Please try again.', { tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Text className="mt-5 text-sm text-muted">
        Pick how you would rather settle a bill. We ask at checkout either way — this is what comes up first.
      </Text>

      {!uid ? (
        <Text className="mt-2 text-sm text-muted">
          <Text accessibilityRole="link" onPress={() => router.push(signIn)} className="text-sm font-semibold text-brand">
            Sign in
          </Text>{' '}
          to set yours. The three below are what this app offers either way.
        </Text>
      ) : null}

      <View className="mt-4 gap-3">
        {OPTIONS.map((option) => {
          const selected = Boolean(uid) && option.id === current
          return (
            <Tappable
              key={option.id}
              onPress={() => void choose(option.id)}
              accessibilityState={{ selected, disabled: !uid }}
              disabled={!uid}
              className={cn(
                'w-full flex-row items-start gap-3 rounded-card border p-4',
                selected ? 'border-brand bg-brand-soft' : 'border-border',
                uid && !selected && 'active:border-brand',
                // Not a dimmed control signed out — just not live yet.
                !uid && 'active:opacity-100'
              )}
            >
              <Icon as={option.icon} className={cn('mt-0.5 size-5', selected ? 'text-brand' : 'text-muted')} />
              <View className="min-w-0 flex-1">
                <Text className="text-base font-semibold text-ink">{option.label}</Text>
                <Text className="mt-0.5 text-sm text-muted">{option.detail}</Text>
                {option.id === 'balance_first' && uid ? (
                  <Text className="mt-1 text-xs font-semibold tabular-nums text-brand">
                    {formatPaise(balance)} on your balance
                  </Text>
                ) : null}
              </View>
              <View
                aria-hidden
                className={cn(
                  'mt-0.5 size-5 shrink-0 items-center justify-center rounded-full border',
                  selected ? 'border-brand bg-brand' : 'border-border'
                )}
              >
                {selected ? <Icon as={Check} className="size-3.5 text-white" /> : null}
              </View>
            </Tappable>
          )
        })}
      </View>

      <View aria-hidden className="-mx-4 my-6 h-2 bg-surface" />

      {/* The honest version of "manage your cards". */}
      <View className="pb-6">
        <View className="flex-row items-center gap-2">
          <Icon as={Lock} className="size-4 text-muted" />
          <Text accessibilityRole="header" className="text-lg font-bold text-ink">
            We do not store your cards
          </Text>
        </View>
        <Text className="mt-2 text-sm text-muted">
          There is no saved card list here because there are no saved cards. Your card, UPI id and netbanking details
          go straight from your phone to Razorpay, our payment provider, and never reach us. If your bank or Razorpay
          has offered to remember a card, that choice lives with them and you can undo it there.
        </Text>

        <Tappable
          href="/profile/wallet"
          className="mt-4 min-h-11 flex-row items-center gap-2 self-start rounded-pill border border-border px-4 active:border-brand"
        >
          <Icon as={WalletMinimal} className="size-4 text-ink" />
          <Text className="text-sm font-semibold text-ink">See your balance</Text>
        </Tappable>
      </View>
    </>
  )
}
