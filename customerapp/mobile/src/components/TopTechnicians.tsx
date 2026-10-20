import { useState } from 'react'
import { View } from 'react-native'
import { ShieldCheck, Star, Wrench, type LucideIcon } from 'lucide-react-native'
import { BrandDisclaimer } from '@/components/BrandCard'
import { Icon } from '@/components/ui/Icon'
import { Img } from '@/components/ui/Img'
import { Text } from '@/components/ui/Text'
import { brand } from '@/config/brand'

/**
 * Who comes to the door, and what they can open up.
 *
 * Two closing sections for the Services page: the technician as a person
 * (a cut-out photo beside three plain facts), then every brand they work on.
 * The facts are only ones the business already stands behind elsewhere in the
 * app — verification, brand training, and the rating the customer leaves.
 */

const FACTS: { icon: LucideIcon; label: string }[] = [
  { icon: ShieldCheck, label: 'Background verified' },
  { icon: Wrench, label: 'Trained across all major brands' },
  { icon: Star, label: 'Rated by customers after every job' },
]

/** The photo is cut out, so it stands on the card in either theme. */
const TECHNICIAN_PHOTO = '/photos/technician/top-technician.webp'

export function TopTechnicians() {
  return (
    <View className="min-h-56 flex-row overflow-hidden rounded-card border border-border bg-bg">
      <View className="z-10 w-[60%] justify-center gap-4 py-5 pl-4">
        {FACTS.map((fact) => (
          <View key={fact.label} className="flex-row items-start gap-3">
            <Icon as={fact.icon} strokeWidth={1.75} className="mt-0.5 size-5 text-ink" />
            <Text className="flex-1 text-[15px] leading-snug text-ink">{fact.label}</Text>
          </View>
        ))}
      </View>
      <View className="absolute inset-y-0 right-0 w-[44%] pt-3">
        <Img
          src={TECHNICIAN_PHOTO}
          alt={`A ${brand.name} technician`}
          contentFit="contain"
          contentPosition="bottom"
          className="h-full w-full"
        />
      </View>
    </View>
  )
}

/**
 * Every brand a technician works on — wider than the catalog's own brand list,
 * which only names the brands a booking can be tagged with.
 */
const ALL_BRANDS: { name: string; logo: string }[] = [
  { name: 'Samsung', logo: '/brands/samsung.svg' },
  { name: 'LG', logo: '/brands/lg.svg' },
  { name: 'Whirlpool', logo: '/brands/whirlpool.svg' },
  { name: 'Haier', logo: '/brands/haier.svg' },
  { name: 'Bosch', logo: '/brands/bosch.svg' },
  { name: 'Electrolux', logo: '/brands/electrolux.svg' },
  { name: 'Panasonic', logo: '/brands/panasonic.svg' },
  { name: 'Godrej', logo: '/brands/godrej.svg' },
  { name: 'Voltas', logo: '/brands/voltas.svg' },
  { name: 'Blue Star', logo: '/brands/bluestar.png' },
  { name: 'IFB', logo: '/brands/ifb.png' },
]

/** Three columns with a 10px gutter, sized off the grid's own width. */
const COLUMNS = 3
const GUTTER = 10

export function AllBrandsGrid() {
  const [width, setWidth] = useState<number>()
  const cell = width === undefined ? undefined : Math.floor((width - GUTTER * (COLUMNS - 1)) / COLUMNS)
  const tile = 'h-16 items-center justify-center rounded-card border border-border bg-logo px-4'
  const size = cell === undefined ? { width: '31%' as const } : { width: cell }

  return (
    <View>
      <View
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        className="flex-row flex-wrap"
        style={{ gap: GUTTER }}
      >
        {ALL_BRANDS.map((brand) => (
          <View key={brand.name} className={tile} style={size}>
            <Img src={brand.logo} alt={brand.name} contentFit="contain" className="h-7 w-full" />
          </View>
        ))}
        <View className={tile} style={size}>
          <Text className="text-[15px] font-semibold text-night">& more</Text>
        </View>
      </View>
      <BrandDisclaimer className="mt-3" />
    </View>
  )
}
