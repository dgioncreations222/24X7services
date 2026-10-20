import type { Href } from 'expo-router'
import { ChevronRight } from 'lucide-react-native'
import { View } from 'react-native'
import type {
  Banner,
  CatalogAppliance,
  CatalogBrand,
  CatalogIssue,
  CatalogService,
  Paise,
  PopularService,
} from '@app/shared'
import { formatPaise } from '@app/shared'

import { Section } from '@/components/AppShell'
import { BannerCard } from '@/components/PromotionalBanner'
import { ServiceRail, durationNote, type ServiceRailItem } from '@/components/ServiceRail'
import { BrandDisclaimer } from '@/components/BrandCard'
import { BrandLogoRow } from '@/components/BrandLogoRow'
import { TrustPoints } from '@/components/TrustPoints'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { Tappable } from '@/components/ui/Tappable'
import { Text } from '@/components/ui/Text'
import { VideoRail, type ReelItem } from '@/components/VideoRail'
import { serviceOptions } from '@/components/ServiceSheet'
import { ReferBanner } from '@/components/ReferBanner'
import { SpotlightRail } from '@/components/SpotlightRail'
import { HomeFooter } from '@/screens/home/HomeParts'

export interface HomeData {
  banners: Banner[]
  popular: PopularService[]
  appliances: CatalogAppliance[]
  services: CatalogService[]
  brands: CatalogBrand[]
  issues: CatalogIssue[]
}

/** How many appliance rows run before an inline banner is dropped between. */
const ROWS_BETWEEN_BANNERS = 2

/**
 * The appliance row the reels go in front of — the middle of the page, or the
 * last row on a catalog too short to have one there.
 */
const REELS_AT_ROW = 3

/**
 * Everything on Home below the care plans, once the catalog has landed: the
 * spotlight, the most booked, one row per appliance with the reels and the
 * inline banners dropped between, the brands, and the footer.
 */
