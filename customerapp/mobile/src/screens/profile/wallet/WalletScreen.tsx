import { useCallback } from 'react'
import { View } from 'react-native'
import { isCreditEntry, type Wallet as WalletDoc, type WalletEntry } from '@app/shared'

import { ErrorState } from '@/components/ui/States'
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { Tappable } from '@/components/ui/Tappable'
import { Text } from '@/components/ui/Text'
import { useAuth } from '@/lib/auth'
import { fetchLedger, fetchWallet } from '@/lib/wallet'
import { useAsync } from '@/lib/useAsync'
import { CreditsBody } from '@/screens/profile/wallet/CreditsBody'
import { SIGN_IN, WalletFrame, type ScrollTo } from '@/screens/profile/wallet/WalletFrame'

/**
 * The customer's balance with us, and the reason for every paisa of it.
 *
 * Laid out the way every wallet screen on a phone here is laid out, because
 * that shape is now what people expect and fighting it wins nothing: a
 * coloured balance card at the top, two figures under it, the statement, and
 * the questions. What is deliberately missing from that shape is Add money.
 *
 * Two kinds of money are on it, and the screen never pretends they are one.
 * Credits, which we issued because we owed them; and the customer's own money,
 * added through Add money. They share a balance because they buy the same
 * thing, and the statement says which is which on every line.
 *
 * Add money is the reason the limits in the schema matter — see the note at
 * the top of `shared/wallet.ts`. The balance is closed-loop: it buys our
 * services, it cannot be transferred or withdrawn, and it is refundable on
 * request. Nothing on this screen may quietly stop any of those being true.
 *
 * The balance and the statement are fetched together. They are two reads of
 * the same fact, and a screen that showed one without the other would be a
 * screen showing a number with no reason behind it.
 *
 * It is the one screen under /profile that does not bounce a signed-out
 * visitor to the login form. The way in is a tile on Home, and Home is open to
 * anyone — so signed out, the balance is replaced by a way in and the
 * questions below it are shown in full: they are the part someone who has not
 * signed in actually came to read.
 *
 * The screen owns its ScrollView (rather than leaving it to Screen) so the two
 * figures can bring the statement into view when pressed.
 */

interface CreditsData {
  wallet: WalletDoc
  entries: WalletEntry[]
}

export function WalletScreen() {
  const { user, ready } = useAuth()

  return (
    <WalletFrame>
      {(scrollTo) =>
        !ready ? (
          <CreditsSkeleton />
        ) : user ? (
          <Credits uid={user.uid} scrollTo={scrollTo} />
        ) : (
          <SignedOut scrollTo={scrollTo} />
        )
      }
    </WalletFrame>
  )
}

/**
 * What someone who has not signed in sees: the whole screen, with zero
 * wherever a figure would be and the one button that fills them in. Zero is the
 * truthful number for an account nobody has named yet, and the button above
 * says whose zero it is not.
 */
function SignedOut({ scrollTo }: { scrollTo: ScrollTo }) {
  return (
    <CreditsBody
      balance={0}
      given={0}
      used={0}
      entries={[]}
      emptyNote="Sign in and everything on your balance shows up here."
      signedIn={false}
      scrollTo={scrollTo}
      action={
        <Tappable
          href={SIGN_IN}
          className="mt-3 h-12 w-full items-center justify-center rounded-pill bg-brand active:bg-brand-deep active:opacity-100"
        >
          <Text className="text-base font-semibold text-white">Sign in to see your balance</Text>
        </Tappable>
      }
    />
  )
}

function CreditsSkeleton() {
  return (
    <SkeletonGroup label="Loading your balance" className="mt-5 gap-4">
      <Skeleton className="h-48" />
      <View className="flex-row gap-3">
        <Skeleton className="h-24 flex-1" />
        <Skeleton className="h-24 flex-1" />
      </View>
      <Skeleton className="h-32" />
    </SkeletonGroup>
  )
}

function Credits({ uid, scrollTo }: { uid: string; scrollTo: ScrollTo }) {
  const load = useCallback(async (): Promise<CreditsData> => {
    const [wallet, entries] = await Promise.all([fetchWallet(uid), fetchLedger(uid)])
    return { wallet, entries }
  }, [uid])

  const credits = useAsync(load)

  if (credits.status === 'loading') return <CreditsSkeleton />

  if (credits.status === 'error' || !credits.data) {
    return <ErrorState onRetry={credits.reload} retrying={credits.refreshing} />
  }

  const { wallet, entries } = credits.data
  const used = entries
    .filter((entry) => !isCreditEntry(entry.kind))
    .reduce((total, entry) => total + entry.amount, 0)

  return (
    <CreditsBody
      balance={wallet.balance}
      given={wallet.lifetimeIssued}
      used={used}
      entries={entries}
      signedIn
      emptyNote="Nothing yet. Add money, or wait for us to owe you something."
      onAdded={credits.reload}
      scrollTo={scrollTo}
    />
  )
}
