import { useCallback, useEffect, useState } from 'react'
import { ScrollView, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native'
import { router } from 'expo-router'
import type { BannerTone } from '@app/shared'

import { AppShell } from '@/components/AppShell'
import { HomeHeaderSearch, HomeHeaderStrip, HomeHeaderTop } from '@/components/HomeHeader'
import { PromotionalBanner, useToneEdge } from '@/components/PromotionalBanner'
import { CategoryGrid } from '@/components/CategoryGrid'
import { useLocation } from '@/lib/useLocation'
import { Card } from '@/components/ui/Card'
import { Text } from '@/components/ui/Text'
import { ErrorState } from '@/components/ui/States'
import { CategoryGridSkeleton, HomeSkeleton, Skeleton } from '@/components/ui/Skeleton'
import { CartBar } from '@/components/CartBar'
import { ServiceSheet } from '@/components/ServiceSheet'
import {
  fetchAllIssues,
  fetchAllServices,
  fetchAppliances,
  fetchBanners,
  fetchBrands,
  fetchPopularServices,
} from '@/lib/catalog'
import { locationLabel } from '@/lib/location'
import { useAsync } from '@/lib/useAsync'
import { HomeCatalog, type HomeData } from '@/screens/home/HomeCatalog'
import { CarePlansLink, ToneLayer, UnserviceableNotice } from '@/screens/home/HomeParts'
import { useStaleLocationCheck } from '@/screens/home/useStaleLocationCheck'

/**
 * Home.
 *
 * Everything on it comes from the catalog. No appliance, service, brand or
 * price is written into this file — a new appliance is a seed entry, and it
 * appears here without anyone editing a screen.
 *
 * The top of it is one unbroken block of colour running the full width of the
 * screen, from the status bar down: the location and the search field float on
 * it, and it is the offer itself that paints it. The page colour starts where
 * that block stops, with the grid of everything we service. The block says
 * where you are and what this place sells; everything below it is the shop.
 *
 * Under that the page is a stack of short sideways rows rather than a few tall
 * blocks: the things people book most, and then one row per appliance. A
 * customer who already knows what is broken reaches a booking in two taps from
 * anywhere on it. Where the rows would otherwise run together, a banner from
 * the `inline` slot breaks them up — which banners those are, and how many, is
 * seed data, so the shape of this page changes without a release.
 *
 * The one thing Home decides for itself is whether the saved location still
 * holds. Areas get switched on and off, and a customer whose pincode was
 * dropped should find that out here rather than at the end of a booking.
 */

/** How far the page scrolls before the search field grows its shadow. */
const SCROLL_THRESHOLD = 8

/** Roughly the edge-to-edge banner's height on a phone, in px. */
const HERO_HEIGHT = 180

/**
 * The scroll view's children, in order: the gradient behind the top, the
 * location row, the search (the one sticky child), then the page.
 */
const STICKY_SEARCH = 2

export function HomeScreen() {
  const { location, setLocation, ready } = useLocation()

  const load = useCallback(async (): Promise<HomeData> => {
    // One round trip's worth of latency rather than five, and a single failure
    // takes the whole screen to the error state instead of leaving it half
    // built with no way to retry the part that failed.
    const [banners, popular, appliances, services, brands, issues] = await Promise.all([
      fetchBanners(),
      fetchPopularServices(),
      fetchAppliances(),
      fetchAllServices(),
      fetchBrands(),
      fetchAllIssues(),
    ])
    return { banners, popular, appliances, services, brands, issues }
  }, [])

  const home = useAsync(load)

  // The service whose options sheet is open — a repair, where "Add" means
  // picking the problem first.
  const [sheetId, setSheetId] = useState<string | null>(null)

  // Once the page leaves the top, the pinned search field grows a shadow so
  // it reads as sitting above what scrolls under it. The banner's colour
  // stays under the header until the banner has gone up past it, so no strip
  // of page colour opens between it and the banner still in view. Each is
  // set only when the answer flips, so a long scroll costs two renders.
  const [scrolled, setScrolled] = useState(false)
  const [pastHero, setPastHero] = useState(false)
  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y
    setScrolled(y > SCROLL_THRESHOLD)
    setPastHero(y > HERO_HEIGHT)
  }, [])

  const [heroTone, setHeroTone] = useState<BannerTone | null>(null)

  // How far down the page the banner ends, for the gradient behind the header
  // and the banner to reach exactly that far.
  const [pageTop, setPageTop] = useState(0)
  const [heroBottom, setHeroBottom] = useState(0)
  const heroHeight = heroBottom > 0 ? pageTop + heroBottom : 0

  useStaleLocationCheck(location, setLocation)

  // Someone who cleared their storage, or arrived on this route directly, has
  // no location and nothing on this screen applies to them yet.
  useEffect(() => {
    if (ready && !location) router.replace('/location')
  }, [ready, location])

  const data = home.data
  const sheetService = data?.services.find((service) => service.id === sheetId) ?? null

  const heroBanners = data?.banners.filter((b) => b.slot === 'hero') ?? []

  // The banner's colour while there is a banner to match.
  const [heroTop] = useToneEdge(heroTone ?? 'blue')
  const headerTone = heroTone && heroBanners.length > 0 && !pastHero ? heroTop : undefined
  const activeTone = heroTone ?? heroBanners[0]?.tone

  const headerProps = {
    raised: scrolled,
    area: location?.area,
    detail: location ? `${location.city} ${location.pincode}` : undefined,
    tone: headerTone,
    onChangeLocation: () => router.push('/location'),
    onSearch: () => router.push('/search'),
  }

  return (
    <AppShell
      tab
      scroll={false}
      mobileHeader={<HomeHeaderStrip tone={headerTone} raised={scrolled} />}
      footer={<CartBar tab services={data?.services ?? []} />}
    >
      <ScrollView
        className="flex-1"
        stickyHeaderIndices={[STICKY_SEARCH]}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerClassName="pb-10"
      >
        {/* One gradient behind the header and the banner together, from the
            top of the page to the foot of the banner, in the colour of the
            slide in view — the way the marketplaces open Home, as one block.
            A layer per tone, cross-fading, so a slide change is a change of
            light rather than a cut. Always a child, even empty, so the sticky
            index below stays put. */}
        <View pointerEvents="none" className="absolute inset-x-0 top-0" style={{ height: heroHeight }}>
          {data && heroBanners.length > 0 && heroHeight > 0
            ? [...new Set(heroBanners.map((banner) => banner.tone))].map((tone) => (
                <ToneLayer key={tone} tone={tone} shown={tone === activeTone} />
              ))
            : null}
        </View>

        <HomeHeaderTop {...headerProps} />
        <HomeHeaderSearch {...headerProps} />

        <View className="px-4" onLayout={(event) => setPageTop(event.nativeEvent.layout.y)}>
          {/* The banner's own height while it loads, so the page does not jump
              when it lands; nothing at all once there is genuinely no banner. */}
          <View
            className="relative z-[1] -mx-4"
            onLayout={(event) => {
              const { y, height } = event.nativeEvent.layout
              setHeroBottom(height > 0 ? y + height : 0)
            }}
          >
            {data && heroBanners.length > 0 ? (
              <PromotionalBanner banners={heroBanners} edgeToEdge onToneChange={setHeroTone} />
            ) : home.status === 'loading' ? (
              <Skeleton className="h-48 rounded-none" />
            ) : null}
          </View>

          {location && !location.serviceable ? (
            <UnserviceableNotice area={locationLabel(location)} onChange={() => router.push('/location')} />
          ) : null}

          {/* The first card under the hero, and the one that renders in all
              three states: the grid, the retry, or the grid's own skeleton.

              The catalog is checked before the status, so a reload that fails
              with a catalog already on screen leaves the page standing rather
              than punching an error through the middle of it. */}
          <Card raised className="mt-5 p-4">
            {data ? (
              <>
                <Text accessibilityRole="header" className="mb-3 text-xl font-bold text-ink">
                  What we service
                </Text>
                <CategoryGrid appliances={data.appliances} services={data.services} />
              </>
            ) : home.status === 'error' ? (
              <ErrorState className="py-6" onRetry={home.reload} retrying={home.refreshing} />
            ) : (
              <CategoryGridSkeleton />
            )}
          </Card>

          <CarePlansLink />

          {data ? (
            <HomeCatalog data={data} setSheetId={setSheetId} />
          ) : home.status === 'loading' ? (
            <HomeSkeleton />
          ) : null}
        </View>
      </ScrollView>

      <ServiceSheet
        service={sheetService}
        appliance={data?.appliances.find((appliance) => appliance.id === sheetService?.applianceId)}
        services={data?.services ?? []}
        issues={data?.issues ?? []}
        onClose={() => setSheetId(null)}
      />
    </AppShell>
  )
}
