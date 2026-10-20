/* eslint-disable react-hooks/refs -- the refs are read in layout callbacks, not during render; this screen is replaced by the generic category page (PR-6) */
import { useCallback, useRef, useState } from 'react'
import { ScrollView, View, type LayoutChangeEvent } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Linking from 'expo-linking'
import { router, useLocalSearchParams, type Href } from 'expo-router'
import { Check, ChevronRight, Search, Share2, ShieldCheck, Star } from 'lucide-react-native'
import {
  applianceIdSchema,
  type ApplianceId,
  type BusinessConfig,
  type CatalogAppliance,
  type CatalogBrand,
  type CatalogPlan,
  type CatalogIssue,
  type CatalogService,
  type ServiceKey,
  type ServiceReview,
} from '@app/shared'

import { AppShell, Section } from '@/components/AppShell'
import { Header } from '@/components/Screen'
import { ServiceRow } from '@/components/ServiceRow'
import { SectionMenu } from '@/components/SectionMenu'
import { ShareSheet } from '@/components/ShareSheet'
import { typeLabel, typePhoto } from '@/lib/applianceTypes'
import { ReviewsSheet } from '@/components/ReviewsSheet'
import { OfferBanner } from '@/components/OfferBanner'
import { AddButton, durationNote } from '@/components/ServiceRail'
import { ServiceReviews } from '@/components/ServiceReviews'
import { WriteReviewButton } from '@/components/WriteReviewButton'
import { ServiceSheet, serviceOptions } from '@/components/ServiceSheet'
import { CartBar } from '@/components/CartBar'
import { BrandDisclaimer } from '@/components/BrandCard'
import { HowItWorks, HOW_IT_WORKS_SUBTITLE } from '@/components/HowItWorks'
import { TrustPoints } from '@/components/TrustPoints'
import { usePrefersReducedMotion } from '@/components/ServiceClip'
import { Chip, Tag } from '@/components/ui/Chip'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { Img } from '@/components/ui/Img'
import { Tappable } from '@/components/ui/Tappable'
import { Text } from '@/components/ui/Text'
import { ErrorState } from '@/components/ui/States'
import { ServiceListSkeleton } from '@/components/ui/Skeleton'
import { brand, MANUFACTURER_WARRANTY_NOTICE } from '@/config/brand'
import { startDraft } from '@/lib/bookingDraft'
import { useCart } from '@/lib/cart'
import {
  fetchAppliance,
  fetchBrands,
  fetchBusinessConfig,
  fetchIssuesFor,
  fetchServiceReviews,
  fetchServicesFor,
  summaryByAppliance,
} from '@/lib/catalog'
import { countNote } from '@/components/ServiceScore'
import { ApplianceHero, type HeroSlide } from '@/components/ApplianceHero'
import { EarliestSlot, useEarliestSlot } from '@/components/EarliestSlot'
import { fetchCatalogPlans } from '@/lib/plans'
import { formatPaise } from '@/lib/format'
import { useAsync } from '@/lib/useAsync'
import { cn } from '@/lib/cn'
import { BrandLogoRow } from '@/components/BrandLogoRow'

/**
 * One appliance: what we do to it, what usually goes wrong with it, and which
 * brands we take.
 *
 * The screen is built the way the big marketplaces build theirs, because that
 * shape is what a customer already knows how to read: the appliance and its
 * cheapest visit fee at the top, a row of the services on it that jumps down
 * the page, then those services priced one per row, and a bar at the bottom
 * that books the common one without scrolling back up. The rest of the page —
 * the four steps, the promises, the brands, the warranty note — is the same
 * content the services screen carries, from the same components, so a customer
 * who arrived here from a shared link is told the same things in the same
 * order as one who browsed in.
 *
 * A second parameter, `s`, names the service to open at. It is how the sheet
 * on Home hands over: a customer who tapped "Deep clean" lands on the deep
 * clean, not at the top of a page they now have to search.
 *
 * Jumping: the web finds a section by its element id and lets the browser
 * scroll. Here every section reports where it was laid out (`onLayout`), and
 * a jump — from the picture row, the warranty line, the Menu, or `s` on
 * arrival — scrolls the page's own ScrollView to that offset. The group
 * headings are the scroll view's sticky headers, so each stays pinned under
 * the header while its rows scroll past; a jump to a row stops below it.
 */

