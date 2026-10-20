import { useEffect, useState } from 'react'
import { View } from 'react-native'
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

import { usePrefersReducedMotion } from '@/components/ServiceClip'
import { Img } from '@/components/ui/Img'
import { Tappable } from '@/components/ui/Tappable'

/** How long each photograph shows before the next. */
const PHOTO_MS = 4000

/**
 * The photographs across the top, one at a time, with a bar per photograph
 * along the foot that fills while it shows — the same hand-on as the banner
 * on the appliance page, and none at all for somebody who asked for less
 * motion.
 */
export function PhotoStrip({ photos }: { photos: readonly string[] }) {
  const [index, setIndex] = useState(0)
  const reducedMotion = usePrefersReducedMotion()
  const count = photos.length

  useEffect(() => {
    if (reducedMotion || count < 2) return
    const timer = setTimeout(() => setIndex((i) => (i + 1) % count), PHOTO_MS)
    return () => clearTimeout(timer)
  }, [index, count, reducedMotion])

  if (count === 0) return <View className="h-6" />

  return (
    <View className="relative aspect-[16/11] overflow-hidden bg-plate">
      {photos.map((photo, i) => (
        <FadePhoto key={photo} src={photo} on={i === index} priority={i === 0} />
      ))}
      {count > 1 ? (
        <View className="absolute inset-x-5 bottom-3 flex-row gap-2">
          {photos.map((photo, i) => (
            <Tappable
              key={photo}
              onPress={() => setIndex(i)}
              accessibilityLabel={`Show photo ${i + 1} of ${count}`}
              accessibilityState={{ selected: i === index }}
              className="h-6 flex-1 justify-center active:opacity-100"
            >
              <View className="h-1 w-full overflow-hidden rounded-pill bg-white/40">
                <ProgressFill
                  key={i === index ? `on-${index}` : 'off'}
                  state={i === index ? (reducedMotion ? 'full' : 'running') : i < index ? 'full' : 'empty'}
                />
              </View>
            </Tappable>
          ))}
        </View>
      ) : null}
    </View>
  )
}

/** One photograph in the strip, cross-fading in and out. */
function FadePhoto({ src, on, priority }: { src: string; on: boolean; priority: boolean }) {
  const opacity = useSharedValue(on ? 1 : 0)
  useEffect(() => {
    opacity.value = withTiming(on ? 1 : 0, { duration: 500, reduceMotion: ReduceMotion.System })
  }, [on, opacity])
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }))
  return (
    <Animated.View style={style} className="absolute inset-0">
      <Img src={src} alt="" priority={priority ? 'high' : 'normal'} className="size-full" />
    </Animated.View>
  )
}

/** The white fill of one bar: empty, full, or filling over the photograph's turn. */
function ProgressFill({ state }: { state: 'empty' | 'full' | 'running' }) {
  const progress = useSharedValue(state === 'full' ? 1 : 0)
  useEffect(() => {
    if (state !== 'running') return
    progress.value = withTiming(1, {
      duration: PHOTO_MS,
      easing: Easing.linear,
      reduceMotion: ReduceMotion.System,
    })
  }, [state, progress])
  const style = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }))
  return <Animated.View style={style} className="h-full rounded-pill bg-white" />
}
