import { View } from 'react-native'
import { BadgeCheck, FileText, ReceiptText } from 'lucide-react-native'
import type { CatalogBrand, CatalogService } from '@app/shared'

import { BrandDisclaimer } from '@/components/BrandCard'
import { Band, PromiseLine } from '@/components/ServiceSheet/SheetPromise'
import { Img } from '@/components/ui/Img'
import { Text } from '@/components/ui/Text'
import { cn } from '@/lib/cn'

/** "Our process": the service's steps, numbered down a rule. */
export function ProcessSection({
  process,
}: {
  process: NonNullable<CatalogService['process']>
}) {
  return (
    <>
      <Band />
      <View className="px-5 py-7">
        <Text accessibilityRole="header" className="text-2xl font-bold text-ink">
          Our process
        </Text>
        <View className="mt-6">
          {process.map((step, index, all) => {
            const last = index === all.length - 1
            return (
              <View key={step.title} className="relative flex-row gap-4">
                {!last ? (
                  <View className="absolute bottom-0 left-[15px] top-9 w-px bg-border" />
                ) : null}
                <View className="size-8 shrink-0 items-center justify-center rounded-full bg-surface">
                  <Text className="text-sm font-semibold text-ink">{index + 1}</Text>
                </View>
                <View className={cn('min-w-0 flex-1', last ? '' : 'pb-7')}>
                  <Text className="pt-1 text-lg font-semibold text-ink">
                    {step.title}
                  </Text>
                  <Text className="mt-1 text-base leading-[26px] text-muted">
                    {step.body}
                  </Text>
                </View>
              </View>
            )
          })}
        </View>
      </View>
    </>
  )
}

/** "Top technicians", with the technician's photograph beside, where there is one. */
export function TechniciansSection({ service }: { service: CatalogService }) {
  return (
    <>
      <Band />
      <View className="flex-row items-center gap-4 px-5 py-7">
        <View className="min-w-0 flex-1">
          <Text accessibilityRole="header" className="text-2xl font-bold text-ink">
            Top technicians
          </Text>
          <View className="mt-5 gap-4">
            <PromiseLine icon={BadgeCheck}>Verified technicians</PromiseLine>
            <PromiseLine icon={ReceiptText}>
              Repairs only after your approval
            </PromiseLine>
            <PromiseLine icon={FileText}>Digital GST invoice</PromiseLine>
          </View>
        </View>
        {service.technicianPhoto ? (
          <View className="aspect-[3/4] w-[38%] shrink-0 overflow-hidden rounded-card bg-plate">
            <Img src={service.technicianPhoto} alt="" className="absolute inset-0" />
          </View>
        ) : null}
      </View>
    </>
  )
}

/** "We service all brands", three logos across. */
export function BrandsSection({ brands }: { brands: readonly CatalogBrand[] }) {
  return (
    <>
      <Band />
      <View className="px-5 py-7">
        <Text accessibilityRole="header" className="text-2xl font-bold text-ink">
          We service all brands
        </Text>
        {/* Three across: fixed widths with the slack as the gutter, since
            there is no grid here. */}
        <View className="mt-5 flex-row flex-wrap justify-between gap-y-3">
          {brands.map((brand) => (
            <View
              key={brand.id}
              className="h-16 w-[31%] items-center justify-center rounded-card bg-logo px-3"
            >
              {brand.logo ? (
                <Img
                  src={brand.logo}
                  alt={brand.name}
                  contentFit="contain"
                  className="h-7 w-full"
                />
              ) : (
                <Text numberOfLines={1} className="text-sm font-bold text-night">
                  {brand.wordmark}
                </Text>
              )}
            </View>
          ))}
          {/* Keeps a short last row left-aligned under justify-between. */}
          {brands.length % 3 === 2 ? <View className="w-[31%]" /> : null}
        </View>
        <BrandDisclaimer className="mt-4" />
      </View>
    </>
  )
}
