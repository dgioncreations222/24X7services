import { View, useWindowDimensions } from 'react-native'
import type { Href } from 'expo-router'
import type { Banner } from '@app/shared'
import { Img } from '@/components/ui/Img'
import { Tappable } from '@/components/ui/Tappable'
import { Text } from '@/components/ui/Text'
import { cn } from '@/lib/cn'
import { ToneGround } from '@/components/PromotionalBanner/tones'
import { CtaPill, Float, Play, Sheen, WordHeadline } from '@/components/PromotionalBanner/motion'
import { PhotoBody } from '@/components/PromotionalBanner/PhotoBody'
import { StoryBody } from '@/components/PromotionalBanner/StoryBody'
import { StepsBody } from '@/components/PromotionalBanner/StepsBody'
import { SpotlightBody } from '@/components/PromotionalBanner/SpotlightBody'

/**
 * One banner, as a card.
 *
 * Exported because the same card does a second job further down the page: a
 * banner seeded into the `inline` slot is dropped between two sections on its
 * own, which is what breaks a long run of near-identical service rails into
 * something with a shape.
 *
 * The words and the picture are two columns of a row, not two layers of a
 * stack, so they cannot overlap at any size. The ground under the text is one
 * of five gradients this file controls, and the seeded artwork is a subject on
 * transparency that never goes behind a word — so no scrim.
 *
 * Its height comes from its content and from whatever the rail stretches it to,
 * with a floor under it.
 */
export function BannerCard({
  banner,
  priority = false,
  edgeToEdge = false,
  active = false,
  width,
  className,
}: {
  banner: Banner
  priority?: boolean
  /** Square-cornered, no ground of its own (Home paints it), and shorter. */
  edgeToEdge?: boolean
  /**
   * The slide in view. Edge to edge, it plays in like footage each time it
   * arrives: the headline word by word, then the lines under it, the artwork
   * settling and floating, a light drifting across. Off-screen slides hold
   * still, so arriving again plays it again.
   */
  active?: boolean
  /** The slide's width, for the light drifting across it. */
  width?: number
  className?: string
}) {
  const { width: windowWidth } = useWindowDimensions()
  const slideWidth = width ?? windowWidth - 32
  const moving = edgeToEdge && active
  const words = banner.title.split(' ')
  // When the lines under the headline follow: once its last word is up.
  const after = (words.length * 70 + 120) / 1000

  const body =
    banner.chips?.length && banner.motion === 'steps' ? (
      <StepsBody banner={banner} steps={banner.chips} edgeToEdge={edgeToEdge} moving={moving} className={className} />
    ) : banner.chips?.length && banner.motion === 'spotlight' ? (
      <SpotlightBody
        banner={banner}
        points={banner.chips}
        edgeToEdge={edgeToEdge}
        moving={moving}
        priority={priority}
        className={className}
      />
    ) : banner.chips?.length ? (
      <StoryBody banner={banner} chips={banner.chips} edgeToEdge={edgeToEdge} moving={moving} className={className} />
    ) : banner.photo ? (
      <PhotoBody banner={banner} photo={banner.photo} priority={priority} className={className} />
    ) : (
      <View
        className={cn(
          'relative h-full min-h-52 flex-row gap-5 overflow-hidden rounded-card p-5',
          // No ground of its own edge to edge: Home paints one gradient
          // behind the header and this card together.
          edgeToEdge && 'min-h-48 rounded-none px-4 pb-7 pt-4',
          className
        )}
      >
        {edgeToEdge ? null : <ToneGround tone={banner.tone} />}
        {moving ? <Sheen width={slideWidth} /> : null}

        <View className="relative min-w-0 flex-1 justify-between gap-4">
          <View>
            {banner.badge ? (
              <Play moving={moving} kind="rise" duration={520} className="mb-2.5 self-start">
                <View className="rounded-pill bg-white/20 px-2.5 py-1">
                  <Text className="text-[11px] font-semibold uppercase tracking-[0.66px] text-white">
                    {banner.badge}
                  </Text>
                </View>
              </Play>
            ) : null}
            <WordHeadline
              title={banner.title}
              moving={moving}
              textClassName={edgeToEdge ? 'text-[22px] leading-[28px]' : 'text-xl leading-[28px]'}
            />
            {banner.subtitle ? (
              <Play moving={moving} kind="rise" delay={after} duration={520}>
                <Text numberOfLines={3} className="mt-1.5 text-sm text-white/80">
                  {banner.subtitle}
                </Text>
              </Play>
            ) : null}
          </View>

          {banner.ctaLabel ? (
            <Play moving={moving} kind="rise" delay={after + 0.14} duration={520}>
              <CtaPill label={banner.ctaLabel} />
            </Play>
          ) : null}
        </View>

        {banner.image ? (
          // Under a third, and a full gutter clear of the words.
          <Play moving={moving} kind="art" delay={0.15} duration={700} className="relative w-[30%] shrink-0">
            <Float moving={moving}>
              <Img src={banner.image} alt="" contentFit="contain" contentPosition="right" className="size-full" />
            </Float>
          </Play>
        ) : null}
      </View>
    )

  return banner.ctaHref ? (
    <Tappable href={banner.ctaHref as Href} accessibilityLabel={bannerLabel(banner)} className="h-full active:opacity-90">
      {body}
    </Tappable>
  ) : (
    body
  )
}

/** The whole banner read as one sentence, for the link around it. */
function bannerLabel(banner: Banner): string {
  return [
    [banner.title, banner.titleAfter].filter(Boolean).join(' '),
    banner.subtitle,
    banner.ctaLabel,
  ]
    .filter(Boolean)
    .join('. ')
}
