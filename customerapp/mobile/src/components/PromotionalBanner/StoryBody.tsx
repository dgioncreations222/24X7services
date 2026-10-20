import { useEffect } from 'react'
import { View, type ViewStyle } from 'react-native'
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import type { Banner } from '@app/shared'
import { Text } from '@/components/ui/Text'
import { cn } from '@/lib/cn'
import { EASE, Play, SYSTEM } from '@/components/PromotionalBanner/motion'
import { StoryGround } from '@/components/PromotionalBanner/StoryGround'

/**
 * Where each chip floats, as fractions of the slide: two bands, above and
 * below the headline's row, kept to the corners — the headline can run to two
 * lines — and the lower right one clear of the dots.
 */
const SPOTS: ViewStyle[] = [
  { left: '5%', top: '5%' },
  { right: '4%', top: '3%' },
  { left: '4%', bottom: '6%' },
  { right: '24%', bottom: '4%' },
  { left: '40%', top: '2%' },
  { left: '36%', bottom: '2%' },
]

/** Seconds: when the chips go and the answer arrives. */
const LEAVE = 3.6

/**
 * A banner told as a short story, the way the marketplaces open Home: the
 * problems float in around the middle as chips and drift there, the headline
 * rises in — "4 problems." — then the chips fade and the answer arrives beside
 * it — "1 visit." — with the way in under them.
 *
 * Played once each time the slide arrives, and held on its last frame.
 * Somebody who asked for less motion gets that last frame straight away.
 */
export function StoryBody({
  banner,
  chips,
  edgeToEdge,
  moving,
  className,
}: {
  banner: Banner
  chips: readonly string[]
  edgeToEdge: boolean
  moving: boolean
  className?: string
}) {
  return (
    <StoryGround
      banner={banner}
      edgeToEdge={edgeToEdge}
      className={cn('items-center justify-center px-4 py-8', className)}
    >
      {/* Still, with no story to tell, the chips are not shown at all. */}
      {moving ? chips.map((chip, index) => <StoryChip key={chip} chip={chip} index={index} />) : null}

      <View
        accessible
        accessibilityRole="header"
        accessibilityLabel={[banner.title, banner.titleAfter].filter(Boolean).join(' ')}
        className="relative flex-row flex-wrap justify-center"
        style={{ columnGap: 8 }}
      >
        <Play moving={moving} kind="word" delay={0.5} duration={700}>
          <Text className="text-center text-[28px] font-bold leading-[34px] text-white/90">{banner.title}</Text>
        </Play>
        {banner.titleAfter ? (
          <Play moving={moving} kind="word" delay={LEAVE + 0.3} duration={700}>
            <Text className="text-center text-[28px] font-bold leading-[34px] text-white">{banner.titleAfter}</Text>
          </Play>
        ) : null}
      </View>

      {banner.ctaLabel ? (
        <Play moving={moving} kind="rise" delay={LEAVE + 0.9} duration={520} className="relative mt-3">
          <Text className="text-base font-semibold text-white/75">
            {banner.ctaLabel}
            {'  →'}
          </Text>
        </Play>
      ) : null}
    </StoryGround>
  )
}

/** One problem, floating in, drifting while it is read, then fading. */
function StoryChip({ chip, index }: { chip: string; index: number }) {
  // 0 → 1 is arriving (story-chip-in), 1 → 2 is leaving (story-chip-out).
  const phase = useSharedValue(0)
  const drift = useSharedValue(0)

  useEffect(() => {
    const inAt = (0.15 + index * 0.35) * 1000
    const outAt = (LEAVE + index * 0.08) * 1000
    phase.value = 0
    phase.value = withSequence(
      withDelay(inAt, withTiming(1, { duration: 600, easing: EASE, reduceMotion: SYSTEM }), SYSTEM),
      withDelay(
        Math.max(0, outAt - inAt - 600),
        withTiming(2, { duration: 500, easing: Easing.in(Easing.ease), reduceMotion: SYSTEM }),
        SYSTEM
      )
    )
    drift.value = 0
    drift.value = withDelay(
      (0.8 + index * 0.35) * 1000,
      withRepeat(
        withSequence(
          withTiming(-5, { duration: 1600, easing: Easing.inOut(Easing.ease), reduceMotion: SYSTEM }),
          withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.ease), reduceMotion: SYSTEM })
        ),
        -1,
        false,
        undefined,
        SYSTEM
      ),
      SYSTEM
    )
  }, [index, phase, drift])

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(phase.value, [0, 1, 2], [0, 1, 0]),
    transform: [
      { translateY: drift.value },
      { scale: interpolate(phase.value, [0, 1, 2], [0.82, 1, 0.92]) },
    ],
  }))

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ position: 'absolute' }, SPOTS[index % SPOTS.length], style]}
      className="rounded-pill border border-white/30 bg-white/10 px-3 py-1.5"
    >
      <Text numberOfLines={1} className="text-sm font-medium text-white">
        {chip}
      </Text>
    </Animated.View>
  )
}
