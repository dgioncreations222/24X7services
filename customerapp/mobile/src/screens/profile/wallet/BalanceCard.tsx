import { View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Plus, WalletMinimal, type LucideIcon } from 'lucide-react-native'
import { formatPaise } from '@app/shared'

import { Icon, useColor } from '@/components/ui/Icon'
import { Tappable } from '@/components/ui/Tappable'
import { Text } from '@/components/ui/Text'
import { cn } from '@/lib/cn'
import { brand } from '@/config/brand'
import { SIGN_IN } from '@/screens/profile/wallet/WalletFrame'

/**
 * The speckle on the balance card: a grid of dots fading out from a point
 * near the top right — the web's repeating radial gradient under a radial
 * mask, drawn as views since RN has neither.
 */
const SPECKLE_COUNT = 16
const SPECKLE_STEP = 14
function Speckle() {
  const size = SPECKLE_COUNT * SPECKLE_STEP
  const cx = size * 0.7
  const cy = size * 0.3
  const reach = size * 0.7
  const dots: React.ReactNode[] = []
  for (let row = 0; row < SPECKLE_COUNT; row++) {
    for (let col = 0; col < SPECKLE_COUNT; col++) {
      const x = col * SPECKLE_STEP + SPECKLE_STEP / 2
      const y = row * SPECKLE_STEP + SPECKLE_STEP / 2
      const fade = 1 - Math.hypot(x - cx, y - cy) / reach
      if (fade <= 0) continue
      dots.push(
        <View
          key={`${row}-${col}`}
          className="absolute size-[3px] rounded-full bg-bg"
          style={{ left: x - 1.5, top: y - 1.5, opacity: fade }}
        />
      )
    }
  }
  return (
    <View
      aria-hidden
      pointerEvents="none"
      className="absolute -right-10 -top-10 opacity-25"
      style={{ width: size, height: size }}
    >
      {dots}
    </View>
  )
}

/**
 * The balance, as the one thing on the screen allowed to be large. Brand
 * colours rather than a decorative palette of its own — this is the app
 * talking about the customer's money.
 */
export function BalanceCard({
  balance,
  signedIn,
  onAdd,
}: {
  balance: number
  signedIn: boolean
  /** Absent when nobody is signed in — there is no account to add to. */
  onAdd?: () => void
}) {
  const deep = useColor('text-brand-deep')
  const blue = useColor('text-brand')

  return (
    <View className="overflow-hidden rounded-card">
      <LinearGradient colors={[deep, blue]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 20 }}>
        <Speckle />

        <View className="flex-row items-center gap-2">
          <Icon as={WalletMinimal} className="size-5 text-white" />
          <Text className="text-sm font-semibold uppercase tracking-[0.84px] text-white">{`${brand.name} Credits`}</Text>
        </View>

        <Text className="mt-10 text-xs font-semibold uppercase tracking-[0.96px] text-white/70">Balance</Text>
        <View className="mt-0.5 flex-row items-end justify-between gap-4">
          <Text className="shrink text-3xl font-bold text-white">{formatPaise(balance)}</Text>

          {onAdd ? (
            <Tappable
              onPress={onAdd}
              className="h-11 shrink-0 flex-row items-center gap-1.5 rounded-pill bg-white px-4 active:opacity-90"
            >
              <Icon as={Plus} className="size-4 text-royal" />
              <Text className="text-sm font-semibold text-royal">Add money</Text>
            </Tappable>
          ) : null}
        </View>

        <Text className="mt-3 max-w-[352px] text-sm text-white/80">
          {!signedIn
            ? 'Your balance is tied to your number. Sign in to see it.'
            : balance > 0
              ? 'We take this off your next bill. Nothing to redeem.'
              : 'Add money, or wait for us to credit you. Either way it comes off your next bill.'}
        </Text>
      </LinearGradient>
    </View>
  )
}

/**
 * One of the two figures under the balance.
 *
 * It is a button wherever there is a statement to show: pressing it filters
 * the list below to the lines that add up to it. Signed out there is no
 * statement and no account, so it becomes the same link as the button above
 * it rather than a control that looks live and is not.
 */
export function StatTile({
  icon,
  label,
  value,
  hint,
  selected,
  onSelect,
}: {
  icon: LucideIcon
  label: string
  value: string
  /** Read out in place of the bare label, so the press is not a surprise. */
  hint: string
  selected: boolean
  /** Absent when there is nothing to filter — see above. */
  onSelect?: () => void
}) {
  const body = (
    <>
      <Icon as={icon} className={cn('size-5', selected ? 'text-brand' : 'text-muted')} />
      <Text className="mt-3 text-sm text-muted">{label}</Text>
      <Text className="mt-0.5 text-lg font-bold tabular-nums text-ink">{value}</Text>
    </>
  )

  const base = 'min-w-0 flex-1 rounded-card border p-4'

  if (!onSelect) {
    return (
      <Tappable href={SIGN_IN} accessibilityLabel={hint} className={cn(base, 'border-border')}>
        {body}
      </Tappable>
    )
  }

  return (
    <Tappable
      onPress={onSelect}
      accessibilityState={{ selected }}
      accessibilityLabel={`${label}. ${hint}`}
      className={cn(base, selected ? 'border-brand bg-brand-soft' : 'border-border active:border-brand')}
    >
      {body}
    </Tappable>
  )
}
