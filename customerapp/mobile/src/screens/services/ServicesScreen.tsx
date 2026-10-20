import { useCallback } from 'react'
import { View } from 'react-native'
import { PackageOpen, TrendingUp } from 'lucide-react-native'
import { router } from 'expo-router'
import type { BusinessConfig, CatalogAppliance, CatalogService } from '@app/shared'

import { AppShell, Section } from '@/components/AppShell'
import { Header } from '@/components/Screen'
import { CartButton } from '@/components/CartButton'
import { SearchBar } from '@/components/SearchBar'
import { ServicesHero } from '@/components/ServicesHero'
import { Icon } from '@/components/ui/Icon'
import { Tappable } from '@/components/ui/Tappable'
import { Text } from '@/components/ui/Text'
import { SERVICES_QUICK_LINKS } from '@/lib/trending'
import { ApplianceSpaceCard } from '@/components/ApplianceSpaceCard'
import { ApplianceCarousel } from '@/components/ApplianceCarousel'
import { TrustPoints } from '@/components/TrustPoints'
import { HowItWorks, HOW_IT_WORKS_SUBTITLE } from '@/components/HowItWorks'
import { AllBrandsGrid, TopTechnicians } from '@/components/TopTechnicians'
import { ServicesFaq } from '@/components/ServicesFaq'
import { SupportCard } from '@/components/SupportCard'
import { EmptyState , ErrorState } from '@/components/ui/States'

import { ApplianceGridSkeleton } from '@/components/ui/Skeleton'
import {
  cheapestByAppliance,
  fetchAllServices,
  fetchAppliances,
  fetchBusinessConfig,
  summaryByAppliance,
} from '@/lib/catalog'
import { formatPaise } from '@/lib/format'
import { useAsync } from '@/lib/useAsync'

/**
 * Everything we service, and what happens after someone books it.
 *
 * The "how it works" block is here rather than on Home because this is the
 * screen a customer reaches when they are deciding whether to trust the
 * process, not when they already know what they want. It is the same block the
 * appliance page carries, from the same component, so the two never drift.
 */

interface ServicesData {
  appliances: CatalogAppliance[]
  services: CatalogService[]
  config: BusinessConfig | null
}

export function ServicesScreen() {
  const load = useCallback(async (): Promise<ServicesData> => {
    const [appliances, services, config] = await Promise.all([
      fetchAppliances(),
      fetchAllServices(),
      // The FAQ reads its numbers from here; a page without it still answers.
      fetchBusinessConfig().catch(() => null),
    ])
    return { appliances, services, config }
  }, [])

  const all = useAsync(load)
  const fromPrices = all.data ? cheapestByAppliance(all.data.services) : null
  // An appliance carries no clip and no score of its own — both are worked
  // out from the services under it, and so is how many there are.
  const summaries = all.data ? summaryByAppliance(all.data.services) : null

  const countFor = (applianceId: string): number =>
    all.data?.services.filter((service) => service.applianceId === applianceId).length ?? 0

  return (
    // Services is a tab, and tabs do not usually carry a back arrow. This one
    // does, because most people do not arrive at it through the tab bar: they
    // tap "All services" at the end of Home's grid, and without an arrow the
    // only way back to where they were is to work out that Home is a tab.
    <AppShell
      mobileHeader={
        <Header title="All services" showBack backFallback="/home" right={<CartButton className="mr-2 size-11" />} />
      }
      onRefresh={all.reload}
      refreshing={all.refreshing}
    >
      <ServicesHero />

      {/* The search field floats over the foot of the photograph: the first
          thing to reach for, and it ties the picture to the page. It opens
          the search screen rather than searching in place; the chips under it
          open their service on the appliance page directly. */}
      <View className="-mt-8">
        <SearchBar readOnly prominent onOpen={() => router.push('/search')} />
        <View accessibilityLabel="Popular services" className="mt-3 gap-2">
          {[SERVICES_QUICK_LINKS.slice(0, 2), SERVICES_QUICK_LINKS.slice(2, 4)].map((row) => (
            <View key={row[0].label} className="flex-row gap-2">
              {row.map((chip) => (
                <Tappable
                  key={chip.label}
                  href={{ pathname: '/services/appliance', params: { a: chip.applianceId, s: chip.serviceKey } }}
                  className="min-h-10 flex-1 flex-row items-center justify-center gap-1.5 rounded-pill border border-border bg-bg px-3 active:border-brand active:opacity-100"
                >
                  <Icon as={TrendingUp} className="size-3.5 text-brand" />
                  <Text numberOfLines={1} className="shrink text-[13px] font-medium text-ink">
                    {chip.label}
                  </Text>
                </Tappable>
              ))}
            </View>
          ))}
        </View>
      </View>

      {/* The appliances as tall photographs, one at a time with an arrow
          either side: the picture says what it is before the name does, and
          a single card in the middle reads cleaner than two half-cards. */}
      <Section className="mt-8" title="What we service">
        {all.status === 'loading' ? (
          <ApplianceGridSkeleton />
        ) : all.status === 'error' ? (
          <ErrorState onRetry={all.reload} retrying={all.refreshing} />
        ) : all.data && all.data.appliances.length === 0 ? (
          <EmptyState
            icon={PackageOpen}
            title="Nothing listed yet"
            description="The catalog is being set up. Please check back shortly."
          />
        ) : (
          <ApplianceCarousel
            label="What we service"
            items={(all.data?.appliances ?? []).map((appliance, index) => {
              const from = fromPrices?.get(appliance.id)
              return {
                key: appliance.id,
                name: appliance.name,
                node: (
                  <ApplianceSpaceCard
                    appliance={appliance}
                    serviceCount={countFor(appliance.id)}
                    from={from === undefined ? undefined : formatPaise(from)}
                    rating={summaries?.get(appliance.id)?.rating}
                    priority={index === 0}
                  />
                ),
              }
            })}
          />
        )}
      </Section>

      <Section title="How it works" subtitle={HOW_IT_WORKS_SUBTITLE}>
        <HowItWorks />
      </Section>

      <Section title="What you get either way">
        <TrustPoints tiles />
      </Section>

      <Section title="Top technicians">
        <TopTechnicians />
      </Section>

      <Section title="We service all brands">
        <AllBrandsGrid />
      </Section>

      <Section title="Questions people ask">
        <ServicesFaq config={all.data?.config ?? null} />
      </Section>

      {all.data?.config?.supportPhone ? (
        <Section>
          <SupportCard supportPhone={all.data.config.supportPhone} />
        </Section>
      ) : null}
    </AppShell>
  )
}
