import { useEffect } from 'react'
import Animated, { Easing, ReduceMotion, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated'

/** The web's `animate-blink`: a live dot that fades to 35% and back. */
export function Blink({ className }: { className?: string }) {
  const o = useSharedValue(1)
  useEffect(() => {
    o.value = withRepeat(withTiming(0.35, { duration: 600, easing: Easing.inOut(Easing.ease), reduceMotion: ReduceMotion.System }), -1, true)
    return () => cancelAnimation(o)
  }, [o])
  const style = useAnimatedStyle(() => ({ opacity: o.value }))
  return <Animated.View className={className} style={style} />
}
