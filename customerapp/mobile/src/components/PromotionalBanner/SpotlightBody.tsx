import { useEffect } from 'react'
import { View } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import type { Banner } from '@app/shared'
import { Img } from '@/components/ui/Img'
import { Text } from '@/components/ui/Text'
import { cn } from '@/lib/cn'
import { CtaPill, Play, SYSTEM, WordHeadline } from '@/components/PromotionalBanner/motion'
import { StoryGround } from '@/components/PromotionalBanner/StoryGround'

/**
 * A story banner told as a spotlight: the headline word by word on the left
 * with its points ticked in under it one at a time, and the artwork on the
 * right settling in while rings of light pulse out from behind it. For a
 * promise that is a thing you get: every repair, under warranty.
 */
export function SpotlightBody({
  banner,
  points,
  edgeToEdge,
  moving,
  priority,
  className,
}: {
  banner: Banner
  points: readonly string[]
  edgeToEdge: boolean
  moving: boolean
  priority: boolean
  className?: string
}) {
  const title = [banner.title, banner.titleAfter].filter(Boolean).join(' ')
  const after = title.split(' ').length * 0.07 + 0.25
  // Three at most: a fourth line makes this slide, and so the whole rail,
  // taller than the others need to be.
  const shown = points.slice(0, 3)

  return (
    <StoryGround
      banner={banner}
      edgeToEdge={edgeToEdge}
      className={cn('flex-row items-center gap-3 px-4 py-5', className)}
    >
      <View className="relative min-w-0 flex-1">
        <WordHeadline title={title} moving={moving} textClassName="text-[22px] leading-[28px]" />
        <View className="mt-2.5 gap-1">
          {shown.map((point, index) => (
            <Play
              key={point}
              moving={moving}
              kind="rise"
              delay={after + index * 0.32}
              duration={480}
              className="flex-row items-center gap-2"
            >
              <View className="size-4 shrink-0 items-center justify-center rounded-full bg-white/20">
                <Text className="text-[10px] leading-[12px] text-white">✓</Text>
              </View>
              <Text className="text-sm text-white/90">{point}</Text>
            </Play>
          ))}
        </View>
        {banner.ctaLabel ? (
          <Play
            moving={moving}
            kind="rise"
            delay={after + shown.length * 0.32 + 0.2}
            duration={520}
            className="mt-3.5 self-start"
          >
            <CtaPill label={banner.ctaLabel} />
          </Play>
        ) : null}
      </View>

      {banner.image ? (
        <View className="relative aspect-square w-[32%] shrink-0">
          {moving ? [0, 1, 2].map((ring) => <Ring key={ring} delay={0.6 + ring * 0.9} />) : null}
          <Play moving={moving} kind="art" delay={0.2} duration={700} className="absolute inset-[12%]">
            <Img
              src={banner.image}
              alt=""
              contentFit="contain"
              priority={priority ? 'high' : 'normal'}
              className="size-full"
            />
          </Play>
        </View>
      ) : null}
    </StoryGround>
  )
}

/** A ring of light pulsing out from behind the artwork (story-ring). */
function Ring({ delay }: { delay: number }) {
  // -1 is "not started": hidden, as the web's opacity-0 before the delay.
  const progress = useSharedValue(-1)
  useEffect(() => {
    progress.value = -1
    progress.value = withDelay(
      delay * 1000,
      withSequence(
        withTiming(0, { duration: 0 }),
        withRepeat(
          withTiming(1, { duration: 2700, easing: Easing.out(Easing.ease), reduceMotion: SYSTEM }),
          -1,
          false,
          undefined,
          SYSTEM
        )
      ),
      SYSTEM
    )
  }, [delay, progress])
  const style = useAnimatedStyle(() => {
    const p = progress.value
    if (p < 0) return { opacity: 0 }
    return { opacity: 0.55 * (1 - p), transform: [{ scale: 0.55 + 0.95 * p }] }
  })
  return (
    <Animated.View
      aria-hidden
      style={style}
      className="absolute inset-0 rounded-full border-2 border-white/40"
    />
  )
}
