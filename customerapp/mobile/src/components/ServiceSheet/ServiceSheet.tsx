import { useState } from 'react'
import {
  Modal as RNModal,
  Pressable,
  View,
  useWindowDimensions,
} from 'react-native'
import { X } from 'lucide-react-native'
import type {
  CatalogAppliance,
  CatalogIssue,
  CatalogService,
} from '@app/shared'

import { ServiceDetails } from '@/components/ServiceSheet/ServiceDetails'
import { Icon } from '@/components/ui/Icon'
import { Tappable } from '@/components/ui/Tappable'

/**
 * A service, opened over the page it was tapped on — the way the marketplaces
 * open one: photographs across the top, the name and what it starts at, the
 * choices it needs, then everything worth knowing before booking it, in the
 * order somebody asks: how it goes, who comes, which brands, what stands
 * behind it, what it does not cover, the usual questions, and what other
 * people made of it.
 *
 * The choices are steps. A repair is booked for a problem, so the first step
 * is which one; every appliance with a kind — front-load or top-load, split or
 * window — asks that next. A step opens once the one before it is answered,
 * and Add at the foot waits for both. The kind rides along in the cart and
 * opens the booking's details step already chosen; it is not decoration.
 *
 * Every line comes from the catalog entry, the business config, the brands
 * list or the reviews written for this service. Nothing is a number made up
 * to fill a slot the marketplaces happen to have.
 */

export interface ServiceSheetProps {
  /** The service that is open, or null when the sheet is closed. */
  service: CatalogService | null
  appliance?: CatalogAppliance
  /** Every service in the catalog. */
  services: readonly CatalogService[]
  issues: readonly CatalogIssue[]
  /** The kind of machine already chosen on the page, picked in advance here. */
  initialKind?: string | null
  onClose: () => void
}

/**
 * Built on the system Modal rather than BottomSheet: the photographs run to
 * the panel's top edge with no title bar above them, and the close button
 * hangs above the panel, on the backdrop, where scrolled content can never
 * slide underneath it.
 */
export function ServiceSheet({
  service,
  appliance,
  issues,
  initialKind,
  onClose,
}: ServiceSheetProps) {
  const { height } = useWindowDimensions()
  // The sheet keeps the last service while it slides away, so the panel does
  // not empty itself mid-animation.
  const [shown, setShown] = useState<CatalogService | null>(service)
  if (service !== null && service !== shown) setShown(service)
  const current = service ?? shown

  return (
    <RNModal
      visible={service !== null}
      transparent
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end">
        <Pressable
          accessibilityLabel="Close"
          className="absolute inset-0 bg-night/40"
          onPress={onClose}
        />
        {current ? (
          // The frame: room on top for the close button, so it is inside the
          // touchable area on Android rather than hanging outside the panel.
          <View pointerEvents="box-none" className="w-full pt-14">
            <Tappable
              onPress={onClose}
              accessibilityLabel="Close"
              className="absolute right-4 top-0 z-10 size-11 items-center justify-center rounded-full bg-bg shadow-md active:bg-surface active:opacity-100"
            >
              <Icon as={X} className="size-5 text-ink" />
            </Tappable>
            <View accessibilityViewIsModal style={{ maxHeight: height * 0.88 }}>
              {/* Keyed, so opening another service starts its choices afresh. */}
              <ServiceDetails
                key={current.id}
                variant="sheet"
                service={current}
                appliance={appliance}
                issues={issues}
                initialKind={initialKind}
                onClose={onClose}
              />
            </View>
          </View>
        ) : null}
      </View>
    </RNModal>
  )
}
