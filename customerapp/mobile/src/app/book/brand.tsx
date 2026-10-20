import { useCallback } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import type { CatalogBrand } from '@app/shared'

import { BookingStep } from '@/components/BookingStep'
import { BrandCard, BrandDisclaimer } from '@/components/BrandCard'
import { ErrorState } from '@/components/ui/States'
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { Text } from '@/components/ui/Text'
import { fetchBrands } from '@/lib/catalog'
import { fetchEnabledBrandIds } from '@/lib/api/brands'
import { patchDraft, useBookingDraft } from '@/lib/bookingDraft'
import { useAsync } from '@/lib/useAsync'

/**
 * Which manufacturer made it.
 *
 * Brands we do not service for this particular appliance are shown greyed out
 * rather than hidden. Someone looking for Bosch needs to find out that we do
 * not take Bosch dishwashers; a list that quietly omits it reads as a list that
 * has forgotten it, and they try again tomorrow.
 *
 * Wordmarks, never logos — see BRAND_LOGOS_ENABLED. The disclaimer sits with
 * them, every time they appear.
 */
export default function BrandScreen() {
  const { draft } = useBookingDraft()
  const applianceId = draft.applianceId

  const load = useCallback(async (): Promise<{
    brands: CatalogBrand[]
    enabled: Set<string>
  }> => {
    if (!applianceId) return { brands: [], enabled: new Set() }

    const [brands, enabled] = await Promise.all([fetchBrands(), fetchEnabledBrandIds(applianceId)])
    return { brands, enabled }
  }, [applianceId])

  const data = useAsync(load)

  function choose(brand: CatalogBrand): void {
    patchDraft({ brandId: brand.id })
    router.push('/book/details')
  }

  return (
    <BookingStep stepKey="brand" title="Which brand is it?">
      {data.status === 'loading' ? (
        <SkeletonGroup label="Loading brands" className="mt-6 flex-row flex-wrap gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-[48%]" />
          ))}
        </SkeletonGroup>
      ) : data.status === 'error' ? (
        <ErrorState className="py-16" onRetry={data.reload} retrying={data.refreshing} />
      ) : (
        <>
          <Text className="mt-5 text-sm text-muted">This tells your expert which parts and tools to bring.</Text>

          <View className="mt-4 flex-row flex-wrap justify-between gap-y-3">
            {data.data?.brands.map((brand) => (
              <BrandCard
                key={brand.id}
                brand={brand}
                onSelect={choose}
                selected={draft.brandId === brand.id}
                disabled={!data.data?.enabled.has(brand.id)}
                className="w-[48.5%]"
              />
            ))}
          </View>

          <Text className="mt-4 text-sm text-muted">
            Not listed?{' '}
            <Text
              accessibilityRole="link"
              onPress={() => router.push('/support')}
              className="text-sm font-medium text-ink underline"
            >
              Tell us the brand
            </Text>{' '}
            and we will say whether we can help.
          </Text>

          <BrandDisclaimer className="mt-6" />
        </>
      )}
    </BookingStep>
  )
}
