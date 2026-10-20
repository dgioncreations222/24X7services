import { useState } from 'react'
import { View } from 'react-native'
import { formatPaise, TOPUP_PRESETS, type Paise } from '@app/shared'

import { BottomSheet } from '@/components/ui/Overlay'
import { useToast } from '@/components/Toast'
import { Tappable } from '@/components/ui/Tappable'
import { Text } from '@/components/ui/Text'
import { topUp } from '@/lib/topup'
import { cn } from '@/lib/cn'
import { brand } from '@/config/brand'

/**
 * Choosing how much to put in.
 *
 * Four amounts and no free-text field. A top-up is not a payment for anything
 * in particular, so an empty box asking how much is a question with no right
 * answer in it.
 *
 * The sheet stays open while the gateway is up, and closes on the way back.
 * Closing it under the payment sheet would leave a customer looking at the
 * screen behind, unsure whether anything was charged.
 */
export function AddMoneySheet({
  open,
  onClose,
  onAdded,
}: {
  open: boolean
  onClose: () => void
  onAdded?: () => void
}) {
  const [busy, setBusy] = useState<Paise | null>(null)
  const toast = useToast()

  async function choose(amount: Paise): Promise<void> {
    if (busy !== null) return
    setBusy(amount)
    try {
      const outcome = await topUp(amount)
      if (outcome.kind === 'added') {
        toast.show(`${formatPaise(amount)} added to your balance`, { tone: 'success' })
        onAdded?.()
        onClose()
      }
      // Cancelled: the customer closed the payment sheet. The choices stay up
      // so they can pick again, and nothing is announced — they know.
    } catch {
      // "Your money may or may not have moved" is the only thing a customer
      // can act on.
      toast.show('We could not complete that. If money has left your account, contact support.', {
        tone: 'error',
      })
    } finally {
      setBusy(null)
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      dismissable={busy === null}
      title="Add money"
      description={`Goes into your ${brand.name} balance and comes off your next bill. Refundable on request; it never expires.`}
    >
      <View className="flex-row flex-wrap justify-between gap-y-3 py-4">
        {TOPUP_PRESETS.map((amount) => (
          <Tappable
            key={amount}
            onPress={() => void choose(amount)}
            disabled={busy !== null}
            className={cn(
              'h-14 w-[48%] items-center justify-center rounded-card border',
              busy === amount
                ? 'border-brand bg-brand-soft'
                : cn('border-border active:border-brand', busy !== null && 'opacity-60')
            )}
          >
            <Text className={cn('text-lg font-bold', busy === amount ? 'text-brand' : 'text-ink')}>
              {busy === amount ? 'Opening…' : formatPaise(amount)}
            </Text>
          </Tappable>
        ))}
      </View>

      <Text className="pb-4 text-xs text-muted">
        Your balance can only be spent on {brand.name} services. It cannot be transferred or withdrawn as cash.
      </Text>
    </BottomSheet>
  )
}