export function HomeCatalog({ data, setSheetId }: { data: HomeData; setSheetId: (id: string) => void }) {
  const imageFor = new Map(data.appliances.map((appliance) => [appliance.id, appliance.image]))

  const inlineBanners = data.banners.filter((b) => b.slot === 'inline')

  const popularItems: ServiceRailItem[] = data.popular.map((popular) => {
    const listed = data.services.find(
      (service) => service.applianceId === popular.applianceId && service.serviceKey === popular.serviceKey
    )
    return {
      id: popular.id,
      name: popular.name,
      image: popular.image ?? imageFor.get(popular.applianceId),
      // A promoted row names an appliance and a service key; the
      // photograph and the score both belong to the catalog entry behind
      // that pair, not to the promotion. The technician at that job, where
      // there is one: a row of people at work, in colour, rather than a
      // row of grey machines.
      photo: listed?.technicianPhoto ?? listed?.photo,
      rating: listed?.rating,
      reviewCount: listed?.reviewCount,
      href: `/services/appliance?a=${popular.applianceId}` as Href,
      note: durationNote(listed?.durationMinutes),
      priceLabel: 'Visit from',
      price: popular.fromPrice,
      applianceId: popular.applianceId,
      serviceKey: popular.serviceKey,
      options: listed ? serviceOptions(listed, data.issues).length : 0,
      onOptions: listed ? () => setSheetId(listed.id) : undefined,
      onOpen: listed ? () => setSheetId(listed.id) : undefined,
    }
  })

  // One row per appliance, in catalog order, skipping any appliance whose
  // services are all inactive — a heading over an empty row reads as a page
  // that failed to load rather than a catalog with nothing to say yet.
  const rows = data.appliances
    .map((appliance) => ({
      appliance,
      services: data.services
        .filter((service) => service.applianceId === appliance.id)
        .sort((a, b) => a.order - b.order),
    }))
    .filter((row) => row.services.length > 0)

  // The reels: one per appliance, opening on the repair where there is one,
  // since that is what most people arrive needing. Its footage where it has
  // some; otherwise the appliance's photograph of itself in a room.
  const reels: ReelItem[] = rows.flatMap((row) => {
    const service = row.services.find((each) => each.serviceKey === 'repair') ?? row.services[0]
    const photo = service?.reelPoster ?? row.appliance.heroImage
    if (!service || !photo) return []
    return [
      {
        id: service.id,
        photo,
        video: service.reel,
        title: service.name,
        href: `/services/appliance?a=${service.applianceId}&s=${service.serviceKey}` as Href,
      },
    ]
  })

  return (
    <>
      {/* Large photograph cards, one per appliance, between the
          categories and the lists — the technician at work, and what
          a visit starts at. */}
      <Section title="In the spotlight">
        <SpotlightRail
          items={data.appliances.flatMap((appliance) => {
            if (!appliance.heroImage) return []
            const fees = data.services
              .filter((service) => service.applianceId === appliance.id)
              .map((service) => service.visitFee)
            return [
              {
                id: appliance.id,
                title: `${appliance.name} service & repair`,
                note: fees.length ? `Starts at ${formatPaise(Math.min(...fees) as Paise)}` : undefined,
                photo: appliance.heroImage,
                href: `/services/appliance?a=${appliance.id}` as Href,
              },
            ]
          })}
        />
      </Section>

      {popularItems.length > 0 ? (
        <Section title="Most booked" subtitle="What people call us about most">
          <ServiceRail items={popularItems} />
        </Section>
      ) : null}

      {rows.map((row, index) => {
        // Dropped after every second row, and only while there are
        // banners left to drop: repeating the same card down the page
        // would be worse than the run of rows it is there to break up.
        const bannerIndex =
          index > 0 && index % ROWS_BETWEEN_BANNERS === 0 ? index / ROWS_BETWEEN_BANNERS - 1 : -1
        const banner = inlineBanners[bannerIndex]

        return (
          <View key={row.appliance.id}>
            {/* Halfway down the rows rather than at the top: a break in
                a long run of near-identical rails, at a row no inline
                banner lands on. */}
            {index === Math.min(REELS_AT_ROW, rows.length - 1) && reels.length > 0 ? (
              <Section title="Handpicked for your home" subtitle="Our most trusted services">
                <VideoRail items={reels} />
              </Section>
            ) : null}

            {banner ? (
              <Section className="mt-8">
                <BannerCard banner={banner} />
              </Section>
            ) : null}

            <Section
              title={row.appliance.name}
              subtitle={summariseServices(row.services)}
              action={
                <Tappable
                  href={`/services/appliance?a=${row.appliance.id}` as Href}
                  accessibilityLabel={`See all ${row.appliance.name}`}
                  className="shrink-0 flex-row items-center gap-0.5"
                >
                  <Text className="text-sm font-semibold text-brand">See all</Text>
                  <Icon as={ChevronRight} className="size-4 text-brand" />
                </Tappable>
              }
            >
              <ServiceRail
                items={row.services.map((service) => ({
                  id: service.id,
                  name: service.name,
                  image: imageFor.get(service.applianceId),
                  photo: service.photo,
                  rating: service.rating,
                  reviewCount: service.reviewCount,
                  href: `/services/appliance?a=${service.applianceId}` as Href,
                  note: durationNote(service.durationMinutes),
                  priceLabel: 'Visit fee',
                  price: service.visitFee,
                  applianceId: service.applianceId,
                  serviceKey: service.serviceKey,
                  options: serviceOptions(service, data.issues).length,
                  onOptions: () => setSheetId(service.id),
                  onOpen: () => setSheetId(service.id),
                }))}
              />
            </Section>
          </View>
        )
      })}

      {data.brands.length > 0 ? (
        <Section title="Brands we service">
          <BrandLogoRow brands={data.brands} />
          {/* Required wherever manufacturer names appear. */}
          <BrandDisclaimer className="mt-3" />
        </Section>
      ) : null}

      <Section title="Why book with us">
        <Card className="p-4">
          <TrustPoints />
        </Card>
      </Section>

      <ReferBanner className="mt-8" />

      <HomeFooter />
    </>
  )
}

/** Past this many, the line stops listing and says "and more". */
const SUMMARY_LIMIT = 3

/**
 * "Repair, service and installation" — the line under an appliance heading.
 *
 * Built from the service keys themselves rather than from a table of labels in
 * this file, so an appliance that gains a gas refill says so without anyone
 * remembering to come back here and write a word for it.
 *
 * It stops at three. A heading followed by two lines naming every single thing
 * in the row underneath is not a subtitle, it is the row read out loud.
 */
function summariseServices(services: readonly CatalogService[]): string {
  const words = [...new Set(services.map((service) => service.serviceKey.replace(/-/g, ' ')))]
  if (words.length === 0) return ''

  const sentence =
    words.length > SUMMARY_LIMIT
      ? `${words.slice(0, SUMMARY_LIMIT - 1).join(', ')} and more`
      : words.length === 1
        ? String(words[0])
        : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`

  return sentence.charAt(0).toUpperCase() + sentence.slice(1)
}
