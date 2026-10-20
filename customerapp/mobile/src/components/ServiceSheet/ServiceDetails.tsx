import { useCallback, useState } from 'react'
import { ScrollView, View } from 'react-native'
import * as Linking from 'expo-linking'
import type { Href } from 'expo-router'
import { ChevronRight, ReceiptText, Share2 } from 'lucide-react-native'
import type {
  CatalogAppliance,
  CatalogIssue,
  CatalogService,
  ServiceReview,
} from '@app/shared'

import { ReviewsPanel } from '@/components/ReviewsSheet'
import { durationNote } from '@/components/ServiceRail'
import { serviceOptions } from '@/components/ServiceSheet/options'
import { PhotoStrip } from '@/components/ServiceSheet/PhotoStrip'
import {
  BrandsSection,
  ProcessSection,
  TechniciansSection,
} from '@/components/ServiceSheet/SheetAbout'
import { SheetFooter } from '@/components/ServiceSheet/SheetFooter'
import {
  Band,
  ExcludesSection,
  FaqSection,
  PromiseSection,
} from '@/components/ServiceSheet/SheetPromise'
import { SheetRequirements } from '@/components/ServiceSheet/SheetRequirements'
import { ShareSheet } from '@/components/ShareSheet'
import { Icon } from '@/components/ui/Icon'
import { Tappable } from '@/components/ui/Tappable'
import { Text } from '@/components/ui/Text'
import { countForService, inCart, useCart } from '@/lib/cart'
import {
  fetchBrands,
  fetchBusinessConfig,
  fetchServiceReviews,
} from '@/lib/catalog'
import { formatPaise } from '@/lib/format'
import { useAsync } from '@/lib/useAsync'
import { cn } from '@/lib/cn'
import { brand } from '@/config/brand'

/**
 * Everything the sheet shows, as its own piece: the sheet frames it in a
 * panel from the bottom, and the service's own page (`/services/detail`) lays
 * the same thing out full width — one design wherever a service is opened,
 * rather than a sheet saying one thing and a page another.
 *
 * Both variants scroll inside themselves and pin the add bar at the foot, so
 * the page that hosts the `page` variant renders it in `Screen scroll={false}`.
 */
