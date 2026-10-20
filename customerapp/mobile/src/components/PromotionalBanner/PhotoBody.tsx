import { View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import type { Banner } from '@app/shared'
import { useColor } from '@/components/ui/Icon'
import { Img } from '@/components/ui/Img'
import { Text } from '@/components/ui/Text'
import { cn } from '@/lib/cn'

/**
 * A banner that is a photograph: the words on the left, a technician at work
 * on the right, the column's inner edge fading into the card.
 *
 * `plate` and `night` rather than `bg` and `ink`: the photograph is a light
 * room in either theme, so the card stays light and its words stay dark.
 */
export function PhotoBody({
  banner,
  photo,
  priority,
  className,
}: {
  banner: Banner
  photo: string
  priority: boolean
  className?: string
}) {
  const plate = useColor('text-plate')
  return (
    <View className={cn('relative h-full min-h-52 flex-row overflow-hidden rounded-card bg-plate p-5', className)}>
      <View className="absolute inset-y-0 right-0 w-[46%]">
        <Img
          src={photo}
          alt=""
          priority={priority ? 'high' : 'normal'}
          // The technician stands a little right of centre in every one of
          // these shots, with the appliance beyond them.
          contentPosition={{ left: '68%', top: '50%' }}
          className="absolute inset-0"
        />
        <LinearGradient
          colors={[plate, `${plate}00`]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '25%' }}
        />
      </View>

      <View className="relative w-[54%] min-w-0 justify-between gap-4 pr-2">
        <View>
          {banner.badge ? (
            <View className="mb-2.5 self-start rounded-pill bg-royal px-2.5 py-1">
              <Text className="text-[11px] font-semibold uppercase tracking-[0.66px] text-white">{banner.badge}</Text>
            </View>
          ) : null}
          <Text className="text-xl font-bold leading-[28px] text-night">{banner.title}</Text>
          {banner.subtitle ? (
            <Text numberOfLines={3} className="mt-1.5 text-sm text-night/70">
              {banner.subtitle}
            </Text>
          ) : null}
        </View>

        {banner.ctaLabel ? (
          <View className="self-start rounded-pill bg-royal px-4 py-2">
            <Text className="text-sm font-semibold text-white">{banner.ctaLabel}</Text>
          </View>
        ) : null}
      </View>
    </View>
  )
}
