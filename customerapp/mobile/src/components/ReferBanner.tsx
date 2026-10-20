import { View } from 'react-native'
import Svg, { Circle, G, Path, Rect } from 'react-native-svg'
import { formatPaise, REFERRAL_REWARD } from '@app/shared'
import { Tappable } from '@/components/ui/Tappable'
import { Text } from '@/components/ui/Text'
import { cn } from '@/lib/cn'
import { useTokenColors } from '@/lib/useTokenColors'

/**
 * "Refer and get free services" at the foot of Home, the way the marketplaces
 * close their home screen: the offer in two lines on the left, a drawing of
 * gifts and coins on the right, and the whole band a way to the refer page.
 *
 * The figure is the constant the server pays out, so the promise here cannot
 * drift from what lands on the balance; the asterisk's condition is said on
 * the band itself rather than left for a terms page.
 *
 * The drawing is inline so it costs no request and takes the brand colours.
 * It sits on `plate`-free ground, so it reads the same in either theme.
 */
export function ReferBanner({ className }: { className?: string }) {
  const amount = formatPaise(REFERRAL_REWARD)
  return (
    <Tappable
      href="/profile/refer"
      className={cn('-mx-4 flex-row items-center gap-4 border-t-8 border-surface px-4 py-7 active:opacity-80', className)}
    >
      <View className="min-w-0 flex-1">
        <Text className="text-2xl font-bold leading-[30px] text-ink">Refer and get free services</Text>
        <Text className="mt-2 text-base text-muted">
          Invite and get {amount}
          {'*'}
        </Text>
        <Text className="mt-3 text-xs text-muted">
          *In credits, once a friend&apos;s first booking is finished. They get {amount}
          {' '}too.
        </Text>
      </View>
      <GiftsDrawing />
    </Tappable>
  )
}

function GiftsDrawing() {
  const [gold, goldLight, periwinkle, royal, indigo, indigoDeep, pink, pinkMid, pinkDeep, mint, mintMid, teal] =
    useTokenColors([
      'art-gold',
      'art-gold-light',
      'art-periwinkle',
      'royal',
      'art-indigo',
      'art-indigo-deep',
      'art-pink',
      'art-pink-mid',
      'art-pink-deep',
      'art-mint',
      'art-mint-mid',
      'art-teal',
    ] as const)
  return (
    <View className="w-36 shrink-0" aria-hidden>
      <Svg viewBox="0 0 180 150" width="100%" style={{ aspectRatio: 180 / 150 }}>
        {/* Sparkles */}
        <G fill={gold}>
          <Path d="M30 22l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />
          <Path d="M150 14l1.5 4.5 4.5 1.5-4.5 1.5-1.5 4.5-1.5-4.5-4.5-1.5 4.5-1.5z" />
          <Path d="M168 70l1.5 4.5 4.5 1.5-4.5 1.5-1.5 4.5-1.5-4.5-4.5-1.5 4.5-1.5z" />
          <Path d="M22 96l1.2 3.6 3.6 1.2-3.6 1.2-1.2 3.6-1.2-3.6-3.6-1.2 3.6-1.2z" />
        </G>

        {/* Coins */}
        <Circle cx="40" cy="58" r="9" fill={gold} />
        <Circle cx="40" cy="58" r="5.5" fill={goldLight} />
        <Circle cx="160" cy="44" r="8" fill={gold} />
        <Circle cx="160" cy="44" r="4.8" fill={goldLight} />
        <Circle cx="112" cy="70" r="10" fill={gold} />
        <Circle cx="112" cy="70" r="6" fill={goldLight} />

        {/* The lid, tumbling off the big box */}
        <G transform="rotate(-14 104 40)">
          <Rect x="62" y="30" width="86" height="20" rx="3" fill={periwinkle} />
          <Rect x="98" y="30" width="12" height="20" fill={royal} />
          <Path
            d="M104 30c-10-14-26-14-24-4 2 7 16 6 24 4zm0 0c10-14 26-14 24-4-2 7-16 6-24 4z"
            fill={royal}
          />
        </G>

        {/* The big box */}
        <Rect x="70" y="80" width="72" height="58" rx="3" fill={indigo} />
        <Rect x="70" y="80" width="72" height="12" fill={indigoDeep} />
        <Rect x="100" y="80" width="12" height="58" fill={royal} />

        {/* The small pink box */}
        <Rect x="128" y="104" width="44" height="34" rx="3" fill={pink} />
        <Rect x="128" y="104" width="44" height="8" fill={pinkMid} />
        <Rect x="146" y="104" width="8" height="34" fill={pinkDeep} />
        <Path d="M150 104c-6-9-16-9-15-2 1 4 10 4 15 2zm0 0c6-9 16-9 15-2-1 4-10 4-15 2z" fill={pinkDeep} />

        {/* The small teal box */}
        <Rect x="34" y="112" width="40" height="26" rx="3" fill={mint} />
        <Rect x="34" y="112" width="40" height="7" fill={mintMid} />
        <Rect x="50" y="112" width="8" height="26" fill={teal} />
        <Path d="M54 112c-6-8-15-8-14-2 1 4 9 4 14 2zm0 0c6-8 15-8 14-2-1 4-9 4-14 2z" fill={teal} />
      </Svg>
    </View>
  )
}
