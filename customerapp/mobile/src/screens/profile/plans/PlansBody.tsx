import { useCallback, useState } from 'react'
import { View } from 'react-native'
import { ClipboardList } from 'lucide-react-native'
import { isPlanActive, type CatalogPlan, type UserPlan } from '@app/shared'

import { SignInPrompt, useSignInHref } from '@/components/ProfileShell'
import { PlanCard, PlanOfferCard } from '@/components/PlanCard'
import { EmptyState , ErrorState } from '@/components/ui/States'

import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { useToast } from '@/components/Toast'
import { Text } from '@/components/ui/Text'
import { fetchAppliances } from '@/lib/catalog'
import { fetchCatalogPlans, fetchMyPlans } from '@/lib/plans'
import { buy } from '@/lib/purchase'
import { useAsync } from '@/lib/useAsync'

/** The offer list on its own, for someone who has not signed in. */
export function PlansOnOffer() {
  const load = useCallback(async () => {
    const [offered, appliances] = await Promise.all([fetchCatalogPlans(), fetchAppliances()])
    return { offered, appliances }
  }, [])

  const data = useAsync(load)

  return (
    <>
      <SignInPrompt
        className="py-10"
        icon={ClipboardList}
        title="Plans you hold"
        description="A plan covers a set number of services on your appliances for a year. Log in to see the ones you are on."
      />

      <Band />

      <Offers
        offered={data.data?.offered ?? []}
        names={nameMap(data.data?.appliances)}
        loading={data.status === 'loading'}
        failed={data.status === 'error'}
        onRetry={data.reload}
      />
    </>
  )
}

export function Plans({ uid }: { uid: string }) {
  const load = useCallback(async () => {
    const [mine, offered, appliances] = await Promise.all([
      fetchMyPlans(uid),
      fetchCatalogPlans(),
      fetchAppliances(),
    ])
    return { mine, offered, appliances }
  }, [uid])

  const data = useAsync(load)

  if (data.status === 'loading') {
    return (
      <SkeletonGroup label="Loading your plans" className="mt-6 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </SkeletonGroup>
    )
  }

  if (data.status === 'error' || !data.data) {
    return <ErrorState className="py-16" onRetry={data.reload} retrying={data.refreshing} />
  }

  return <PlansView {...data.data} onReload={data.reload} />
}

/** The signed-in screen, once its three reads are in. */
export function PlansView({
  mine,
  offered,
  appliances,
  onReload,
}: {
  mine: readonly UserPlan[]
  offered: readonly CatalogPlan[]
  appliances: readonly { id: string; name: string }[]
  onReload: () => void
}) {
  const names = nameMap(appliances)
  const live = mine.filter((plan) => isPlanActive(plan))
  const done = mine.filter((plan) => !isPlanActive(plan))

  return (
    <>
      <Text accessibilityRole="header" className="mt-6 text-2xl font-bold leading-tight text-ink">
        Your plans
      </Text>

      {live.length > 0 ? (
        <Held title="Running now" plans={live} names={names} />
      ) : mine.length === 0 ? (
        <EmptyState
          className="py-12"
          icon={ClipboardList}
          title="No plans yet"
          description="A plan covers a set number of services on one appliance for a year, with nothing to pay for the visit. Pick one below."
        />
      ) : null}

      {done.length > 0 ? <Held title="Finished" plans={done} names={names} className="mt-7" /> : null}

      <Band />

      <Offers offered={offered} names={names} onBought={onReload} />
    </>
  )
}

function Held({
  title,
  plans,
  names,
  className,
}: {
  title: string
  plans: readonly UserPlan[]
  names: Map<string, string>
  className?: string
}) {
  return (
    <View className={className ?? 'mt-5'}>
      <Text accessibilityRole="header" className="mb-2 text-sm font-semibold text-muted">
        {title}
      </Text>
      <View className="gap-3">
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} applianceNames={names} />
        ))}
      </View>
    </View>
  )
}

/**
 * Everything on offer.
 *
 * One component for both states. Signed out there is nothing to buy with, so
 * each card's button becomes the way in rather than disappearing — a price
 * list that hides its own buttons until you sign in is a price list you cannot
 * tell is a shop.
 *
 * The plan with the largest checkable saving leads. Not one somebody picked as
 * "recommended": the ribbon goes on whichever the subtraction says it is, so
 * it cannot drift from the prices printed under it.
 */
function Offers({
  offered,
  names,
  loading = false,
  failed = false,
  onRetry,
  onBought,
}: {
  offered: readonly CatalogPlan[]
  names: Map<string, string>
  loading?: boolean
  /** A read that failed is not an empty shop, and must not read like one. */
  failed?: boolean
  onRetry?: () => void
  /** Absent when nobody is signed in — see above. */
  onBought?: () => void
}) {
  const best = bestValue(offered)

  return (
    <View className="pb-6">
      <Text accessibilityRole="header" className="text-xl font-bold text-ink">
        Plans you can buy
      </Text>
      <Text className="mt-1 text-sm text-muted">
        Each one covers the visit fee on the appliances it names, for a year. Repairs are quoted as usual and
        you approve them before any work starts.
      </Text>

      {loading ? (
        <SkeletonGroup label="Loading plans" className="mt-4 gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-72" />
          ))}
        </SkeletonGroup>
      ) : failed ? (
        <ErrorState
          className="py-10"
          description="We could not load the plans on offer. Please try again."
          {...(onRetry ? { onRetry } : {})}
        />
      ) : offered.length === 0 ? (
        <Text className="py-10 text-center text-sm text-muted">No plans are on offer right now.</Text>
      ) : (
        <View className="mt-4 gap-3">
          {offered.map((plan) => (
            <Offer key={plan.id} plan={plan} names={names} highlight={plan.id === best} onBought={onBought} />
          ))}
        </View>
      )}
    </View>
  )
}

/** The id of the plan that saves the most, or null when none says. */
function bestValue(plans: readonly CatalogPlan[]): string | null {
  let best: { id: string; saving: number } | null = null
  for (const plan of plans) {
    const saving = plan.compareAt ? plan.compareAt - plan.price : 0
    if (saving > 0 && (!best || saving > best.saving)) {
      best = { id: plan.id, saving }
    }
  }
  return best?.id ?? null
}

/** One offer card, and the payment it opens. */
function Offer({
  plan,
  names,
  highlight,
  onBought,
}: {
  plan: CatalogPlan
  names: Map<string, string>
  highlight: boolean
  onBought?: (() => void) | undefined
}) {
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  const signIn = useSignInHref()

  async function pay(): Promise<void> {
    if (busy) return
    setBusy(true)
    try {
      const outcome = await buy({ kind: 'plan', planId: plan.id })
      if (outcome.kind === 'bought') {
        toast.show(`${plan.name} is running. It covers your next visit.`, { tone: 'success' })
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
    <PlanOfferCard
      plan={plan}
      applianceNames={names}
      highlight={highlight}
      busy={busy}
      {...(onBought ? { onBuy: () => void pay() } : { signInHref: signIn })}
    />
  )
}

function nameMap(appliances: readonly { id: string; name: string }[] | undefined): Map<string, string> {
  return new Map((appliances ?? []).map((each) => [each.id, each.name]))
}

function Band() {
  return <View aria-hidden className="-mx-4 my-6 h-2 bg-surface" />
}
