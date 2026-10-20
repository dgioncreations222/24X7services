import { useEffect } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import Animated, {
  Easing,
  ReduceMotion,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { Text } from '@/components/ui/Text'
import { cn } from '@/lib/cn'

// ---------------------------------------------------------------------------
// Motion — the web's keyframes, played with reanimated. Every timing carries
// ReduceMotion.System, so somebody who asked for less motion gets each one's
// end state straight away, exactly as the web's reduced-motion rule does.
// ---------------------------------------------------------------------------

export const EASE = Easing.bezier(0.2, 0.7, 0.2, 1)
export const SYSTEM = ReduceMotion.System

type Kind = 'word' | 'rise' | 'art' | 'node'

/**
 * A 0 → 1 progress that plays from the start each time `moving` turns on, and
 * sits at its end otherwise — an off-screen slide holds still, so arriving
 * again plays it again.
 */
export function usePlay(moving: boolean, delayMs: number, durationMs: number, linear = false): SharedValue<number> {
  const progress = useSharedValue(moving ? 0 : 1)
  useEffect(() => {
    if (!moving) {
      progress.value = 1
      return
    }
    progress.value = 0
    progress.value = withDelay(
      delayMs,
      withTiming(1, { duration: durationMs, easing: linear ? Easing.linear : EASE, reduceMotion: SYSTEM }),
      SYSTEM
    )
  }, [moving, delayMs, durationMs, linear, progress])
  return progress
}

/**
 * One element of a slide, playing in:
 * `word` (banner-word) rises out of nothing, `rise` (banner-rise) comes up
 * 10px, `art` (banner-art-in) settles from a little smaller, `node`
 * (story-node) pops past its size and back.
 */
export function Play({
  moving,
  kind,
  delay = 0,
  duration,
  className,
  style,
  children,
}: {
  moving: boolean
  kind: Kind
  /** Seconds, as the web's animation-delay. */
  delay?: number
  /** Milliseconds. */
  duration: number
  className?: string
  style?: StyleProp<ViewStyle>
  children?: React.ReactNode
}) {
  const progress = usePlay(moving, Math.round(delay * 1000), duration)
  const animated = useAnimatedStyle(() => {
    const p = progress.value
    switch (kind) {
      case 'word':
        return { opacity: p, transform: [{ translateY: (1 - p) * 10 }] }
      case 'rise':
        return { opacity: p, transform: [{ translateY: (1 - p) * 10 }] }
      case 'art':
        return { opacity: p, transform: [{ translateY: (1 - p) * 8 }, { scale: 0.86 + 0.14 * p }] }
      case 'node':
        return {
          opacity: interpolate(p, [0, 0.7, 1], [0, 1, 1]),
          transform: [{ scale: interpolate(p, [0, 0.7, 1], [0.4, 1.12, 1]) }],
        }
    }
  })
  return (
    <Animated.View style={[style, animated]} className={className}>
      {children}
    </Animated.View>
  )
}

/** A headline that rises in word by word, read whole by a screen reader. */
export function WordHeadline({
  title,
  moving,
  className,
  textClassName,
}: {
  title: string
  moving: boolean
  className?: string
  textClassName?: string
}) {
  const words = title.split(' ')
  if (!moving) {
    return (
      <Text accessibilityRole="header" className={cn('font-bold text-white', textClassName)}>
        {title}
      </Text>
    )
  }
  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel={title}
      className={cn('flex-row flex-wrap', className)}
      style={{ columnGap: 6 }}
    >
      {words.map((word, index) => (
        <Play key={`${word}-${index}`} moving={moving} kind="word" delay={index * 0.07} duration={620}>
          <Text className={cn('font-bold text-white', textClassName)}>{word}</Text>
        </Play>
      ))}
    </View>
  )
}

/** A soft band of light drifting across the ground, now and then. */
export function Sheen({ width }: { width: number }) {
  const progress = useSharedValue(0)
  useEffect(() => {
    progress.value = 0
    progress.value = withDelay(
      1200,
      withRepeat(
        withTiming(1, { duration: 5500, easing: Easing.inOut(Easing.ease), reduceMotion: SYSTEM }),
        -1,
        false,
        undefined,
        SYSTEM
      ),
      SYSTEM
    )
  }, [progress])
  const band = width / 3
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: band * (-0.6 + 3.2 * progress.value) }, { skewX: '-18deg' }],
  }))
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', top: 0, bottom: 0, left: 0, width: band }, style]}
    >
      <LinearGradient
        colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.12)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ flex: 1 }}
      />
    </Animated.View>
  )
}

/** The artwork's slow bob once it has settled. */
export function Float({ moving, children }: { moving: boolean; children: React.ReactNode }) {
  const y = useSharedValue(0)
  useEffect(() => {
    y.value = 0
    if (!moving) return
    y.value = withDelay(
      900,
      withRepeat(
        withSequence(
          withTiming(-7, { duration: 2250, easing: Easing.inOut(Easing.ease), reduceMotion: SYSTEM }),
          withTiming(0, { duration: 2250, easing: Easing.inOut(Easing.ease), reduceMotion: SYSTEM })
        ),
        -1,
        false,
        undefined,
        SYSTEM
      ),
      SYSTEM
    )
  }, [moving, y])
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }))
  return (
    <Animated.View style={[{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }, style]}>
      {children}
    </Animated.View>
  )
}

/** The white pill with the call to action in brand blue. */
export function CtaPill({ label }: { label: string }) {
  return (
    <View className="self-start rounded-pill bg-white px-4 py-2">
      <Text className="text-sm font-semibold text-royal">{label}</Text>
    </View>
  )
}
