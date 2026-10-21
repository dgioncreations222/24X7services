import { Platform } from 'react-native'
import type { LucideIcon } from 'lucide-react-native'
import { useResolveClassNames } from 'uniwind'
import { cn } from '@/lib/cn'
import { useInherited } from './Text'
import { COLORS } from '@/lib/theme'

/**
 * A lucide icon, sized and coloured with the same classes the web app uses:
 * `<Icon as={ArrowLeft} className="size-5 text-brand" />`.
 *
 * lucide-react-native takes `size` and `color` props rather than a className,
 * so the classes are resolved to a style and read back out. Inside a Button or
 * Chip, an icon without its own colour takes the label's, as on the web.
 */
export function Icon({
  as: Component,
  className,
  strokeWidth = 2,
  fill,
}: {
  as: LucideIcon
  className?: string
  strokeWidth?: number
  /** For a filled glyph (a star in a rating). */
  fill?: string
}) {
  const inherited = useInherited()
  const style = useResolveClassNames(cn('size-5 text-ink', inherited, className)) as {
    width?: number | string
    height?: number | string
    color?: string
    opacity?: number
    marginTop?: number
    marginLeft?: number
    marginRight?: number
  }
  const size = toPx(style.width) ?? 20
  return (
    <Component
      size={size}
      color={style.color ?? COLORS.ink}
      strokeWidth={strokeWidth}
      {...(fill ? { fill } : {})}
      style={{
        ...(style.opacity === undefined ? {} : { opacity: style.opacity }),
        ...(style.marginTop === undefined ? {} : { marginTop: style.marginTop }),
        ...(style.marginLeft === undefined ? {} : { marginLeft: style.marginLeft }),
        ...(style.marginRight === undefined ? {} : { marginRight: style.marginRight }),
      }}
      {...hiddenFromA11y}
    />
  )
}

/** The icon's colour as a string, for the rare prop that wants one. */
export function useColor(className: string): string {
  const style = useResolveClassNames(className) as { color?: string }
  return style.color ?? COLORS.ink
}

/**
 * A resolved length in px. Native resolves classes to numbers; the web build
 * reads the browser's computed style, which comes back as a string ("16px").
 */
export function toPx(v: number | string | undefined): number | undefined {
  if (typeof v === 'number') return v
  if (typeof v !== 'string') return undefined
  const n = parseFloat(v)
  if (Number.isNaN(n)) return undefined
  return v.endsWith('rem') ? n * 16 : n
}

/**
 * Props that keep a decorative SVG away from screen readers. On the web an SVG
 * passes RN's accessibility props straight to the DOM, where React rejects
 * them, so it gets aria-hidden instead.
 */
export const hiddenFromA11y =
  Platform.OS === 'web'
    ? ({ 'aria-hidden': true } as object)
    : ({ accessibilityElementsHidden: true, importantForAccessibility: 'no' } as const)
