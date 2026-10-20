import { useRef, useState } from 'react'
import { View } from 'react-native'
import { HandCoins, ReceiptIndianRupee } from 'lucide-react-native'
import { formatPaise, type WalletEntry } from '@app/shared'

import { Activity, type FilterId } from '@/screens/profile/wallet/Activity'
import { AddMoneySheet } from '@/screens/profile/wallet/AddMoneySheet'
import { BalanceCard, StatTile } from '@/screens/profile/wallet/BalanceCard'
import { Faq } from '@/screens/profile/wallet/Faq'
import { Band, type ScrollTo } from '@/screens/profile/wallet/WalletFrame'

/**
 * The screen itself, signed in or not.
 *
 * One component for both states rather than two that drift: the only thing
 * the signed-out state adds is a button under the card. Everything else — the
 * blocks, their order, the bands between them — is decided once.
 */
export function CreditsBody({
  balance,
  given,
  used,
  entries,
  signedIn,
  emptyNote,
  action,
  onAdded,
  scrollTo,
}: {
  balance: number
  given: number
  used: number
  entries: readonly WalletEntry[]
  signedIn: boolean
  emptyNote: string
  action?: React.ReactNode
  /** Re-reads the wallet once money has landed. */
  onAdded?: () => void
  scrollTo: ScrollTo
}) {
  // The filter lives up here because two controls set it: the pills above the
  // list, and the two figures above those. A figure that cannot be pressed to
  // see what it is made of is a number with the receipts locked in the
  // next room.
  const [filter, setFilter] = useState<FilterId>('all')
  const [adding, setAdding] = useState(false)
  const activityY = useRef(0)

  function show(next: FilterId): void {
    // Pressing the figure that is already showing puts everything back, so the
    // same tap undoes itself rather than being a dead press.
    setFilter(next === filter ? 'all' : next)
    // The list is a screen further down on a phone, so filtering it without
    // moving there looks like the tap did nothing at all.
    scrollTo(activityY.current)
  }

  return (
    <>
      <View className="mt-5">
        <BalanceCard
          balance={balance}
          signedIn={signedIn}
          {...(signedIn ? { onAdd: () => setAdding(true) } : {})}
        />
        {action}

        <View className="mt-3 flex-row gap-3">
          <StatTile
            icon={HandCoins}
            label="Credited by us"
            value={formatPaise(given)}
            hint="See everything added to your balance"
            selected={filter === 'issued'}
            {...(signedIn ? { onSelect: () => show('issued') } : {})}
          />
          <StatTile
            icon={ReceiptIndianRupee}
            label="Used on bills"
            value={formatPaise(used)}
            hint="See what you spent"
            selected={filter === 'used'}
            {...(signedIn ? { onSelect: () => show('used') } : {})}
          />
        </View>
      </View>

      <Band />
      <View onLayout={(event) => (activityY.current = event.nativeEvent.layout.y)}>
        <Activity entries={entries} filter={filter} onFilter={setFilter} emptyNote={emptyNote} />
      </View>
      <Band />
      <Faq />

      <AddMoneySheet open={adding} onClose={() => setAdding(false)} {...(onAdded ? { onAdded } : {})} />
    </>
  )
}
