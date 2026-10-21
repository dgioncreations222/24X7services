import { View } from 'react-native'
import Svg, { Circle, Path, Rect } from 'react-native-svg'
import type { Appliance, Brand } from '@/lib/catalog'
import { BRAND_LABEL } from '@/lib/catalog'
import { useResolveClassNames } from 'uniwind'
import { cn } from '@/lib/cn'
import { hiddenFromA11y, toPx, useColor } from './base/Icon'
import { Text, useInherited } from './base/Text'

/**
 * Drawn for this app rather than borrowed: no icon set has an oven or a
 * geyser that reads at 20px, and five glyphs from five different sets look
 * like it. Same 24px grid and 1.75 stroke as the lucide icons beside them.
 */
export function ApplianceGlyph({ appliance, className }: { appliance: Appliance; className?: string }) {
  // SVG has no currentColor here: the class is resolved to a colour and size.
  const inherited = useInherited()
  const classes = cn('size-5 text-ink', inherited, className)
  const color = useColor(classes)
  const size = useSize(classes)
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    ...hiddenFromA11y,
  }
  switch (appliance) {
    case 'washer':
      return (
        <Svg {...common}>
          <Rect x="4" y="2.5" width="16" height="19" rx="2.5" />
          <Path d="M4 7h16" />
          <Circle cx="7.5" cy="4.9" r=".5" fill={color} />
          <Circle cx="10" cy="4.9" r=".5" fill={color} />
          <Circle cx="12" cy="14.2" r="4.6" />
          <Path d="M9.6 15.2c1.2.9 3.6.9 4.8-.4" />
        </Svg>
      )
    case 'fridge':
      return (
        <Svg {...common}>
          <Rect x="5.5" y="2.5" width="13" height="19" rx="2.5" />
          <Path d="M5.5 9.5h13" />
          <Path d="M8.5 5.2v2" />
          <Path d="M8.5 12.2v3.6" />
          <Path d="M8 21.5v1M16 21.5v1" />
        </Svg>
      )
    case 'oven':
      return (
        <Svg {...common}>
          <Rect x="3" y="3.5" width="18" height="17" rx="2.5" />
          <Path d="M3 8h18" />
          <Circle cx="6.8" cy="5.8" r=".6" fill={color} />
          <Circle cx="9.4" cy="5.8" r=".6" fill={color} />
          <Path d="M14 5.8h4" />
          <Rect x="6" y="10.8" width="12" height="6.7" rx="1.2" />
          <Path d="M8 13.2h8" />
        </Svg>
      )
    case 'ac':
      return (
        <Svg {...common}>
          <Rect x="2.5" y="4.5" width="19" height="9" rx="2.2" />
          <Path d="M5.5 10.8h13" />
          <Circle cx="18.3" cy="7.3" r=".55" fill={color} />
          <Path d="M7.5 16.5c.8 1 .8 2.3 0 3.4M12 16.5c.8 1 .8 2.3 0 3.4M16.5 16.5c.8 1 .8 2.3 0 3.4" />
        </Svg>
      )
    case 'geyser':
      return (
        <Svg {...common}>
          <Rect x="6.5" y="2.5" width="11" height="15" rx="5.5" />
          <Circle cx="12" cy="8" r="2" />
          <Path d="M12 7v1l.8.6" />
          <Path d="M10 13.5h4" />
          <Path d="M10 17.5v4M14 17.5v2.2h2.5" />
        </Svg>
      )
  }
}

/**
 * A brand as a typeset label, never a logo — the business services these
 * appliances, it is not an authorised partner of their makers.
 */
export function BrandTag({ brand, className }: { brand: Brand; className?: string }) {
  return (
    <View className={cn('h-5 flex-row items-center self-start rounded-[5px] border border-line-strong bg-card px-1.5', className)}>
      <Text className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-ink-2">{BRAND_LABEL[brand]}</Text>
    </View>
  )
}

function useSize(classes: string): number {
  const style = useResolveClassNames(classes) as { width?: number | string }
  return toPx(style.width) ?? 20
}
