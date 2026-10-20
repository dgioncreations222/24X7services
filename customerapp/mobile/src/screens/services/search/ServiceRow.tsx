import { View } from 'react-native'
import { Check } from 'lucide-react-native'
import type { CatalogService } from '@app/shared'

import { ServiceClip } from '@/components/ServiceClip'
import { ServiceScore, scoreLabel } from '@/components/ServiceScore'
import { formatPaise } from '@/lib/format'
import { Icon } from '@/components/ui/Icon'
import { Tappable } from '@/components/ui/Tappable'
import { Text } from '@/components/ui/Text'
import { addToCart, countForService, inCart, removeFromCart, useCart } from '@/lib/cart'
import { cn } from '@/lib/cn'

/**
 * A service as one row: the picture on the left, the name, score and fee in
 * the middle, and "Add" on the right — the shape the marketplaces give a
 * search result, because it is a list somebody compares down.
 *
 * Two controls, side by side rather than one inside the other: the row opens
 * the service, and "Add" puts it in the cart without leaving the list. Tapped
 * again, it takes it back out. A repair has options — the problem it is for —
 * so its "Add" says how many and opens them instead (ServiceSheet).
 */
export function ServiceRow({
  service,
  image,
  options,
  onOpen,
  onOptions,
}: {
  service: CatalogService
  image?: string
  options: number
  onOpen: (href: string) => void
  onOptions: () => void
}) {
  const cart = useCart()
  const item = { applianceId: service.applianceId, serviceKey: service.serviceKey }
  const added = options > 0 ? countForService(cart, item) > 0 : inCart(cart, item)

  function press(): void {
    if (options > 0) onOptions()
    else if (added) removeFromCart(item)
    else addToCart(item)
  }
  const still = service.photo ?? service.poster ?? image

  return (
    <View className="flex-row items-start gap-3 py-4">
      <Tappable
        onPress={() => onOpen(`/services/detail?a=${service.applianceId}&s=${service.serviceKey}`)}
        accessibilityLabel={[
          service.name,
          scoreLabel(service.rating, service.reviewCount),
          `visit fee ${formatPaise(service.visitFee)}`,
        ]
          .filter(Boolean)
          .join(', ')}
        className="min-w-0 flex-1 flex-row items-start gap-4"
      >
        {still ? (
          <ServiceClip
            still={still}
            cover={Boolean(service.photo ?? service.poster)}
            motion={false}
            containClassName="p-2"
            className="size-20 shrink-0 rounded-card"
          />
        ) : null}
        <View className="min-w-0 flex-1">
          <Text className="text-base font-medium leading-snug text-ink">{service.name}</Text>
          <ServiceScore rating={service.rating} reviewCount={service.reviewCount} variant="compact" className="mt-1" />
          <Text className="mt-1 text-sm text-ink">
            {formatPaise(service.visitFee)} <Text className="text-sm text-muted">visit fee</Text>
          </Text>
        </View>
      </Tappable>
      <Tappable
        onPress={press}
        accessibilityState={options > 0 ? undefined : { selected: added }}
        accessibilityLabel={
          options > 0
            ? `Add ${service.name}, ${options} options`
            : added
              ? `Remove ${service.name} from cart`
              : `Add ${service.name} to cart`
        }
        className={cn(
          'relative min-h-11 w-24 shrink-0 flex-row items-center justify-center gap-1 rounded-card border',
          added ? 'border-brand bg-brand-soft' : 'border-border bg-bg active:border-brand active:opacity-100'
        )}
      >
        {added ? <Icon as={Check} className="size-4 text-brand" /> : null}
        <Text className="text-sm font-semibold text-brand">{added ? 'Added' : 'Add'}</Text>
        {options > 0 ? (
          <View pointerEvents="none" importantForAccessibility="no-hide-descendants" className="absolute inset-x-0 -bottom-2 items-center">
            <Text numberOfLines={1} className="bg-bg px-1 text-[11px] leading-[11px] text-muted">
              {options} options
            </Text>
          </View>
        ) : null}
      </Tappable>
    </View>
  )
}
