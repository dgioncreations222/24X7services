import { useCallback, useState } from 'react'
import { Platform, View } from 'react-native'
import { Copy, Gift, Plus, Ticket } from 'lucide-react-native'
import {
  GIFT_CARD_AMOUNTS,
  formatPaise,
  giftCardCodeSchema,
  normaliseGiftCode,
  type GiftCard,
  type Paise,
  GIFT_CARD_CODE_EXAMPLE,
} from '@app/shared'

import { ProfileShell, SignInPrompt } from '@/components/ProfileShell'
import { BottomSheet } from '@/components/BottomSheet'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { Skeleton, SkeletonGroup } from '@/components/SkeletonLoader'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Field'
import { Tag } from '@/components/ui/Chip'
import { Icon } from '@/components/ui/Icon'
import { Tappable } from '@/components/ui/Tappable'
import { Text } from '@/components/ui/Text'
import { useToast } from '@/components/Toast'
import { callFn, friendlyError } from '@/lib/callables'
import { fetchMyGiftCards } from '@/lib/giftCards'
import { buy } from '@/lib/purchase'
import { copyText, shareText } from '@/lib/share'
import { formatDateTime } from '@/lib/format'
import { useAsync } from '@/lib/useAsync'
import { cn } from '@/lib/cn'
import { brand } from '@/config/brand'

/** The web's font-mono: the codes read character by character. */
const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' })

/**
 * Gift cards: buying one, and turning one into credits.
 *
 * Both halves are on one screen because they are the two ends of the same
 * object and a customer holding a code should not have to work out which of
 * two screens it belongs on. Redeeming is first — someone arriving with a code
 * in their hand outnumbers someone deciding to buy one.
 *
 * What lands is credits on the balance, which means every limit already on the
 * balance applies without being restated: our services only, no transfer, no
 * cash. That is also why there is no "check balance" for a card — a redeemed
 * card is not a card any more, it is a line on a statement.
 */
export function GiftCardsScreen() {
  return (
    <ProfileShell
      title="Gift cards"
      // Both halves of this screen need an account — a code becomes credits on
      // a balance, and a balance belongs to somebody. So signed out it says
      // what a gift card is and offers the way in.
      signedOut={<GiftCardsSignedOut />}
    >
      {(user) => <GiftCards uid={user.uid} />}
    </ProfileShell>
  )
}

function Point({ lead, children }: { lead: string; children: string }) {
  return (
    <Text className="text-sm text-ink">
      <Text className="text-sm font-semibold text-ink">{lead}</Text> {children}
    </Text>
  )
}

function GiftCardsSignedOut() {
  return (
    <>
      <SignInPrompt
        className="py-10"
        icon={Gift}
        title="Redeem one, or send one"
        description="Redeem a code onto your balance, or buy one to pass on. Both need an account, because a balance belongs to somebody."
      />

      <Band />

      <View className="pb-6">
        <Text accessibilityRole="header" className="text-lg font-bold text-ink">
          How they work
        </Text>
        <View className="mt-3 gap-3">
          <Point lead="A code, not a card.">
            {`We give you a code like ${GIFT_CARD_CODE_EXAMPLE}. Forward it, screenshot it, read it out — whoever has it can redeem it, once.`}
          </Point>
          <Point lead="It lands on a balance.">
            {`Redeeming puts the amount on the ${brand.name} balance and it comes off the next bill. Nothing to enter at checkout.`}
          </Point>
          <Point lead="It never expires.">There is no date on it and no sweep that takes it back.</Point>
          <Point lead={`${brand.name} services only.`}>
            Like the rest of the balance, it cannot be transferred or taken as cash.
          </Point>
        </View>
      </View>
    </>
  )
}

export function GiftCards({ uid }: { uid: string }) {
  const load = useCallback(() => fetchMyGiftCards(uid), [uid])
  const cards = useAsync(load)
  const [buying, setBuying] = useState(false)

  return (
    <GiftCardsBody
      status={cards.status}
      cards={cards.data ?? []}
      onRetry={cards.reload}
      retrying={cards.refreshing}
      buying={buying}
      setBuying={setBuying}
      onBought={cards.reload}
    />
  )
}

