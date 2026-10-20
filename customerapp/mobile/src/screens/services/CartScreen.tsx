import { useCallback } from 'react'
import { View } from 'react-native'
import { router, type Href } from 'expo-router'
import { ShoppingCart, Trash2 } from 'lucide-react-native'
import type { CatalogAppliance, CatalogIssue, CatalogService } from '@app/shared'

import { AppShell } from '@/components/AppShell'
import { Header } from '@/components/Screen'
import { ServiceClip } from '@/components/ServiceClip'
import { ServiceScore } from '@/components/ServiceScore'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Tappable } from '@/components/ui/Tappable'
import { Text } from '@/components/ui/Text'
import { EmptyState , ErrorState } from '@/components/ui/States'

import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { fetchAllIssues, fetchAllServices, fetchAppliances } from '@/lib/catalog'
import { removeService, useCart } from '@/lib/cart'
import { startDraft } from '@/lib/bookingDraft'
import { formatPaise } from '@/lib/format'
import { useAsync } from '@/lib/useAsync'
import { cn } from '@/lib/cn'

/**
 * The services a customer set aside, each with its own way to book.
 *
 * One booking is one service and one visit — the brand, the problem and the
 * slot all belong to that one appliance — so there is no single checkout here.
 * "Book" starts the booking for that item, and the item leaves the cart when
 * the booking is made (PaymentScreen), not when the flow is merely started.
 *
 * Prices come from the catalog, not the cart, so what is shown is today's fee.
 * An item whose service has since been withdrawn is dropped from view rather
 * than offered for a booking that would be refused.
 *
 * A repair added for two problems is one row and one visit: the technician
 * who comes for "not cooling" can look at the dripping too, and the booking
 * starts with both problems already picked.
 */

interface Row {
  service: CatalogService
  issues: CatalogIssue[]
  /** The kind of machine, if it was said while adding. */
  applianceType?: string
}

export function CartScreen() {
  const cart = useCart()

  const load = useCallback(async () => {
    const [appliances, services, issues] = await Promise.all([fetchAppliances(), fetchAllServices(), fetchAllIssues()])
    return { appliances, services, issues }
  }, [])
  const catalog = useAsync(load)

  // One row per service, in the order each was first added, carrying every
  // problem it was added for.
  const rows: Row[] = []
  for (const item of cart) {
    const service = catalog.data?.services.find(
      (each) => each.applianceId === item.applianceId && each.serviceKey === item.serviceKey
    )
    if (!service) continue
    let row = rows.find((each) => each.service.id === service.id)
    if (!row) {
      row = { service, issues: [] }
      rows.push(row)
    }
    const issue = catalog.data?.issues.find((each) => each.id === item.issueId)
    if (issue) row.issues.push(issue)
    row.applianceType ??= item.applianceType
  }

  const total = rows.reduce((sum, row) => sum + row.service.visitFee, 0)

  function book(row: Row): void {
    startDraft({
      applianceId: row.service.applianceId,
      serviceKey: row.service.serviceKey,
      issueIds: row.issues.map((issue) => issue.id),
      ...(row.applianceType ? { applianceType: row.applianceType } : {}),
      techPreference: 'any',
    })
    router.push('/book/brand')
  }

  return (
    <AppShell mobileHeader={<Header title="Cart" showBack backFallback="/home" />}>
      {cart.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="Your cart is empty"
          description="Add a service from search or the services list, and it waits here until you book it."
          action={{ label: 'Browse services', href: '/services' }}
        />
      ) : catalog.status === 'loading' ? (
        <SkeletonGroup label="Loading" className="mt-5 gap-4">
          {cart.map((item) => (
            <Skeleton key={`${item.applianceId}-${item.serviceKey}-${item.issueId ?? ''}`} className="h-24" />
          ))}
        </SkeletonGroup>
      ) : catalog.status === 'error' ? (
        <ErrorState onRetry={catalog.reload} retrying={catalog.refreshing} />
      ) : (
        <View className="mt-5">
          <Text className="text-sm text-muted">Each service is its own visit, so each one is booked on its own.</Text>

          <View className="mt-2">
            {rows.map((row, index) => (
              <View key={row.service.id} className={cn(index > 0 && 'border-t border-border')}>
                <CartRow
                  row={row}
                  appliance={catalog.data?.appliances.find((appliance) => appliance.id === row.service.applianceId)}
                  onBook={book}
                />
              </View>
            ))}
          </View>

          <View className="mt-4 flex-row items-baseline justify-between border-t border-border pt-4">
            <Text className="text-sm text-muted">
              Visit fees, {rows.length} {rows.length === 1 ? 'service' : 'services'}
            </Text>
            <Text className="text-base font-bold text-ink">{formatPaise(total)}</Text>
          </View>
          <Text className="mt-1 text-xs text-muted">
            Any repair beyond the visit is quoted on site and starts only after you approve it.
          </Text>

          <Tappable href="/services" className="mt-6 min-h-11 items-center justify-center">
            <Text className="text-sm font-semibold text-brand">Add more services</Text>
          </Tappable>
        </View>
      )}
    </AppShell>
  )
}

function CartRow({
  row,
  appliance,
  onBook,
}: {
  row: Row
  appliance?: CatalogAppliance
  onBook: (row: Row) => void
}) {
  const { service, issues } = row
  const still = service.photo ?? service.poster ?? appliance?.image

  return (
    <View className="flex-row items-start gap-4 py-4">
      <Tappable
        href={`/services/detail?a=${service.applianceId}&s=${service.serviceKey}` as Href}
        accessibilityLabel={service.name}
        className="shrink-0"
      >
        {still ? (
          <ServiceClip
            still={still}
            cover={Boolean(service.photo ?? service.poster)}
            motion={false}
            containClassName="p-2"
            className="size-20 rounded-card"
          />
        ) : (
          <View className="size-20 rounded-card bg-surface" />
        )}
      </Tappable>

      <View className="min-w-0 flex-1">
        <Text className="text-base font-medium leading-snug text-ink">{service.name}</Text>
        {issues.length > 0 ? (
          <Text className="mt-0.5 text-sm text-muted">For: {issues.map((issue) => issue.label).join(', ')}</Text>
        ) : null}
        <ServiceScore rating={service.rating} reviewCount={service.reviewCount} variant="compact" className="mt-1" />
        <Text className="mt-1 text-sm text-ink">
          {formatPaise(service.visitFee)} <Text className="text-sm text-muted">visit fee</Text>
        </Text>

        <View className="mt-3 flex-row items-center gap-2">
          <Button size="sm" onPress={() => onBook(row)}>
            Book
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onPress={() => removeService(service)}
            accessibilityLabel={`Remove ${service.name} from cart`}
            iconLeft={<Icon as={Trash2} className="size-4 text-ink" />}
          >
            Remove
          </Button>
        </View>
      </View>
    </View>
  )
}