export function ServiceDetails({
  variant,
  titleId: _titleId,
  service,
  appliance,
  issues,
  initialKind,
  onClose,
}: {
  /** In the sheet it scrolls inside the panel; on a page, it fills the screen. */
  variant: 'sheet' | 'page'
  /** Kept for parity with the web component; unused on native. */
  titleId?: string
  service: CatalogService
  appliance?: CatalogAppliance
  issues: readonly CatalogIssue[]
  /** The kind of machine already chosen, if any: that step starts answered. */
  initialKind?: string | null
  /** Closes the sheet on the way to another page; nothing to close on a page. */
  onClose?: () => void
}) {
  const page = variant === 'page'
  const cart = useCart()

  const loadExtras = useCallback(async () => {
    const [config, brands, reviews] = await Promise.all([
      fetchBusinessConfig().catch(() => null),
      fetchBrands().catch(() => []),
      fetchServiceReviews(service.applianceId, service.serviceKey).catch(
        () => [] as ServiceReview[]
      ),
    ])
    return { config, brands, reviews }
  }, [service.applianceId, service.serviceKey])
  const extras = useAsync(loadExtras)

  const options = serviceOptions(service, issues)
  // The one "kind of machine" question the appliance asks, if it asks one.
  const kindField = appliance?.detailFields.find(
    (field) => field.kind === 'select' && field.key === 'type'
  )
  const kinds = kindField?.options ?? []

  const [issueId, setIssueId] = useState<string | null>(null)
  const [kind, setKind] = useState<string | null>(
    initialKind && kinds.includes(initialKind) ? initialKind : null
  )
  const needsIssue = options.length > 0
  const needsKind = kinds.length > 0
  const [openStep, setOpenStep] = useState<1 | 2>(needsIssue ? 1 : 2)

  const ready = (!needsIssue || issueId !== null) && (!needsKind || kind !== null)
  const item = {
    applianceId: service.applianceId,
    serviceKey: service.serviceKey,
    ...(issueId ? { issueId } : {}),
    ...(kind ? { applianceType: kind } : {}),
  }
  const already = inCart(cart, item)
  const added = countForService(cart, service)

  const photos = [
    ...new Set(
      [service.technicianPhoto, service.photo, appliance?.heroImage].filter(
        (photo): photo is string => Boolean(photo)
      )
    ),
  ]
  const warrantyDays =
    service.warrantyDays ?? extras.data?.config?.defaultWarrantyDays
  const duration = durationNote(service.durationMinutes)?.replace(/^About /, '')
  const brands = extras.data?.brands ?? []

  const [shareOpen, setShareOpen] = useState(false)
  // A link that opens this service in the app (or on the web build, the page).
  const shareUrl = Linking.createURL('/services/detail', {
    queryParams: { a: service.applianceId, s: service.serviceKey },
  })
  const detailHref =
    `/services/detail?a=${service.applianceId}&s=${service.serviceKey}` as Href

  return (
    <View
      className={cn(
        'min-h-0 shrink overflow-hidden bg-bg',
        page ? 'flex-1' : 'rounded-t-[20px]'
      )}
    >
      <ScrollView className="shrink" keyboardShouldPersistTaps="handled">
        <PhotoStrip photos={photos} />

        <View className="px-5 pb-6 pt-6">
          <Text accessibilityRole="header" className="text-2xl font-bold text-ink">
            {service.name}
          </Text>
          <Text className="mt-1.5 text-base text-ink">
            <Text className="text-base font-semibold text-ink">
              Starts at {formatPaise(service.visitFee)}
            </Text>
            {duration ? <Text className="text-base text-muted">{` · ${duration}`}</Text> : null}
          </Text>
        </View>

        {needsIssue || needsKind ? (
          <SheetRequirements
            service={service}
            options={options}
            kindField={kindField}
            kinds={kinds}
            issueId={issueId}
            setIssueId={setIssueId}
            kind={kind}
            setKind={setKind}
            needsIssue={needsIssue}
            needsKind={needsKind}
            openStep={openStep}
            setOpenStep={setOpenStep}
          />
        ) : null}

        <Band />
        <Tappable
          href={detailHref}
          onPress={onClose}
          className="min-h-16 flex-row items-center gap-4 px-5 active:bg-surface active:opacity-100"
        >
          <Icon as={ReceiptText} className="size-5 text-muted" />
          <Text className="flex-1 text-base font-semibold text-ink">Rate card</Text>
          <Icon as={ChevronRight} className="size-5 text-muted" />
        </Tappable>

        {service.process && service.process.length > 0 ? (
          <ProcessSection process={service.process} />
        ) : null}

        <TechniciansSection service={service} />

        {brands.length > 0 ? <BrandsSection brands={brands} /> : null}

        <PromiseSection warrantyDays={warrantyDays} />

        {service.excludes && service.excludes.length > 0 ? (
          <ExcludesSection excludes={service.excludes} />
        ) : null}

        {service.faqs && service.faqs.length > 0 ? (
          <FaqSection faqs={service.faqs} />
        ) : null}

        <Band />
        <View className="items-center px-5 py-6">
          <Text className="text-center text-base text-muted">
            Share this service with your loved ones
          </Text>
          <Tappable
            onPress={() => setShareOpen(true)}
            className="mt-3 h-12 w-full flex-row items-center justify-center gap-2 rounded-card border border-border active:border-brand"
          >
            <Text className="text-base font-semibold text-brand">Share</Text>
            <Icon as={Share2} className="size-4 text-brand" />
          </Tappable>
        </View>

        <Band />
        <View className="px-5 py-7">
          <ShareSheet
            open={shareOpen}
            onClose={() => setShareOpen(false)}
            title={service.name}
            text={`${service.name} on ${brand.name} — ${formatPaise(service.visitFee)} visit fee, quoted before any work starts.`}
            url={shareUrl}
            image={photos[0]}
          />
          <ReviewsPanel
            rating={service.rating}
            ratingCount={service.reviewCount}
            reviews={extras.data?.reviews ?? []}
            serviceNames={new Map()}
          />
        </View>
      </ScrollView>

      <SheetFooter
        page={page}
        service={service}
        item={item}
        added={added}
        ready={ready}
        already={already}
        onClose={onClose}
      />
    </View>
  )
}