/** The signed-in screen, given its cards — split out so it can be drawn with sample data. */
export function GiftCardsBody({
  status,
  cards,
  onRetry,
  retrying,
  buying,
  setBuying,
  onBought,
}: {
  status: 'loading' | 'ready' | 'error'
  cards: readonly GiftCard[]
  onRetry: () => void
  retrying: boolean
  buying: boolean
  setBuying: (next: boolean) => void
  onBought: () => void
}) {
  return (
    <>
      <Redeem />

      <Band />

      <View>
        <View className="flex-row items-center justify-between gap-3">
          <Text accessibilityRole="header" className="text-lg font-bold text-ink">
            Cards you have bought
          </Text>
          <Tappable onPress={() => setBuying(true)} className="min-h-11 shrink-0 flex-row items-center gap-1.5">
            <Icon as={Plus} className="size-4 text-brand" />
            <Text className="text-sm font-semibold text-brand">Buy one</Text>
          </Tappable>
        </View>

        {status === 'loading' ? (
          <SkeletonGroup label="Loading your gift cards" className="mt-3 gap-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </SkeletonGroup>
        ) : status === 'error' ? (
          <ErrorState className="py-12" onRetry={onRetry} retrying={retrying} />
        ) : cards.length === 0 ? (
          <EmptyState
            className="py-12"
            icon={Gift}
            title="No gift cards yet"
            description={`Buy one and we give you a code to pass on. It never expires, and it can only be spent on ${brand.name} services.`}
            action={{ label: 'Buy a gift card', onClick: () => setBuying(true) }}
          />
        ) : (
          <View className="mt-3 gap-3">
            {cards.map((card) => (
              <CardRow key={card.code} card={card} />
            ))}
          </View>
        )}
      </View>

      <BuySheet open={buying} onClose={() => setBuying(false)} onBought={onBought} />
    </>
  )
}

// ---------------------------------------------------------------------------

/**
 * The box a code goes into.
 *
 * At the top of the screen and never behind a tap, because the person using it
 * is holding a phone in one hand and reading a code off something in the other.
 */
