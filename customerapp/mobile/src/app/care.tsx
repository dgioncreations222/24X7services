import { useCallback, useRef, useState } from 'react'
import { Linking, ScrollView, View } from 'react-native'
import type { Href } from 'expo-router'
import {
  BadgeCheck,
  Check,
  ChevronRight,
  ClipboardCheck,
  Mail,
  Sparkles,
  Ticket,
  type LucideIcon,
} from 'lucide-react-native'
import {
  MEMBERSHIP_BENEFITS,
  MEMBERSHIP_OPTIONS,
  formatPaise,
  isMembershipActive,
  type CatalogAppliance,
  type CatalogPlan,
  type Membership,
  type MembershipOptionId,
} from '@app/shared'

import { AppShell, Section } from '@/components/AppShell'
import { Header } from '@/components/Header'
import { ErrorState } from '@/components/ErrorState'
import { Skeleton, SkeletonGroup } from '@/components/SkeletonLoader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { Img } from '@/components/ui/Img'
import { Tappable } from '@/components/ui/Tappable'
import { Text } from '@/components/ui/Text'
import { useToast } from '@/components/Toast'
import { useSignInHref } from '@/components/ProfileShell'
import { useAuth } from '@/lib/auth'
import { fetchAppliances } from '@/lib/catalog'
import { fetchCatalogPlans, fetchMembership } from '@/lib/plans'
import { buy } from '@/lib/purchase'
import { useAsync } from '@/lib/useAsync'
import { brand } from '@/config/brand'
import { cn } from '@/lib/cn'

/**
 * Care: everything you can buy here that is not a single repair.
 *
 * The rest of the app sells one visit at a time. What it never had was a
 * shopfront for the two things that cover a year — the annual plans and the
 * membership — and both were filed under Profile, behind an account, where a
 * price list cannot do the one job a price list has. This screen is that
 * shopfront, and it is public: signed out, every number is readable and only
 * the buttons change to a way in.
 *
 * It is laid out the way a marketplace lays out a product page, because that
 * shape is one a customer already knows how to read: what the range is, the
 * things in it priced side by side, what the money actually buys, what is
 * true of every visit underneath it, and a way to talk to somebody about
 * buying at a scale the buttons do not cover.
 *
 * Two rules it does not break. Nothing here is a number the app cannot honour
 * — every benefit listed is one the checkout applies or a person answers the
 * phone about — and no plan carries a rating, because no plan has been rated
 * and a star with an invented figure beside it is the one thing on a page like
 * this that cannot be taken back.
 */

interface CareData {
  plans: CatalogPlan[]
  appliances: CatalogAppliance[]
  membership: Membership | null
}

/**
 * What stands for a plan: the picture of the appliance it covers.
 *
 * Read off the catalog rather than listed here. A second copy of the five
 * paths would carry on pointing at the drawings the day an appliance is given
 * a photograph, and this page would be the one place still showing the old
 * one. The catalog is already fetched for the appliance names.
 */
const ART_FALLBACK = '/banners/shield.svg'

type Anchor = 'plans' | 'plus'