interface ApplianceData {
  appliance: CatalogAppliance | null
  config: BusinessConfig | null
  services: CatalogService[]
  issues: CatalogIssue[]
  brands: CatalogBrand[]
  reviews: ServiceReview[]
  plans: CatalogPlan[]
}

/**
 * The service list's groups, in the order their first service comes in the
 * catalog. A group a given appliance has nothing in is left out, and its name
 * says only what it holds — "Repair" for a repair alone, "Repair & gas
 * refill" once there is a refill to go with it.
 */
const GROUPS: readonly {
  key: string
  keys: readonly ServiceKey[]
  title: (present: ReadonlySet<ServiceKey>) => string
}[] = [
  {
    key: 'service',
    keys: ['service', 'deep-clean', 'maintenance'],
    title: () => 'Service',
  },
  {
    key: 'repair',
    keys: ['repair', 'gas-refill'],
    title: (present) =>
      present.has('gas-refill') ? (present.has('repair') ? 'Repair & gas refill' : 'Gas refill') : 'Repair',
  },
  {
    key: 'fitting',
    keys: ['installation', 'uninstallation'],
    title: (present) =>
      present.has('installation') && present.has('uninstallation')
        ? 'Installation & uninstallation'
        : present.has('installation')
          ? 'Installation'
          : 'Uninstallation',
  },
]

function groupServices(services: readonly CatalogService[]) {
  return GROUPS.map((group) => {
    const members = services.filter((service) => group.keys.includes(service.serviceKey))
    const present = new Set(members.map((service) => service.serviceKey))
    return { key: group.key, title: group.title(present), services: members }
  })
    .filter((group) => group.services.length > 0)
    .sort(
      (a, b) => Math.min(...a.services.map((s) => s.order)) - Math.min(...b.services.map((s) => s.order))
    )
}

/** How much the plan saves on the same visits booked one at a time, in %. */
function planSaving(plan: CatalogPlan): number | null {
  if (!plan.compareAt || plan.compareAt <= plan.price) return null
  return Math.round((1 - plan.price / plan.compareAt) * 100)
}

/**
 * What each picture in the service row is called: the service's name without
 * the words every service here starts with.
 *
 * Under an 88px picture "Washing Machine Installation" is three lines of which
 * the first two say what the page's own heading already says. The shared words
 * are found rather than listed, because the catalog calls the appliance "Air
 * Conditioner" and its services "AC …" — no appliance name would strip them.
 */
function shortLabels(services: readonly CatalogService[]): Map<string, string> {
  const words = services.map((service) => service.name.split(' '))
  let shared = 0
  while (words.length > 1 && words.every((w) => w.length > shared + 1 && w[shared] === words[0]?.[shared])) {
    shared += 1
  }
  return new Map(
    services.map((service, index) => [service.id, (words[index] ?? []).slice(shared).join(' ') || service.name])
  )
}

/** The pinned heading over each group in the list. */
const GROUP_HEADING = '-mx-4 bg-bg px-4 py-4'

