import { LinearGradient } from 'expo-linear-gradient'
import type { BannerTone } from '@app/shared'
import { useColor } from '@/components/ui/Icon'
import { useTokenColors } from '@/lib/useTokenColors'

/**
 * A tone's gradient, deep to light, from the fixed tone-* tokens in
 * global.css. Home paints it top to bottom behind the header and the banner
 * together, as one block, and the header over an edge-to-edge banner takes the
 * first stop, so the two read as one. Fixed rather than theme tokens because
 * `brand-deep` lightens in the dark theme and the seam would show.
 *
 * The stops of a `LinearGradient` rather than the web's class string: a
 * gradient is not a className here.
 */
export function useToneEdge(tone: BannerTone): readonly [string, string, string] {
  return useTokenColors([`tone-${tone}-1`, `tone-${tone}-2`, `tone-${tone}-3`] as const)
}

/**
 * The five house gradients a card can be painted in, corner to corner.
 *
 * Content colour, not interface colour: brand blue means "this is tappable"
 * everywhere else in the app, and these mean nothing at all beyond telling one
 * offer apart from the next as it slides past. Blue starts from the brand's
 * own tokens, so it follows the theme the way the web card does.
 */
function useToneStops(tone: BannerTone): readonly [string, string, string] {
  const deep = useColor('text-brand-deep')
  const brand = useColor('text-brand')
  const edge = useToneEdge(tone)
  return tone === 'blue' ? [deep, brand, edge[2]] : edge
}

/** The card's own ground: a gradient corner to corner, rounded. */
export function ToneGround({ tone }: { tone: BannerTone }) {
  const stops = useToneStops(tone)
  return (
    <LinearGradient
      colors={stops}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
    />
  )
}