export default function CareScreen() {
  const { user } = useAuth()
  const signIn = useSignInHref('/care')

  // The web's #plans / #plus jumps: where each section starts in the scroll.
  // The refs are read only in press and layout callbacks, never while rendering.
  /* eslint-disable react-hooks/refs */
  const scroller = useRef<ScrollView>(null)
  const anchors = useRef<Record<Anchor, number>>({ plans: 0, plus: 0 })
  const jump = (to: Anchor) => scroller.current?.scrollTo({ y: Math.max(0, anchors.current[to] - 8) })
  const mark = (to: Anchor) => (event: { nativeEvent: { layout: { y: number } } }) => {
    anchors.current[to] = event.nativeEvent.layout.y
  }
  /* eslint-enable react-hooks/refs */

  const load = useCallback(async (): Promise<CareData> => {
    const [plans, appliances, membership] = await Promise.all([
      fetchCatalogPlans(),
      fetchAppliances(),
      // Nobody signed in is not an error and not a membership — it is simply
      // nothing to fetch.
      user ? fetchMembership(user.uid) : Promise.resolve(null),
    ])
    return { plans, appliances, membership }
  }, [user])

  const data = useAsync(load)
  const plans = data.data?.plans ?? []
  const appliances = data.data?.appliances ?? []
  const names = new Map(appliances.map((each) => [each.id, each.name]))
  const art = new Map(appliances.map((each) => [each.id, each.image]))
  const member = isMembershipActive(data.data?.membership ?? null)

  // The largest saving anybody can check on this page, in rupees. It is a
  // subtraction over the prices printed below it, so it cannot drift from
  // them the way a hand-written "save up to" eventually does.
  const bestSaving = plans.reduce(
    (most, plan) => Math.max(most, plan.compareAt ? plan.compareAt - plan.price : 0),
    0
  )

  return (
    <AppShell scroll={false} mobileHeader={<Header title="Care" showBack backFallback="/home" />}>
      <ScrollView ref={scroller} className="flex-1" contentContainerClassName="px-4 pb-10">
        {/* ---------------------------------------------------------------
            What the range is
            --------------------------------------------------------------- */}
        <View className="mt-6">
          <Text accessibilityRole="header" className="text-2xl font-bold text-ink">
            {`Care from ${brand.name}`}
          </Text>
          <Text className="mt-1.5 text-base leading-[26px] text-muted">
            Cover for the appliances you already own. Bought once, used all year.
          </Text>

          <View className="mt-5 flex-row gap-3">
            <RangeTile
              onPress={() => jump('plans')}
              label="Annual plans"
              note="From one appliance up"
              badge="No visit fee"
              art={art.get('washing-machine') ?? ART_FALLBACK}
            />
            <RangeTile
              onPress={() => jump('plus')}
              label={`${brand.name} Plus`}
              note="Every booking, all year"
              art="/banners/shield.svg"
            />
          </View>
        </View>

        {/* ---------------------------------------------------------------
            The plans, priced side by side
            --------------------------------------------------------------- */}
        <View onLayout={mark('plans')}>
          <Section
            className="mt-8"
            title="Annual plans"
            subtitle="A set number of services on the appliances a plan names, for a year, with nothing to pay for the visit."
          >
            {data.status === 'loading' ? (
              <SkeletonGroup label="Loading plans" className="flex-row flex-wrap justify-between gap-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-64 w-[48%]" />
                ))}
              </SkeletonGroup>
            ) : data.status === 'error' ? (
              <ErrorState
                className="py-10"
                description="We could not load the plans on offer. Please try again."
                onRetry={data.reload}
                retrying={data.refreshing}
              />
            ) : plans.length === 0 ? (
              <Text className="py-10 text-center text-sm text-muted">No plans are on offer right now.</Text>
            ) : (
              <>
                <View className="flex-row flex-wrap justify-between gap-y-6">
                  {plans.map((plan) => (
                    <View key={plan.id} className="w-[48%]">
                      <PlanTile
                        plan={plan}
                        names={names}
                        art={art}
                        {...(user ? {} : { signInHref: signIn })}
                        onBought={data.reload}
                      />
                    </View>
                  ))}
                </View>

                {/* The tile is a price and a promise in four lines. What each
                    plan covers visit by visit is a longer read, and it already
                    has a screen. */}
                <Tappable
                  href="/profile/plans"
                  className="mt-6 min-h-11 flex-row items-center gap-3 border-t border-border pt-4"
                >
                  <Icon as={ClipboardCheck} className="size-5 text-brand" />
                  <Text className="flex-1 text-sm font-semibold text-ink">See every plan in full</Text>
                  <Icon as={ChevronRight} className="size-4 text-muted" />
                </Tappable>
              </>
            )}
          </Section>
        </View>

        <Band />

        {/* ---------------------------------------------------------------
            The membership
            --------------------------------------------------------------- */}
        <View onLayout={mark('plus')}>
          <Section
            className="mt-0"
            title={`${brand.name} Plus`}
            subtitle="Not visits of its own — it changes the price of everything else for as long as it runs."
          >
            <PlusBlock member={member} {...(user ? {} : { signInHref: signIn })} onBought={data.reload} />
          </Section>
        </View>

        <Band />

        {/* ---------------------------------------------------------------
            Why buy it here rather than ring somebody
            --------------------------------------------------------------- */}
        <Section className="mt-0" title="Only in the app" subtitle="Two things a phone call cannot give you.">
          <View className="flex-row gap-3">
            <OfferCard
              icon={Ticket}
              title={bestSaving > 0 ? `Save up to ${formatPaise(bestSaving)}` : 'Priced against the visits'}
              detail="Against booking the same visits one by one — the subtraction is printed on every plan above."
            />
            <OfferCard
              icon={BadgeCheck}
              title="No auto-renewal"
              detail="Nothing sits on your card. When the visits or the year run out, the plan ends and you decide again."
            />
          </View>
        </Section>

        {/* ---------------------------------------------------------------
            What is true of every visit, plan or no plan
            --------------------------------------------------------------- */}
        <Section
          title="What every visit carries"
          subtitle="A plan changes what a visit costs. It does not change how one is done."
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="-mx-4"
            contentContainerClassName="gap-3 px-4"
            snapToInterval={236}
            decelerationRate="fast"
          >
            {VISIT_POINTS.map((point) => (
              <Card key={point.key} className="w-56 overflow-hidden">
                <View className="p-4">
                  <Text accessibilityRole="header" className="text-base font-bold text-ink">
                    {point.title}
                  </Text>
                  <Text className="mt-1 text-sm leading-[22px] text-muted">{point.detail}</Text>
                </View>
                <View className={cn('relative mt-auto bg-surface', point.photo ? 'h-32' : 'h-24')}>
                  {point.photo ? (
                    <Img src={point.art} alt="" className="absolute inset-0" />
                  ) : (
                    <Img src={point.art} alt="" contentFit="contain" className="absolute inset-4" />
                  )}
                </View>
              </Card>
            ))}
          </ScrollView>
        </Section>

        <Band />

        {/* ---------------------------------------------------------------
            Buying at a scale the buttons do not cover
            --------------------------------------------------------------- */}
        <Section className="mt-0" title="For societies and offices">
          <Text className="text-base leading-[26px] text-muted">
            Covering a whole building, or a floor of appliances rather than one kitchen? Write to us
            and we will price it against what is actually installed.
          </Text>
          <Tappable
            accessibilityRole="link"
            onPress={() => void Linking.openURL(`mailto:${brand.supportEmail}`)}
            className="mt-3 min-h-11 flex-row items-center gap-2 self-start"
          >
            <Icon as={Mail} className="size-4 text-brand" />
            <Text className="shrink text-base font-semibold text-brand">{brand.supportEmail}</Text>
          </Tappable>
        </Section>

        {/* ---------------------------------------------------------------
            What the whole page amounts to
            --------------------------------------------------------------- */}
        <View className="-mx-4 -mb-10 mt-8 bg-ink px-4 pb-20 pt-10">
          <Text accessibilityRole="header" className="text-2xl font-bold text-bg">
            Cover you can count.
          </Text>
          <View className="mt-4 gap-4">
            <Text className="text-base leading-[26px] text-bg/70">
              An annual plan here is a fixed number of services on an appliance you name, for a
              year, at a price you pay once. Not a warranty, not a discount on parts, and not a
              contract that quietly becomes next year’s.
            </Text>
            <Text className="text-base leading-[26px] text-bg/70">
              When the visits are gone or the year ends, it ends. There is no mandate on your card
              and no renewal you have to remember to stop. If it was worth having, you buy it again.
            </Text>
            <Text className="text-base leading-[26px] text-bg/70">
              Everything else works the way it always does: the fault is named before it is fixed,
              the repair is quoted before it is started, and nothing beyond the visit begins until
              you have said yes.
            </Text>
          </View>

          {/* The range it all applies to, as the things themselves. Each on a
              light plate: the drawings are coloured line art on a pale disc and
              would sit on this black looking like a mistake rather than a set. */}
          <View className="mt-8 flex-row items-center justify-between gap-2">
            {appliances.map((appliance) => (
              <View key={appliance.id} className="relative size-12 overflow-hidden rounded-card bg-plate">
                <Img src={appliance.image} alt="" contentFit="contain" className="absolute inset-1.5" />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </AppShell>
  )
}

// ---------------------------------------------------------------------------
// The range, at the top
// ---------------------------------------------------------------------------

/**
 * One of the two things on sale here, as a tile that jumps to it.
 *
 * A jump rather than a route. Both sections are on this screen and both are a
 * thumb-flick away; sending somebody to another page to read two paragraphs
 * costs them their place for nothing.
 */
function RangeTile({
  onPress,
  label,
  note,
  badge,
  art,
}: {
  onPress: () => void
  label: string
  note: string
  badge?: string
  art: string
}) {
  return (
    <Tappable
      onPress={onPress}
      className="flex-1 overflow-hidden rounded-card bg-surface p-3 active:bg-border active:opacity-100"
    >
      <View className="relative h-24">
        <Img src={art} alt="" contentFit="contain" className="absolute inset-2" />
        {badge ? (
          <View className="absolute left-0 top-0 flex-row items-center gap-1 rounded-card bg-success px-2 py-1">
            <Icon as={Sparkles} className="size-3 text-white" />
            <Text className="text-[11px] leading-[12px] font-bold text-white">{badge}</Text>
          </View>
        ) : null}
      </View>
      <Text className="mt-2 text-base font-bold text-ink">{label}</Text>
      <Text className="mt-0.5 text-xs text-muted">{note}</Text>
    </Tappable>
  )
}

// ---------------------------------------------------------------------------
// A plan, as a tile
// ---------------------------------------------------------------------------

/**
 * One plan in the grid: what it covers, what it costs, and the button.
 *
 * Two lines carry the whole shape of the product before the price — the visit
 * count and the length — because a plan bought without understanding the count
 * is a refund request in about six weeks. The price says "starts at" only when
 * it is honest to: what a plan costs here is what it costs.
 */
function PlanTile({
  plan,
  names,
  art,
  signInHref,
  onBought,
}: {
  plan: CatalogPlan
  names: Map<string, string>
  /** Appliance id to its picture, from the catalog. */
  art: Map<string, string>
  /** Set when nobody is signed in — the button becomes the way in. */
  signInHref?: Href
  onBought: () => void
}) {
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  const saving = plan.compareAt && plan.compareAt > plan.price ? plan.compareAt - plan.price : 0
  const months = Math.round(plan.durationDays / 30)
  const picture = art.get(plan.applianceIds[0] ?? '') ?? ART_FALLBACK
  const covers = plan.applianceIds.map((id) => names.get(id) ?? id).join(', ')

  async function pay(): Promise<void> {
    if (busy) return
    setBusy(true)
    try {
      const outcome = await buy({ kind: 'plan', planId: plan.id })
      if (outcome.kind === 'bought') {
        toast.show(`${plan.name} is running. It covers your next visit.`, { tone: 'success' })
        onBought()
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

  const buttonBox =
    'shrink-0 items-center rounded-card border border-brand px-3 py-1.5 active:bg-brand-soft active:opacity-100'

  return (
    <View className="flex-1">
      <View className="relative aspect-square overflow-hidden rounded-card bg-plate">
        <Img src={picture} alt="" contentFit="contain" className="absolute inset-6" />
        {saving > 0 ? (
          <View className="absolute left-0 top-0 rounded-card bg-success px-2 py-1">
            <Text className="text-[11px] leading-[12px] font-bold text-white">{formatPaise(saving)} off</Text>
          </View>
        ) : null}
      </View>

      <Text accessibilityRole="header" className="mt-3 text-base font-bold text-ink">
        {plan.name}
      </Text>
      <Text numberOfLines={2} className="mt-0.5 text-xs text-muted">
        {covers}
      </Text>

      <View className="mt-auto flex-row items-end justify-between gap-2 pt-3">
        <View className="min-w-0 shrink">
          <Text className="text-xs text-muted">Pay once</Text>
          <Text className="text-base font-bold tabular-nums text-ink">{formatPaise(plan.price)}</Text>
          {saving > 0 ? (
            <Text className="text-xs text-muted line-through tabular-nums">
              {formatPaise(plan.compareAt ?? 0)}
            </Text>
          ) : null}
        </View>

        {signInHref ? (
          <Tappable href={signInHref} className={buttonBox}>
            <Text className="text-sm font-bold text-brand">Buy</Text>
            <Text className="text-[11px] leading-[14px] font-medium text-muted">
              {plan.visitsIncluded} visits
            </Text>
          </Tappable>
        ) : (
          <Tappable
            onPress={() => void pay()}
            disabled={busy}
            className={cn(buttonBox, busy && 'opacity-60')}
          >
            <Text className="text-sm font-bold text-brand">{busy ? 'Opening' : 'Buy'}</Text>
            <Text className="text-[11px] leading-[14px] font-medium text-muted">
              {plan.visitsIncluded} visits · {months} mo
            </Text>
          </Tappable>
        )}
      </View>
    </View>
  )
}

// ---------------------------------------------------------------------------
// The membership
// ---------------------------------------------------------------------------

/**
 * What Plus gives, and the two lengths it is sold in.
 *
 * Somebody already on it is told so and sold nothing — a shopfront that keeps
 * pitching a thing you have bought is a shopfront that has not been read.
 */
function PlusBlock({
  member,
  signInHref,
  onBought,
}: {
  member: boolean
  signInHref?: Href
  onBought: () => void
}) {
  const [chosen, setChosen] = useState<MembershipOptionId>('plus-yearly')
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  const option = MEMBERSHIP_OPTIONS.find((each) => each.id === chosen) ?? MEMBERSHIP_OPTIONS[0]
  const compareAt = 'compareAt' in option ? option.compareAt : undefined
  const saving = compareAt && compareAt > option.price ? compareAt - option.price : 0

  async function pay(): Promise<void> {
    if (busy) return
    setBusy(true)
    try {
      const outcome = await buy({ kind: 'membership', optionId: chosen })
      if (outcome.kind === 'bought') {
        toast.show('Plus is running. The visit fee is off your next booking.', { tone: 'success' })
        onBought()
      }
    } catch {
      toast.show('We could not complete that. If money has left your account, contact support.', {
        tone: 'error',
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="overflow-hidden">
      <View className="gap-2.5 p-4">
        {MEMBERSHIP_BENEFITS.map((benefit) => (
          <View key={benefit} className="flex-row items-start gap-2">
            <Icon as={Check} className="mt-0.5 size-4 text-success" />
            <Text className="min-w-0 flex-1 text-sm text-ink">{benefit}</Text>
          </View>
        ))}
      </View>

      {member ? (
        <View className="flex-row items-center gap-2 border-t border-border bg-success-soft px-4 py-3">
          <Icon as={BadgeCheck} className="size-4 text-success" />
          <Text className="min-w-0 flex-1 text-sm font-semibold text-success">
            You are on Plus. It is already coming off your bookings.
          </Text>
        </View>
      ) : (
        <View className="border-t border-border p-4">
          <View className="flex-row gap-2">
            {MEMBERSHIP_OPTIONS.map((each) => {
              const on = each.id === chosen
              return (
                <Tappable
                  key={each.id}
                  accessibilityState={{ selected: on }}
                  onPress={() => setChosen(each.id)}
                  className={cn(
                    'min-h-11 flex-1 items-center justify-center rounded-card border px-3 py-1.5 active:opacity-100',
                    on ? 'border-brand bg-brand-soft' : 'border-border active:border-brand'
                  )}
                >
                  <Text className={cn('text-sm font-semibold', on ? 'text-brand' : 'text-ink')}>{each.label}</Text>
                  <Text className="text-xs font-medium tabular-nums text-muted">{formatPaise(each.price)}</Text>
                </Tappable>
              )
            })}
          </View>

          {saving > 0 ? (
            <View className="mt-3 flex-row items-center gap-1.5 rounded-card bg-success-soft px-3 py-2">
              <Icon as={Ticket} className="size-3.5 text-success" />
              <Text className="min-w-0 flex-1 text-xs font-semibold text-success">
                Saves {formatPaise(saving)} against twelve months bought one at a time
              </Text>
            </View>
          ) : null}

          {signInHref ? (
            <Button className="mt-4" fullWidth href={signInHref}>
              Sign in to buy
            </Button>
          ) : (
            <Button className="mt-4" fullWidth loading={busy} onPress={() => void pay()}>
              {`Buy Plus for ${formatPaise(option.price)}`}
            </Button>
          )}

          <Text className="mt-3 text-xs text-muted">It does not renew itself. When it runs out, it stops.</Text>
        </View>
      )}
    </Card>
  )
}

// ---------------------------------------------------------------------------
// The smaller blocks
// ---------------------------------------------------------------------------

function OfferCard({ icon, title, detail }: { icon: LucideIcon; title: string; detail: string }) {
  return (
    <View className="flex-1 rounded-card bg-surface p-4">
      <Icon as={icon} className="size-5 text-brand" />
      <Text accessibilityRole="header" className="mt-3 text-base font-bold text-ink">
        {title}
      </Text>
      <Text className="mt-1 text-sm leading-[22px] text-muted">{detail}</Text>
    </View>
  )
}

/**
 * The three things a plan does not change.
 *
 * Every line is elsewhere in the app as a screen or a step, not a claim made
 * for this page: the quote before the work, the warranty, the invoice.
 */
const VISIT_POINTS: readonly {
  key: string
  title: string
  detail: string
  art: string
  /**
   * Whether `art` is a photograph.
   *
   * A photograph fills the strip; a drawing is a symbol on a plate and needs
   * the room around it. The two cannot share one set of classes without one
   * of them looking like a mistake.
   */
  photo?: boolean
}[] = [
  {
    key: 'quote',
    title: 'Quoted before it is started',
    detail:
      'The fault is named, the repair is priced in writing, and nothing begins until you approve it.',
    art: '/photos/ac-technician.jpg',
    photo: true,
  },
  {
    key: 'warranty',
    title: 'Covered after we leave',
    detail:
      'Every repair carries a service warranty, with what it covers and until when kept on the booking.',
    art: '/photos/laundry-room.jpg',
    photo: true,
  },
  {
    key: 'support',
    title: 'Somebody to ask',
    detail:
      'Support is in the app at any hour, against the booking rather than a reference number you have to find.',
    art: '/banners/chat.svg',
  },
]

/** The grey rule the rest of the app uses between unrelated blocks. */
function Band() {
  return <View aria-hidden className="-mx-4 my-8 h-2 bg-surface" />
}
