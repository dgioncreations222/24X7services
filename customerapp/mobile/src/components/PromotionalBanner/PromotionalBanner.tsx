import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ScrollView,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native'
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import type { Banner, BannerTone } from '@app/shared'
import { usePrefersReducedMotion } from '@/components/ServiceClip'
import { Tappable } from '@/components/ui/Tappable'
import { cn } from '@/lib/cn'
import { BannerCard } from '@/components/PromotionalBanner/BannerCard'

/**
 * The banner rail at the top of Home: swipeable, with dots, and advancing on
 * its own.
 *
 * A paging scroll view, so the platform provides the swipe, the momentum and
 * the snap. Autoplay stops the moment anyone touches it and does not come
 * back — a rail that keeps moving while someone is reading it is worse than one
 * that never moved.
 *
 * The dots stay inside the artwork rather than under it: below it they push
 * everything down by the height of their own tap targets, and that gap reads
 * as a mistake rather than as a control.
 */

export interface PromotionalBannerProps {
  banners: readonly Banner[]
  intervalMs?: number
  /**
   * Edge to edge under a header painted the slide's own colour — the way the
   * marketplaces open Home. The header and the slide never share a pixel, so
   * the words cannot collide; the colour just runs on from one into the other.
   */
  edgeToEdge?: boolean
  /** The tone of the slide in view, for the header above to match. */
  onToneChange?: (tone: BannerTone) => void
  className?: string
}

export function PromotionalBanner({
  banners,
  intervalMs = 5000,
  edgeToEdge = false,
  onToneChange,
  className,
}: PromotionalBannerProps) {
  const railRef = useRef<ScrollView>(null)
  const { width: windowWidth } = useWindowDimensions()
  const [measured, setMeasured] = useState(0)
  // The slide is exactly as wide as the rail; until the rail has been laid
  // out, the screen is the best guess (the rail runs edge to edge on Home).
  const width = measured || windowWidth
  const [active, setActive] = useState(0)
  const [autoplay, setAutoplay] = useState(true)
  const reduced = usePrefersReducedMotion()

  // With more than one banner, the first is repeated after the last, so the
  // rail only ever moves forward: 1, 2, 3, then on into the copy of 1, which
  // is swapped for the real one without any motion once the rail comes to
  // rest there. Scrolling straight back to the start would run the whole rail
  // backwards past every slide in between.
  const looping = banners.length > 1

  const scrollTo = useCallback(
    (index: number, animated = true) => {
      railRef.current?.scrollTo({ x: index * width, animated })
    },
    [width]
  )

  // Track which slide is in view rather than assuming, since the customer can
  // swipe the rail themselves. Resting on the copy means resting on the first
  // slide, so jump there with no animation. The two look identical, so
  // nothing on screen changes.
  const onSettle = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = event.nativeEvent.contentOffset.x
      const index = Math.round(x / width)
      if (looping && index >= banners.length) {
        scrollTo(0, false)
        setActive(0)
        return
      }
      setActive(index % Math.max(banners.length, 1))
    },
    [banners.length, looping, scrollTo, width]
  )

  useEffect(() => {
    if (!autoplay || !looping || reduced) return

    // A story slide stays long enough to be told; the rest, the usual time.
    const dwell = banners[active]?.chips?.length ? STORY_MS : intervalMs
    const timer = setTimeout(() => {
      // From the last slide, on into the copy rather than back to the start.
      scrollTo(active + 1)
      setActive((active + 1) % banners.length)
    }, dwell)
    return () => clearTimeout(timer)
  }, [active, autoplay, banners, intervalMs, looping, reduced, scrollTo])

  // The rail's momentum end doesn't fire for a programmatic scroll on every
  // platform, so the swap from the copy back to the first slide is also done
  // once autoplay has landed on it.
  useEffect(() => {
    if (!looping || active !== 0) return
    const timer = setTimeout(() => scrollTo(0, false), 700)
    return () => clearTimeout(timer)
  }, [active, looping, scrollTo])

  const stopAutoplay = useCallback(() => setAutoplay(false), [])

  const tone = banners[active]?.tone
  useEffect(() => {
    if (tone) onToneChange?.(tone)
  }, [tone, onToneChange])

  if (banners.length === 0) return null

  return (
    <View
      accessibilityLabel="Offers and announcements"
      className={cn('relative', className)}
      onLayout={(event: LayoutChangeEvent) => setMeasured(Math.round(event.nativeEvent.layout.width))}
      onTouchStart={stopAutoplay}
    >
      <ScrollView
        ref={railRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScrollBeginDrag={stopAutoplay}
        onMomentumScrollEnd={onSettle}
        scrollEventThrottle={16}
      >
        {banners.map((banner, index) => (
          <View
            key={banner.id}
            accessibilityLabel={`${index + 1} of ${banners.length}`}
            style={{ width }}
          >
            <BannerCard
              banner={banner}
              priority={index === 0}
              edgeToEdge={edgeToEdge}
              active={index === active}
              width={width}
            />
          </View>
        ))}
        {looping && banners[0] ? (
          // The copy of the first slide. Hidden from assistive tech: it is
          // there for the motion, not as a fourth offer.
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{ width }}
          >
            <BannerCard banner={banners[0]} edgeToEdge={edgeToEdge} width={width} />
          </View>
        ) : null}
      </ScrollView>

      {banners.length > 1 ? (
        <View className={cn('absolute bottom-0 flex-row gap-1.5', edgeToEdge ? 'right-4' : 'right-2')}>
          {banners.map((banner, index) => (
            <Tappable
              key={banner.id}
              onPress={() => {
                stopAutoplay()
                scrollTo(index)
                setActive(index)
              }}
              accessibilityLabel={`Go to slide ${index + 1}`}
              accessibilityState={{ selected: index === active }}
              // 44px of tappable height around a 6px dot.
              className="h-11 w-4 items-center justify-center overflow-visible active:opacity-100"
            >
              {/* White over the artwork. A blue dot on a green banner is not a dot. */}
              <Dot on={index === active} />
            </Tappable>
          ))}
        </View>
      ) : null}
    </View>
  )
}

/** A dot, stretching into a bar while its slide is the one in view. */
function Dot({ on }: { on: boolean }) {
  const progress = useSharedValue(on ? 1 : 0)
  useEffect(() => {
    progress.value = withTiming(on ? 1 : 0, { duration: 200, reduceMotion: ReduceMotion.System })
  }, [on, progress])
  const style = useAnimatedStyle(() => ({
    width: 6 + 14 * progress.value,
    opacity: 0.45 + 0.55 * progress.value,
  }))
  return <Animated.View style={style} className="h-1.5 rounded-full bg-white" />
}

/** How long a story slide stays: its chips, its answer, a moment to read. */
const STORY_MS = 8000
