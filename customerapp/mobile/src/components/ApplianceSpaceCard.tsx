import { View } from 'react-native'
import type { Href } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { Star } from 'lucide-react-native'
import type { CatalogAppliance } from '@app/shared'
import { cn } from '@/lib/cn'
import { Icon } from '@/components/ui/Icon'
import { Img } from '@/components/ui/Img'
import { Tappable } from '@/components/ui/Tappable'
import { Text } from '@/components/ui/Text'

/**
 * An appliance as a tall photograph with its name across the foot — the card
 * on the Services rail. The picture does the selling and the words sit on a
 * dark wash at the bottom, so the white type reads on any photo.
 *
 * The photo is the appliance's hero shot (a technician at work on it) and
 * falls back to the product tile, contained on a plate, for an appliance
 * nobody has photographed yet.
 */
export function ApplianceSpaceCard({
  appliance,
  serviceCount,
  from,
  rating,
  priority = false,
  className,
}: {
  appliance: Pick<CatalogAppliance, 'id' | 'name' | 'image' | 'heroImage'>
  serviceCount: number
  /** The lowest visit fee, already formatted. */
  from?: string
  rating?: number
  priority?: boolean
  className?: string
}) {
  const photo = appliance.heroImage
  return (
    <Tappable
      href={`/services/appliance?a=${appliance.id}` as Href}
      accessibilityLabel={`${appliance.name}, ${serviceCount} services${from ? `, from ${from}` : ''}`}
      className={cn('aspect-[3/4] overflow-hidden rounded-card bg-plate active:opacity-90', className)}
    >
      <Img
        src={photo ?? appliance.image}
        alt=""
        contentFit={photo ? 'cover' : 'contain'}
        priority={priority ? 'high' : 'normal'}
        className={photo ? 'absolute inset-0' : 'absolute inset-6'}
      />
      <LinearGradient
        colors={['rgba(23,21,15,0)', 'rgba(23,21,15,0.4)', 'rgba(23,21,15,0.85)']}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%' }}
        pointerEvents="none"
      />
      <View className="absolute inset-x-0 bottom-0 p-3.5">
        <Text numberOfLines={2} className="text-xl font-bold leading-[26px] text-white">
          {appliance.name}
        </Text>
        {rating !== undefined ? (
          <View className="mt-1 flex-row items-center gap-1">
            <Icon as={Star} className="size-3 text-white" filled />
            <Text className="text-xs font-semibold text-white">{rating.toFixed(1)}</Text>
          </View>
        ) : null}
        <Text className="mt-0.5 text-xs text-white/85">
          {serviceCount} {serviceCount === 1 ? 'service' : 'services'}
          {from ? ` · from ${from}` : ''}
        </Text>
      </View>
    </Tappable>
  )
}
