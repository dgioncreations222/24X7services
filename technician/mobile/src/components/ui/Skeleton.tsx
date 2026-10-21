import { useEffect } from 'react'
import { View } from 'react-native'
import Animated, { Easing, ReduceMotion, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated'
import { cn } from '@/lib/cn'

/**
 * A grey placeholder in the shape of what is loading. Size it with classes
 * (`h-4 w-2/3`), never fixed pixels, so it follows the screen like the real
 * content will. Pulses unless the phone asks for reduced motion.
 */
export function Skeleton({ className }: { className?: string }) {
  const o = useSharedValue(1)
  useEffect(() => {
    o.value = withRepeat(withTiming(0.45, { duration: 700, easing: Easing.inOut(Easing.ease), reduceMotion: ReduceMotion.System }), -1, true)
    return () => cancelAnimation(o)
  }, [o])
  const style = useAnimatedStyle(() => ({ opacity: o.value }))
  return <Animated.View importantForAccessibility="no-hide-descendants" className={cn('rounded-lg bg-line', className)} style={style} />
}

/** A card-shaped placeholder: a title line, a sub line and a footer row. */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <View className={cn('gap-3 rounded-card border border-line bg-card p-4', className)}>
      <View className="flex-row items-center gap-3">
        <Skeleton className="size-11 rounded-xl" />
        <View className="flex-1 gap-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </View>
      </View>
      <Skeleton className="h-10 w-full rounded-xl" />
    </View>
  )
}

/** `rows` card placeholders, for a list that is still loading. */
export function SkeletonList({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <View accessibilityLabel="Loading" accessibilityRole="progressbar" className={cn('gap-3', className)}>
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  )
}