function Redeem() {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  async function submit(): Promise<void> {
    if (busy) return

    const code = normaliseGiftCode(value)
    const parsed = giftCardCodeSchema.safeParse(code)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'That is not a valid code.')
      return
    }

    setError(undefined)
    setBusy(true)
    try {
      const result = await callFn('redeemGiftCard', { code: parsed.data })
      toast.show(`${formatPaise(result.amount)} added. Your balance is now ${formatPaise(result.balance)}.`, {
        tone: 'success',
      })
      setValue('')
    } catch (caught) {
      setError(friendlyError(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <View className="mt-5">
      <Text accessibilityRole="header" className="text-lg font-bold text-ink">
        Redeem a gift card
      </Text>
      <Text className="mt-1 text-sm text-muted">
        The amount lands on your {brand.name} balance and comes off your next bill. It never expires.
      </Text>

      <View className="mt-3 gap-3">
        <Input
          label="Gift card code"
          hideLabel
          placeholder={GIFT_CARD_CODE_EXAMPLE}
          value={value}
          onChangeText={setValue}
          {...(error ? { error } : {})}
          autoCapitalize="characters"
          autoCorrect={false}
          spellCheck={false}
          returnKeyType="go"
          onSubmitEditing={() => void submit()}
          className="tracking-[1.92px]"
        />
        <Button
          loading={busy}
          disabled={value.trim().length === 0}
          onPress={() => void submit()}
          iconLeft={<Icon as={Ticket} className="size-4 text-white" />}
        >
          Redeem
        </Button>
      </View>
    </View>
  )
}

/**
 * One card the customer bought.
 *
 * The code is shown in full on an unredeemed card and struck out on a used one
 * — a code that has been spent is not a secret worth hiding, and seeing it is
 * how somebody works out which card was which.
 */
function CardRow({ card }: { card: GiftCard }) {
  const toast = useToast()
  const spent = card.status === 'redeemed'

  async function send(): Promise<void> {
    const outcome = await shareText(
      `Here is a ${formatPaise(card.amount)} ${brand.name} gift card: ${card.code}. ` +
        'Enter it under Profile, Gift cards, and it goes onto your balance.',
      `${brand.name} gift card`
    )
    if (outcome === 'copied') {
      toast.show('Gift card copied.', { tone: 'success' })
    } else if (outcome === 'failed') {
      toast.show('We could not share that.', { tone: 'error' })
    }
  }

  const pill = 'min-h-11 flex-row items-center gap-1.5 self-start rounded-pill border border-border px-4 active:border-brand'

  return (
    <View className={cn('rounded-card border border-border p-4', spent && 'bg-surface')}>
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="text-lg font-bold tabular-nums text-ink">{formatPaise(card.amount)}</Text>
          <Text className="mt-0.5 text-xs text-muted">
            {card.recipientName ? `For ${card.recipientName} · ` : ''}
            Bought {formatDateTime(card.purchasedAt)}
          </Text>
        </View>
        {spent ? (
          <Tag>Used</Tag>
        ) : (
          <Tag className="border-success/30 bg-success-soft">
            <Text className="text-xs font-medium text-success">Not used yet</Text>
          </Tag>
        )}
      </View>

      <Text
        className={cn('mt-3 text-base tracking-[1.92px]', spent ? 'text-muted line-through' : 'text-ink')}
        style={{ fontFamily: MONO, fontWeight: '700' }}
      >
        {card.code}
      </Text>

      {card.message ? <Text className="mt-2 text-sm text-muted">“{card.message}”</Text> : null}

      {!spent ? (
        <View className="mt-3 flex-row flex-wrap gap-2">
          <Tappable onPress={() => void send()} className={pill}>
            <Icon as={Gift} className="size-4 text-ink" />
            <Text className="text-sm font-semibold text-ink">Send it on</Text>
          </Tappable>
          <Tappable
            onPress={() =>
              void copyText(card.code).then((outcome) =>
                toast.show(outcome === 'copied' ? `${card.code} copied` : 'We could not copy that.', {
                  tone: outcome === 'copied' ? 'success' : 'error',
                })
              )
            }
            className={pill}
          >
            <Icon as={Copy} className="size-4 text-ink" />
            <Text className="text-sm font-semibold text-ink">Copy code</Text>
          </Tappable>
        </View>
      ) : null}
    </View>
  )
}

// ---------------------------------------------------------------------------

/**
 * Buying one.
 *
 * Four amounts and no free-text field, like the top-up sheet and for the same
 * reason. The name and the note are optional and are for the buyer's benefit:
 * they are printed on the card in their own list so they can tell three cards
 * apart, and they are never checked against anything.
 */
function BuySheet({ open, onClose, onBought }: { open: boolean; onClose: () => void; onBought: () => void }) {
  const [amount, setAmount] = useState<Paise>(GIFT_CARD_AMOUNTS[0] ?? 50_000)
  const [recipientName, setRecipientName] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  async function pay(): Promise<void> {
    if (busy) return
    setBusy(true)
    try {
      const outcome = await buy({
        kind: 'gift_card',
        amount,
        ...(recipientName.trim() ? { recipientName: recipientName.trim() } : {}),
        ...(message.trim() ? { message: message.trim() } : {}),
      })

      if (outcome.kind === 'bought') {
        toast.show(
          outcome.code
            ? `Gift card ${outcome.code} is ready to send.`
            : 'Your gift card is on its way — it will appear here in a moment.',
          { tone: 'success' }
        )
        setRecipientName('')
        setMessage('')
        onBought()
        onClose()
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
    <BottomSheet
      open={open}
      onClose={onClose}
      dismissable={!busy}
      title="Buy a gift card"
      description={`We give you a code to pass on. It never expires, and it can only be spent on ${brand.name} services.`}
      footer={
        <Button fullWidth loading={busy} onPress={() => void pay()}>
          {`Pay ${formatPaise(amount)}`}
        </Button>
      }
    >
      <View className="gap-4 py-4">
        <View className="flex-row flex-wrap justify-between gap-y-3">
          {GIFT_CARD_AMOUNTS.map((option) => {
            const chosen = option === amount
            return (
              <Tappable
                key={option}
                onPress={() => setAmount(option)}
                accessibilityState={{ selected: chosen }}
                className={cn(
                  'h-14 w-[48%] items-center justify-center rounded-card border',
                  chosen ? 'border-brand bg-brand-soft' : 'border-border active:border-brand'
                )}
              >
                <Text className={cn('text-lg font-bold', chosen ? 'text-brand' : 'text-ink')}>
                  {formatPaise(option)}
                </Text>
              </Tappable>
            )
          })}
        </View>

        <Input
          label="Who is it for? (optional)"
          placeholder="Amma"
          value={recipientName}
          onChangeText={setRecipientName}
          maxLength={60}
          hint="Only so you can tell your own cards apart."
        />

        <Textarea
          label="A note (optional)"
          placeholder="Happy birthday — get the fridge looked at."
          value={message}
          onChangeText={setMessage}
          maxLength={200}
          rows={3}
        />
      </View>
    </BottomSheet>
  )
}

function Band() {
  return <View aria-hidden className="-mx-4 my-6 h-2 bg-surface" />
}
