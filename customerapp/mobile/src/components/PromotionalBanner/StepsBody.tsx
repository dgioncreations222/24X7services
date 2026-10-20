import { View } from 'react-native'
import Animated, { useAnimatedStyle } from 'react-native-reanimated'
import type { Banner } from '@app/shared'
import { Text } from '@/components/ui/Text'
import { cn } from '@/lib/cn'
import { CtaPill, Play, WordHeadline, usePlay } from '@/components/PromotionalBanner/motion'
import { StoryGround } from '@/components/PromotionalBanner/StoryGround'
import { useToneEdge } from '@/components/PromotionalBanner/tones'

/**
 * A story banner told as a line of steps: the headline, then the steps in a
 * row joined by a line that fills from the first to the last, each step's
 * dot popping in with a tick as the line reaches it. For a promise that is
 * an order of events: inspect, quote, your yes, then repair.
 */
export function StepsBody({
  banner,
  steps,
  edgeToEdge,
  moving,
  className,
}: {
  banner: Banner
  steps: readonly string[]
  edgeToEdge: boolean
  moving: boolean
  className?: string
}) {
  const title = [banner.title, banner.titleAfter].filter(Boolean).join(' ')
  const start = title.split(' ').length * 0.07 + 0.35 // the line starts once the headline is up
  const each = 0.55 // seconds the line takes from one step to the next
  const last = steps.length - 1
  const [toneTop] = useToneEdge(banner.tone)
  // The rail runs between the first and the last dot: half a column in from each side.
  const inset = `${50 / steps.length}%` as const

  return (
    <StoryGround banner={banner} edgeToEdge={edgeToEdge} className={cn('justify-center px-4 py-5', className)}>
      <WordHeadline title={title} moving={moving} textClassName="text-[22px] leading-[28px]" />

      <View className="relative mt-4 flex-row">
        <View
          aria-hidden
          className="absolute top-3 h-0.5 rounded-pill bg-white/25"
          style={{ left: inset, right: inset }}
        />
        <StepsLine moving={moving} start={start} duration={each * last} inset={inset} />
        {steps.map((step, index) => (
          <View key={step} className="relative min-w-0 flex-1 items-center">
            <Play
              moving={moving}
              kind="node"
              delay={start + index * each}
              duration={420}
              className="size-6 items-center justify-center rounded-full bg-white"
            >
              <Text className="text-xs font-bold" style={{ color: toneTop }}>
                ✓
              </Text>
            </Play>
            <Play moving={moving} kind="rise" delay={start + index * each + 0.1} duration={420}>
              <Text className="mt-2 text-center text-xs font-medium leading-[15px] text-white/90">{step}</Text>
            </Play>
          </View>
        ))}
      </View>

      {banner.ctaLabel ? (
        <Play moving={moving} kind="rise" delay={start + last * each + 0.5} duration={520} className="mt-4 self-start">
          <CtaPill label={banner.ctaLabel} />
        </Play>
      ) : null}
    </StoryGround>
  )
}

/** The white line between the steps, filling left to right (story-line). */
function StepsLine({
  moving,
  start,
  duration,
  inset,
}: {
  moving: boolean
  start: number
  duration: number
  inset: `${number}%`
}) {
  const progress = usePlay(moving, Math.round(start * 1000), Math.round(duration * 1000), true)
  const style = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }))
  return (
    <View aria-hidden className="absolute top-3 h-0.5" style={{ left: inset, right: inset }}>
      <Animated.View style={style} className="h-0.5 rounded-pill bg-white" />
    </View>
  )
}