export function ApplianceScreen() {
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{ a?: string; s?: string }>()
  const parsed = applianceIdSchema.safeParse(params.a)
  const openAt = params.s ?? null
  const applianceId: ApplianceId | null = parsed.success ? parsed.data : null
  const reducedMotion = usePrefersReducedMotion()

  const load = useCallback(async (): Promise<ApplianceData> => {
    if (!applianceId) {
      return { appliance: null, config: null, services: [], issues: [], brands: [], reviews: [], plans: [] }
    }
    const [appliance, config, services, issues, brands, plans] = await Promise.all([
      fetchAppliance(applianceId),
      // Only for the warranty line. A failed read leaves the strip out rather
      // than the page, which is the right trade for one sentence.
      fetchBusinessConfig(),
      fetchServicesFor(applianceId),
      fetchIssuesFor(applianceId),
      fetchBrands(),
      // Only for the plan tile in the service row, which is left out when
      // this fails rather than taking the page with it.
      fetchCatalogPlans().catch(() => [] as CatalogPlan[]),
    ])
    // Every service's reviews, pooled and newest first. A failed read leaves
    // the section empty rather than taking the price list down with it.
    const reviews = (
      await Promise.all(
        services.map((service) =>
          fetchServiceReviews(applianceId, service.serviceKey).catch(() => [] as ServiceReview[])
        )
      )
    )
      .flat()
      .sort((a, b) => b.createdAt - a.createdAt)
    return { appliance, config, services, issues, brands, reviews, plans }
  }, [applianceId])

  const data = useAsync(load)
  const appliance = data.data?.appliance ?? null
  const services = data.data?.services ?? []
  const issues = data.data?.issues ?? []
  const serviceNames = new Map(services.map((service) => [service.serviceKey, service.name]))
  const tileLabels = shortLabels(services)
  const score = applianceId ? summaryByAppliance(services).get(applianceId) : undefined

  // The year's plan for this appliance, for the first tile in the service row:
  // one made for it alone before one that covers the whole house.
  const plans = (data.data?.plans ?? []).filter(
    (plan) => applianceId !== null && plan.applianceIds.includes(applianceId)
  )
  const plan = plans.find((each) => each.applianceIds.length === 1) ?? plans[0] ?? null

  const earliest = useEarliestSlot()
  const [shareOpen, setShareOpen] = useState(false)
  const [reviewsOpen, setReviewsOpen] = useState(false)
  const reviewNames = new Map(
    services.map((service) => [service.serviceKey, tileLabels.get(service.id) ?? service.name])
  )
  const warrantyFor = (service: CatalogService): number =>
    service.warrantyDays ?? data.data?.config?.defaultWarrantyDays ?? 0
  const cart = useCart()

  // The service whose options sheet is open — a repair, where "Add" means
  // picking the problem first.
  const [sheetId, setSheetId] = useState<string | null>(null)

  // Which kind of machine is the customer's — front-load, split — once they
  // have said, from the Menu or the chips over the list. Every Add on the page
  // and the service sheet carry it, and the booking opens with it chosen.
  const [kind, setKind] = useState<string | null>(null)
  const kindField = appliance?.detailFields.find((field) => field.kind === 'select' && field.key === 'type')
  const kinds = kindField?.options ?? []
  const sheetService = services.find((service) => service.id === sheetId) ?? null

  // The service a symptom implies. Tapping "Not draining water" should start a
  // repair, not make the customer choose between repair and installation first.
  const repairService = services.find((service) => service.serviceKey === 'repair') ?? null

  // The service the customer arrived on, when they arrived on one: the page
  // opens scrolled to it.
  const requested = services.find((service) => service.serviceKey === openAt) ?? null
  const cheapestFee = services.length ? Math.min(...services.map((service) => service.visitFee)) : null

  // The longest cover on offer here, service overrides included. "Up to",
  // because it is the best of them and not what every service carries.
  const warrantyDays = services.length
    ? Math.max(...services.map((service) => service.warrantyDays ?? data.data?.config?.defaultWarrantyDays ?? 0))
    : 0

  // The banner's slides: the appliance, then the repair and the next service
  // on the list, each on its own photograph of a technician at that job.
  const heroSlides: HeroSlide[] = []
  if (appliance?.heroImage) {
    heroSlides.push({
      key: 'appliance',
      photo: appliance.heroImage,
      title: `${appliance.name} service & repair`,
      note: cheapestFee === null ? undefined : `Starts at ${formatPaise(cheapestFee)}`,
    })
    const featured = [
      ...services.filter((service) => service.serviceKey === 'repair'),
      ...services.filter((service) => service.serviceKey !== 'repair'),
    ]
    for (const service of featured) {
      if (heroSlides.length >= 3) break
      if (!service.technicianPhoto) continue
      heroSlides.push({
        key: service.id,
        photo: service.technicianPhoto,
        title: service.name,
        note: `Starts at ${formatPaise(service.visitFee)}`,
      })
    }
  }

  // --- Where things are, for jumping -------------------------------------

  const scroller = useRef<ScrollView>(null)
  /** Offsets of the scroll view's direct children, by section id. */
  const sectionY = useRef(new Map<string, number>())
  /** Offsets of each service row inside its group's body. */
  const rowY = useRef(new Map<string, { group: string; y: number }>())
  const headingHeight = useRef(0)
  const scrolled = useRef(false)

  function scrollTo(y: number): void {
    scroller.current?.scrollTo({ y: Math.max(0, y), animated: !reducedMotion })
  }

  /** A section: its heading (or block) at the top of the visible page. */
  function jump(id: string): void {
    const y = sectionY.current.get(id)
    if (y !== undefined) scrollTo(y)
  }

  /** A row: below its group's pinned heading. */
  function jumpToRow(serviceId: string, animated = !reducedMotion): boolean {
    const row = rowY.current.get(serviceId)
    if (!row) return false
    const body = sectionY.current.get(`body-${row.group}`)
    if (body === undefined) return false
    scroller.current?.scrollTo({ y: Math.max(0, body + row.y - headingHeight.current), animated })
    return true
  }

  /**
   * Scroll to the service named in the link, once it is on the page — after
   * the catalog lands and the row has been laid out, and once only, so a
   * re-layout cannot drag the page back from wherever the customer has since
   * scrolled.
   */
  function settleInitialScroll(): void {
    if (scrolled.current || !requested) return
    if (jumpToRow(requested.id)) scrolled.current = true
  }

  function place(id: string) {
    return (event: LayoutChangeEvent) => {
      sectionY.current.set(id, event.nativeEvent.layout.y)
      settleInitialScroll()
    }
  }

  function placeRow(group: string, serviceId: string) {
    return (event: LayoutChangeEvent) => {
      rowY.current.set(serviceId, { group, y: event.nativeEvent.layout.y })
      settleInitialScroll()
    }
  }

  // The footer's height, so the floating Menu clears the cart bar.
  const [barHeight, setBarHeight] = useState(0)

  /**
   * Starting a booking is starting a new draft, not adding to whatever was left
   * half-filled before — a different appliance is a different job.
   */
  function startBooking(serviceKey: CatalogService['serviceKey'], issueId?: string): void {
    if (!applianceId) return
    startDraft({
      applianceId,
      serviceKey,
      issueIds: issueId ? [issueId] : [],
      techPreference: 'any',
    })
    router.push('/book/brand')
  }

  const unknown = applianceId === null || (data.status === 'ready' && appliance === null)
  const groups = groupServices(services)

  // --- The page, as the scroll view's direct children ---------------------
  // Flat, because sticky headers have to be direct children of the scroll view.

  const children: React.ReactNode[] = []
  const sticky: number[] = []

  if (unknown) {
    children.push(
      <ErrorState
        key="unknown"
        kind="notFound"
        className="py-20"
        title="We could not find that appliance"
        description="It may have been removed from the catalog. Browse everything we service instead."
      />
    )
  } else if (data.status === 'error') {
    children.push(<ErrorState key="error" className="py-20" onRetry={data.reload} retrying={data.refreshing} />)
  } else if (data.status === 'loading' || !appliance) {
    children.push(
      <View key="loading" className="mt-6">
        <ServiceListSkeleton />
      </View>
    )
  } else {
    // The banner, the way the marketplaces open an appliance: a few slides of
    // technicians at work, each with what it is and what it starts at. Absent
    // for an appliance nobody has photographed, and the screen opens on the
    // name the way it always did.
    if (heroSlides.length > 0) {
      children.push(<ApplianceHero key="hero" slides={heroSlides} className="mt-4" />)
    }

    children.push(
      <View key="intro" className="mt-6">
        {/* The name and its score on the left, and on the right how soon
            somebody can come — the question before any price. */}
        <View className="flex-row items-start justify-between gap-4">
          <View className="min-w-0 shrink">
            <Text accessibilityRole="header" className="text-3xl font-bold leading-tight text-ink">
              {appliance.name}
            </Text>

            {/* The score of every service here, weighted by how many people
                gave one. It opens the reviews it summarises in a panel, the
                way a dotted underline promises. */}
            {score?.rating !== undefined && score.reviewCount !== undefined ? (
              <Tappable
                onPress={() => setReviewsOpen(true)}
                accessibilityLabel={`Rated ${score.rating.toFixed(2)}, ${countNote(score.reviewCount)} reviews. Read them.`}
                className="mt-1.5 flex-row items-center gap-1.5 self-start"
              >
                <Icon as={Star} filled className="size-3.5 text-ink" />
                <Text className="text-sm text-ink underline decoration-dotted">
                  <Text className="text-sm font-semibold text-ink">{score.rating.toFixed(2)}</Text> (
                  {countNote(score.reviewCount)} reviews)
                </Text>
              </Tappable>
            ) : null}
          </View>
          <EarliestSlot label={earliest} className="mt-1" />
        </View>

        {appliance.heroImage ? null : cheapestFee !== null ? (
          <Text className="mt-3 text-sm text-muted">
            Visit from <Text className="text-base font-bold text-ink">{formatPaise(cheapestFee)}</Text>
            {services.length > 1 ? ` · ${services.length} services` : null}
          </Text>
        ) : null}

        {/* A row rather than a badge: it is a claim about money, and the
            condition on it is at the foot of the page, so it has to be
            something you can follow rather than something you can only read. */}
        {warrantyDays > 0 ? (
          <Tappable
            onPress={() => jump('warranty')}
            className="mt-4 flex-row items-center gap-3 rounded-card bg-surface px-4 py-3 active:bg-border active:opacity-100"
          >
            <Icon as={ShieldCheck} className="size-5 text-brand" />
            <Text className="min-w-0 flex-1 text-sm text-ink">Up to {warrantyDays} days service warranty</Text>
            <Icon as={ChevronRight} className="size-4 text-muted" />
          </Tappable>
        ) : null}
      </View>
    )

    // The jump row, as pictures: each service's photograph with what it is
    // under it. A customer scanning for "the one where they clean it" finds a
    // picture of somebody cleaning it faster than the word. Worth its space
    // from two services up; one is already the list.
    if (services.length >= 2 || plan) {
      children.push(
        <View key="jump-row" accessibilityLabel="Services on this appliance" className="-mx-4 mt-6 border-y border-border py-5">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3 px-4 py-1">
            {/* The year's plan first, as the marketplaces put their packages
                first: the one tile here that is not a single visit. */}
            {plan ? (
              <JumpTile label="Annual plan" href="/profile/plans">
                <View className="size-full items-center justify-center bg-success/10">
                  <Text className="text-[11px] font-semibold text-success">From</Text>
                  <Text className="text-base font-bold leading-tight text-success">{formatPaise(plan.price)}</Text>
                  <Text className="text-[11px] font-semibold text-success">a year</Text>
                </View>
              </JumpTile>
            ) : null}
            {services.map((service) => {
              const picture = service.technicianPhoto ?? service.photo ?? service.poster ?? appliance.image
              return (
                <JumpTile
                  key={service.id}
                  label={tileLabels.get(service.id) ?? service.name}
                  onPress={() => jumpToRow(service.id)}
                >
                  {picture ? <Img src={picture} alt="" className="absolute inset-0" /> : null}
                </JumpTile>
              )
            })}
          </ScrollView>
        </View>
      )
    }

    // Which kind of machine, where the appliance comes in kinds.
    if (kindField && kinds.length > 1) {
      children.push(
        <View key="kinds" className="mt-6" accessibilityLabel={kindField.label}>
          <Text className="text-sm font-semibold text-ink">Your {kindField.label.toLowerCase()}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="-mx-4 mt-3"
            contentContainerClassName="gap-3 px-4 py-1"
          >
            {kinds.map((each) => {
              const on = kind === each
              const photo = typePhoto(appliance.id, each) ?? appliance.image
              return (
                <Tappable
                  key={each}
                  onPress={() => setKind(on ? null : each)}
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={typeLabel(each)}
                  className="w-[88px] shrink-0 items-center active:opacity-100"
                >
                  {({ pressed }) => (
                    <>
                      <View
                        className={cn(
                          'aspect-square w-full overflow-hidden rounded-card bg-plate',
                          on && 'border-2 border-brand',
                          pressed && 'scale-95'
                        )}
                      >
                        {photo ? (
                          // Product shots on white: contained and multiplied
                          // onto the tile, not cropped through the machine.
                          <View className="absolute inset-0 p-2" style={{ mixBlendMode: 'multiply' }}>
                            <Img src={photo} alt="" contentFit="contain" className="size-full" />
                          </View>
                        ) : null}
                        {on ? (
                          <View className="absolute right-1.5 top-1.5 size-5 items-center justify-center rounded-full bg-brand">
                            <Icon as={Check} className="size-3.5 text-white" />
                          </View>
                        ) : null}
                      </View>
                      <Text
                        numberOfLines={2}
                        className={cn('mt-2 text-center text-xs leading-snug', on ? 'font-semibold text-brand' : 'text-ink')}
                      >
                        {typeLabel(each)}
                      </Text>
                    </>
                  )}
                </Tappable>
              )
            })}
          </ScrollView>
        </View>
      )
    }

    // The list, in groups, the way the marketplaces lay an appliance out: the
    // year's plan first, then servicing, repairs, and fitting or removing.
    // Each group's name stays pinned under the header while its rows scroll
    // past. A group of two or more opens on a card for its first service.
    const pushHeading = (id: string, title: string) => {
      children.push(<View key={`band-${id}`} aria-hidden className="-mx-4 mt-8 h-2 bg-surface" />)
      sticky.push(children.length)
      children.push(
        <View
          key={`heading-${id}`}
          className={GROUP_HEADING}
          onLayout={(event) => {
            headingHeight.current = event.nativeEvent.layout.height
            place(id)(event)
          }}
        >
          <Text accessibilityRole="header" className="text-2xl font-bold text-ink">
            {title}
          </Text>
        </View>
      )
    }

    if (plan) {
      const saving = planSaving(plan)
      pushHeading('annual-plan', 'Annual plan')
      children.push(
        <View key="body-annual-plan">
          <OfferBanner
            badge={saving ? `${saving}% OFF` : undefined}
            title={plan.name}
            photo={appliance.heroImage ?? appliance.image}
            body={
              <>
                <Text className="text-sm leading-relaxed text-night/70">
                  {plan.compareAt ? (
                    <Text className="text-base text-night/70 line-through">{formatPaise(plan.compareAt)} </Text>
                  ) : null}
                  <Text className="text-xl font-bold text-success">{formatPaise(plan.price)}/year</Text>
                </Text>
                <Text className="mt-1 text-sm leading-relaxed text-night/70">
                  {plan.visitsIncluded} {plan.visitsIncluded === 1 ? 'visit' : 'visits'} over the year
                </Text>
              </>
            }
            className="mt-2"
          />
          <ServiceRow
            title={plan.name}
            price={
              <>
                {formatPaise(plan.price)} a year
                {plan.compareAt ? (
                  <Text className="text-sm font-normal text-muted line-through"> {formatPaise(plan.compareAt)}</Text>
                ) : null}
              </>
            }
            offer={saving ? `Save ${saving}% on separate visits` : undefined}
            points={plan.benefits.slice(0, 2)}
            photo={services.find((s) => s.serviceKey === 'service')?.technicianPhoto ?? appliance.heroImage}
            action={
              <Tappable
                href="/profile/plans"
                className="h-11 w-[5.5rem] items-center justify-center rounded-card border border-border bg-bg active:border-brand active:opacity-100"
              >
                <Text className="text-sm font-semibold text-brand">View</Text>
              </Tappable>
            }
            onOpen={() => router.push('/profile/plans')}
            openLabel={`${plan.name}, ${formatPaise(plan.price)} a year. See the plan.`}
          />
        </View>
      )
    }

    for (const group of groups) {
      const lead = group.services[0]
      pushHeading(`group-${group.key}`, group.title)
      children.push(
        <View key={`body-${group.key}`} onLayout={place(`body-${group.key}`)}>
          {group.services.length > 1 && lead?.technicianPhoto ? (
            <OfferBanner
              badge={warrantyFor(lead) ? `${warrantyFor(lead)}-day warranty` : undefined}
              title={lead.name}
              body={
                <Text numberOfLines={3} className="text-sm leading-relaxed text-night/70">
                  {lead.description}
                </Text>
              }
              photo={lead.technicianPhoto}
              className="mt-2"
            />
          ) : null}
          {group.services.map((service, index) => {
            const duration = durationNote(service.durationMinutes)
            const warranty = warrantyFor(service)
            return (
              <ServiceRow
                key={service.id}
                id={`service-${service.id}`}
                onLayout={placeRow(group.key, service.id)}
                className={cn(index > 0 && 'border-t border-border')}
                title={service.name}
                rating={service.rating}
                reviewCount={service.reviewCount}
                price={
                  <>
                    Starts at {formatPaise(service.visitFee)}
                    {duration ? (
                      <Text className="text-sm font-normal text-muted"> · {duration.replace(/^About /, '')}</Text>
                    ) : null}
                  </>
                }
                offer={warranty ? `${warranty}-day service warranty` : undefined}
                points={[
                  service.description,
                  service.startingPrice > service.visitFee
                    ? `Repairs usually start at ${formatPaise(service.startingPrice)}, quoted on site and begun only after you approve.`
                    : 'Anything beyond this is quoted on site and starts only after you approve it.',
                ]}
                photo={service.technicianPhoto ?? service.photo ?? service.poster ?? appliance.image}
                action={
                  <AddButton
                    item={{
                      name: service.name,
                      applianceId: service.applianceId,
                      serviceKey: service.serviceKey,
                      options: serviceOptions(service, issues).length,
                      onOptions: () => setSheetId(service.id),
                      ...(kind ? { applianceType: kind } : {}),
                    }}
                  />
                }
                onOpen={() => setSheetId(service.id)}
                openLabel={`${service.name}, visit fee ${formatPaise(service.visitFee)}. See what it covers.`}
              />
            )
          })}
        </View>
      )
    }

    // A sticky header with no height: it pushes the last group's heading off
    // when the list ends, so it does not stay pinned over the reviews.
    sticky.push(children.length)
    children.push(<View key="end-of-groups" />)

    children.push(
      // The rating under the name opens the same reviews in a panel.
      <View key="reviews" onLayout={place('reviews')}>
        <ServiceReviews
          reviews={data.data?.reviews ?? []}
          serviceNames={serviceNames}
          action={<WriteReviewButton applianceId={appliance.id} />}
        />
      </View>
    )

    if (data.data && data.data.issues.length > 0) {
      children.push(
        <Section
          key="problems"
          title="Common problems"
          subtitle={
            repairService
              ? 'Tap what you are seeing and we will start a repair booking with it noted.'
              : 'What people most often call us about for this appliance.'
          }
        >
          <View className="flex-row flex-wrap gap-2">
            {data.data.issues.map((issue) =>
              repairService ? (
                <Chip key={issue.id} onPress={() => startBooking(repairService.serviceKey, issue.id)}>
                  {issue.label}
                </Chip>
              ) : (
                <Tag key={issue.id}>{issue.label}</Tag>
              )
            )}
          </View>
        </Section>
      )
    }

    children.push(
      <Section key="why" title="Why book with us">
        <Card className="p-4">
          <TrustPoints />
        </Card>
      </Section>,
      <Section key="how" title="How it works" subtitle={HOW_IT_WORKS_SUBTITLE}>
        <HowItWorks />
      </Section>
    )

    if (data.data && data.data.brands.length > 0) {
      children.push(
        <Section key="brands" title="Brands we take">
          <BrandLogoRow brands={data.data.brands} />
          <BrandDisclaimer className="mt-3" />
        </Section>
      )
    }

    children.push(
      // Said here, before a slot is chosen, rather than after the job. The
      // warranty row at the top of the page points at this.
      <View key="warranty" className="mt-8" onLayout={place('warranty')}>
        <Card className="p-4">
          <Text className="text-sm leading-relaxed text-muted">{MANUFACTURER_WARRANTY_NOTICE}</Text>
        </Card>
      </View>
    )

    // Room at the foot for the floating Menu, which sits where a pinned bar
    // would otherwise be when the cart is empty.
    if (cart.length === 0) children.push(<View key="menu-room" aria-hidden className="h-24" />)
  }

  const footer =
    cart.length > 0 ? (
      <View onLayout={(event) => setBarHeight(event.nativeEvent.layout.height)}>
        <CartBar services={services} />
      </View>
    ) : undefined

  return (
    <View className="flex-1 bg-bg">
      <AppShell
        scroll={false}
        footer={footer}
        mobileHeader={
          // Only the way back, search and share, as the marketplaces keep it:
          // the name and the earliest slot are the first things on the page
          // itself, so the bar does not say them twice.
          <Header
            showBack
            backFallback="/services"
            right={
              <View className="mr-2 flex-row items-center gap-2">
                <Tappable
                  href="/search"
                  accessibilityLabel="Search services"
                  className="size-11 items-center justify-center rounded-full border border-border bg-bg active:bg-surface active:opacity-100"
                >
                  <Icon as={Search} className="size-5 text-ink" />
                </Tappable>
                <Tappable
                  onPress={() => setShareOpen(true)}
                  accessibilityLabel={`Share ${appliance?.name ?? 'this page'}`}
                  className="size-11 items-center justify-center rounded-full border border-border bg-bg active:bg-surface active:opacity-100"
                >
                  <Icon as={Share2} className="size-5 text-ink" />
                </Tappable>
              </View>
            }
          />
        }
      >
        <ScrollView
          ref={scroller}
          className="flex-1"
          contentContainerClassName="px-4"
          contentContainerStyle={{ paddingBottom: 40 + (footer ? 0 : insets.bottom) }}
          stickyHeaderIndices={sticky}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </AppShell>

      {appliance && data.status === 'ready' ? (
        <SectionMenu
          aboveBar={cart.length > 0}
          barHeight={barHeight}
          onJump={jump}
          types={kinds.map((each) => ({
            key: each,
            label: typeLabel(each),
            photo: typePhoto(appliance.id, each) ?? appliance.image,
          }))}
          typeTitle={kindField?.label}
          chosenType={kind}
          onType={setKind}
          items={[
            ...(plan
              ? [
                  {
                    id: 'annual-plan',
                    label: 'Annual plan',
                    ...(planSaving(plan)
                      ? { offer: ['Save', `${planSaving(plan)}%`, 'OFF'] as const }
                      : { photo: appliance.heroImage }),
                  },
                ]
              : []),
            ...groups.map((group) => ({
              id: `group-${group.key}`,
              label: group.title,
              photo: group.services.find((s) => s.technicianPhoto)?.technicianPhoto ?? appliance.image,
            })),
          ]}
        />
      ) : null}

      <ServiceSheet
        service={sheetService}
        appliance={appliance ?? undefined}
        services={services}
        issues={issues}
        initialKind={kind}
        onClose={() => setSheetId(null)}
      />
      {appliance ? (
        <ShareSheet
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          title={appliance.name}
          text={`${appliance.name} repair, service and installation on ${brand.name}${
            cheapestFee === null ? '' : ` — visits from ${formatPaise(cheapestFee)}`
          }.`}
          url={Linking.createURL('/services/appliance', { queryParams: { a: appliance.id } })}
          image={appliance.heroImage ?? appliance.image}
        />
      ) : null}
      <ReviewsSheet
        open={reviewsOpen}
        onClose={() => setReviewsOpen(false)}
        title={`${appliance?.name ?? 'Service'} reviews`}
        rating={score?.rating}
        ratingCount={score?.reviewCount}
        reviews={data.data?.reviews ?? []}
        serviceNames={reviewNames}
      />
    </View>
  )
}

/** A picture in the jump row, with what it is under it. */
function JumpTile({
  label,
  href,
  onPress,
  children,
}: {
  label: string
  href?: Href
  onPress?: () => void
  children: React.ReactNode
}) {
  return (
    <Tappable
      {...(href ? { href } : {})}
      onPress={onPress}
      accessibilityLabel={label}
      className="w-[88px] active:opacity-100"
    >
      {({ pressed }) => (
        <>
          <View className={cn('aspect-square w-full overflow-hidden rounded-card bg-plate', pressed && 'scale-[0.97]')}>
            {children}
          </View>
          <Text numberOfLines={2} className="mt-2 text-center text-xs leading-snug text-ink">
            {label}
          </Text>
        </>
      )}
    </Tappable>
  )
}
