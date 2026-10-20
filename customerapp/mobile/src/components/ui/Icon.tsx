import type { LucideIcon } from 'lucide-react-native'
import { useResolveClassNames } from 'uniwind'
import { cn } from '@/lib/cn'

/**
 * A lucide icon, sized and coloured with the same classes the web app uses:
 * `<Icon as={ArrowLeft} className="size-5 text-brand" />`.
 *
 * lucide-react-native takes `size` and `color` props rather than a className,
 * so the classes are resolved to a style and read back out. The colour follows
 * the theme because the class does.
 */
export function Icon({
  as: Component,
  className,
  strokeWidth = 2,
  filled = false,
}: {
  as: LucideIcon
  className?: string
  strokeWidth?: number
  /** Fill the glyph with its own colour (a star in a rating). */
  filled?: boolean
}) {
  const style = useResolveClassNames(cn('size-5 text-ink', className)) as {
    width?: number | string
    height?: number | string
    color?: string
    opacity?: number
    marginTop?: number
    marginLeft?: number
    marginRight?: number
  }
  const size = toPx(style.width) ?? 20
  // The base classes carry text-ink; INK covers the first web render, before
  // the stylesheet is registered and the class resolves to nothing.
  const color = style.color ?? INK
  return (
    <Component
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      {...(filled ? { fill: color } : {})}
      style={{
        ...(style.opacity === undefined ? {} : { opacity: style.opacity }),
        ...(style.marginTop === undefined ? {} : { marginTop: style.marginTop }),
        ...(style.marginLeft === undefined ? {} : { marginLeft: style.marginLeft }),
        ...(style.marginRight === undefined ? {} : { marginRight: style.marginRight }),
      }}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  )
}

/**
 * The light theme's --color-ink (src/global.css). Only seen until the class
 * resolves: on the web, the first render can come before the stylesheet is
 * registered, and an undefined colour would make a LinearGradient invalid and
 * a filled star empty.
 */
const INK = '#17150f'

/** The icon's colour as a string, for the rare prop that wants one. */
export function useColor(className: string): string {
  // text-ink first, so a class with no colour of its own still resolves to the
  // theme's ink, in the same single lookup.
  const style = useResolveClassNames(cn('text-ink', className)) as { color?: string }
  return style.color ?? INK
}

/**
 * A resolved length in px. Native resolves classes to numbers; the web build
 * reads the browser's computed style, which comes back as a string ("16px").
 */
function toPx(v: number | string | undefined): number | undefined {
  if (typeof v === 'number') return v
  if (typeof v !== 'string') return undefined
  const n = parseFloat(v)
  if (Number.isNaN(n)) return undefined
  return v.endsWith('rem') ? n * 16 : n
}
