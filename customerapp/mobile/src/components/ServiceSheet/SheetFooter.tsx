import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Check } from 'lucide-react-native'
import type { CatalogService } from '@app/shared'

import { StickyCTA } from '@/components/Screen'
import { Icon } from '@/components/ui/Icon'
import { Tappable } from '@/components/ui/Tappable'
import { Text } from '@/components/ui/Text'
import { addToCart } from '@/lib/cart'
import { formatPaise } from '@/lib/format'
import { cn } from '@/lib/cn'

/** The add bar at the foot: pinned by the page, or drawn along the sheet's edge. */
export function SheetFooter({
  page,
  service,
  item,
  added,
  ready,
  already,
  onClose,
}: {
  page: boolean
  service: CatalogService
  item: Parameters<typeof addToCart>[0]
  /** How many of this service are in the cart already. */
  added: number
  ready: boolean
  already: boolean
  onClose?: () => void
}) {
  const insets = useSafeAreaInsets()

  const footerDetail = (
    <View className="min-w-0 flex-1" accessibilityLiveRegion="polite">
      {added > 0 ? (
        <>
          <Text className="text-base font-semibold text-ink">
            {added} {added === 1 ? 'item' : 'items'} added
          </Text>
          <Tappable href="/cart" onPress={onClose} className="self-start">
            <Text className="text-sm font-semibold text-brand">View cart</Text>
          </Tappable>
        </>
      ) : (
        <>
          <Text className="text-base font-semibold text-ink">
            {formatPaise(service.visitFee)}
          </Text>
          <Text className="text-sm text-muted">
            {ready ? 'Visit fee' : 'Pick the options above'}
          </Text>
        </>
      )}
    </View>
  )
  const footerButton = (
    <Tappable
      disabled={!ready || already}
      onPress={() => addToCart(item)}
      accessibilityState={{ disabled: !ready || already }}
      className={cn(
        'h-12 flex-row items-center justify-center gap-1.5 rounded-card px-7',
        already
          ? 'border border-brand bg-brand-soft'
          : ready
            ? 'bg-brand active:bg-brand-deep active:opacity-100'
            : 'bg-surface'
      )}
    >
      {already ? <Icon as={Check} className="size-4 text-brand" /> : null}
      <Text
        className={cn(
          'text-base font-semibold',
          already ? 'text-brand' : ready ? 'text-white' : 'text-muted'
        )}
      >
        {already ? 'Added' : 'Add to cart'}
      </Text>
    </Tappable>
  )

  // The way to add it, for as long as the sheet is open: waits for the
  // choices above, then adds; once anything of this service is in the
  // cart, the way to it sits beside.
  return page ? (
    <StickyCTA detail={footerDetail}>{footerButton}</StickyCTA>
  ) : (
    <View
      className="flex-row items-center gap-3 border-t border-border bg-bg px-5 pt-3"
      style={{ paddingBottom: 12 + insets.bottom }}
    >
      {footerDetail}
      {footerButton}
    </View>
  )
}
