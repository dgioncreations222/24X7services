import { useState } from 'react'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import type { Href } from 'expo-router'
import { Bell, LogIn, LogOut, WalletMinimal, type LucideIcon } from 'lucide-react-native'
import { ConfirmModal } from '@/components/ui/Overlay'
import { SearchBar } from '@/components/SearchBar'
import { useToast } from '@/components/Toast'
import { Icon } from '@/components/ui/Icon'
import { Tappable } from '@/components/ui/Tappable'
import { Text } from '@/components/ui/Text'
import { signOut, useAuth } from '@/lib/auth'
import { cn } from '@/lib/cn'
import { formatPhone } from '@/lib/format'
import { CartButton } from '@/components/CartButton'
import { LocationSelector } from '@/components/LocationSelector'
import { brand } from '@/config/brand'

/**
 * The top of Home: where the customer is, and what they are looking for.
 *
 * Three pieces. The status bar's own strip stays put above the page; the
 * location row sits in the page and scrolls away with it; the search field
 * under it is sticky, so it rides up with the finger and then stays pinned at
 * the top. Nothing waits for a scroll threshold — the header moves exactly as
 * far as the page does, which is what makes it feel smooth.
 *
 * `HomeHeader` renders the three stacked, for parity with the web export.
 * Home itself places them apart — the strip as the screen's header, the
 * location row and the search as children of its scroll view, the search one
 * of the view's sticky headers — because a sticky child has to be a direct
 * child of the scroll view, and a wrapper would pin only for its own height.
 */

export interface HomeHeaderProps {
  /**
   * The colour of the banner in view under the header, as a hex value. Given,
   * the header is painted with it and its words turn white, so header and
   * banner read as one block, as on the marketplaces' home screens; once the
   * page scrolls, the pinned search bar keeps that colour until the banner is
   * gone.
   */
  tone?: string
  /** The saved area, once there is one. Absent reads as "Set your location". */
  area?: string
  /** City and pincode, on the line under it. */
  detail?: string
  /** Set once the page has scrolled: a hairline and shadow under the search. */
  raised?: boolean
  onChangeLocation: () => void
  onSearch: () => void
}

export function HomeHeader(props: HomeHeaderProps) {
  return (
    <>
      <HomeHeaderStrip tone={props.tone} raised={props.raised} />
      <HomeHeaderTop {...props} />
      <HomeHeaderSearch {...props} />
    </>
  )
}

/**
 * The status bar's own strip, so the pinned search field never slides under
 * the clock. The darkest colour of the tone at the top of the page, which is
 * exactly where the gradient behind the header and the banner starts.
 */
export function HomeHeaderStrip({ tone, raised: _raised }: Pick<HomeHeaderProps, 'tone' | 'raised'>) {
  const insets = useSafeAreaInsets()
  return (
    <View
      className={cn(!tone && 'bg-bg')}
      style={{ height: insets.top, ...(tone ? { backgroundColor: tone } : {}) }}
    />
  )
}

/** The location row and the three tiles beside it. Scrolls away with the page. */
export function HomeHeaderTop({
  area,
  detail,
  tone,
  raised = false,
  onChangeLocation,
}: Pick<HomeHeaderProps, 'area' | 'detail' | 'tone' | 'raised' | 'onChangeLocation'>) {
  const painted = Boolean(tone)
  // At the very top the page paints one gradient behind the header and the
  // banner together, so the header's own strips stay clear and the two read
  // as one block. Scrolled, the bar takes the colour.
  const clear = painted && !raised
  return (
    <View
      className={cn('relative z-[1]', !tone && 'bg-bg')}
      style={tone && !clear ? { backgroundColor: tone } : undefined}
    >
      <View className="flex-row items-start gap-2 px-4 pt-2">
        <LocationSelector
          className="min-w-0 flex-1"
          area={area}
          detail={detail}
          onDark={painted}
          onClick={onChangeLocation}
        />
        <View className="shrink-0 flex-row gap-2">
          {/* The wallet glyph every app of this shape puts in this corner,
              opening the balance: credits we issued, plus whatever the
              customer has added. Closed loop — it buys our own services and
              nothing else — which is the condition on it being here at all. */}
          <HeaderTile href="/profile/wallet" label="Balance" icon={WalletMinimal} onDark={painted} />
          <HeaderTile href="/profile/notifications" label="Notifications" icon={Bell} onDark={painted} />
          <AccountTile onDark={painted} />
        </View>
      </View>
    </View>
  )
}

/** The search field and the cart beside it: the part that stays pinned. */
export function HomeHeaderSearch({
  tone,
  raised = false,
  onSearch,
}: Pick<HomeHeaderProps, 'tone' | 'raised' | 'onSearch'>) {
  const painted = Boolean(tone)
  const clear = painted && !raised
  return (
    <View
      className={cn(
        'relative z-30',
        !painted && 'bg-bg',
        // The hairline belongs to the page colour; on the banner's colour it
        // would draw a white seam across the block.
        raised && !painted && 'border-b border-border shadow-raised'
      )}
      style={painted && !clear ? { backgroundColor: tone } : undefined}
    >
      {/* Once the banner slides up under the pinned bar, its lighter colour
          meets the bar's solid one in a hard edge that reads as a line. A
          short fade from the bar's colour hides the edge. */}
      {painted && raised && tone ? (
        <LinearGradient
          pointerEvents="none"
          colors={[tone, `${tone}00`]}
          style={{ position: 'absolute', left: 0, right: 0, top: '100%', height: 24 }}
        />
      ) : null}
      {/* The cart beside the search, so it stays in reach once the location
          row has scrolled away. */}
      <View className="flex-row items-center gap-2 px-4 py-3">
        <SearchBar
          readOnly
          onOpen={onSearch}
          // Crisp white on the colour, as the marketplaces have it; the dark
          // theme keeps its own field so the muted hint stays readable.
          className={cn('min-w-0 flex-1', painted && 'border-transparent bg-white dark:bg-surface')}
        />
        <CartButton onDark={painted} />
      </View>
    </View>
  )
}

/**
 * Log in, or log out, from the top of Home.
 *
 * A labelled button rather than a bare glyph: the log-in and log-out arrows
 * are mirror images of each other, and on their own nobody can tell which one
 * they are looking at. Logging out asks first, with the number it is leaving,
 * because it is one tap from the top of the most-used screen.
 *
 * Nothing until Firebase has reported whether anyone is signed in, so the
 * button never says "Login" for a beat to somebody who already is.
 */
function AccountTile({ onDark = false }: { onDark?: boolean }) {
  const { user, ready } = useAuth()
  const toast = useToast()
  const [confirming, setConfirming] = useState(false)
  const [leaving, setLeaving] = useState(false)

  if (!ready) return <View className="h-11 w-20" aria-hidden />

  if (!user) {
    return (
      <Tappable
        href={`/login?next=${encodeURIComponent('/home')}` as Href}
        className={cn(PILL_CLASS, onDark && ON_DARK)}
      >
        <Icon as={LogIn} className={cn('size-4', onDark ? 'text-white' : 'text-brand')} />
        <Text className={cn('text-sm font-semibold', onDark ? 'text-white' : 'text-brand')}>Login</Text>
      </Tappable>
    )
  }

  async function leave(): Promise<void> {
    setLeaving(true)
    try {
      await signOut()
      setConfirming(false)
      toast.show('You have been logged out.')
    } catch {
      toast.show('We could not log you out. Please try again.', { tone: 'error' })
    } finally {
      setLeaving(false)
    }
  }

  return (
    <>
      <Tappable onPress={() => setConfirming(true)} className={cn(PILL_CLASS, onDark && ON_DARK)}>
        <Icon as={LogOut} className={cn('size-4', onDark ? 'text-white' : 'text-brand')} />
        <Text className={cn('text-sm font-semibold', onDark ? 'text-white' : 'text-brand')}>Logout</Text>
      </Tappable>
      <ConfirmModal
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => void leave()}
        loading={leaving}
        destructive
        title={`Log out of ${brand.name}?`}
        description={
          user.phoneNumber
            ? `You are logged in as ${formatPhone(user.phoneNumber)}. Your bookings stay saved to this number.`
            : 'Your bookings stay saved to your account.'
        }
        confirmLabel="Log out"
        cancelLabel="Stay logged in"
      />
    </>
  )
}

const PILL_CLASS =
  'h-11 flex-row items-center gap-1.5 rounded-card border border-border bg-bg px-3 active:bg-brand-soft active:opacity-100'

const TILE_CLASS =
  'size-11 items-center justify-center rounded-card border border-border bg-bg active:bg-brand-soft active:opacity-100'

/** The tiles over a painted header: glass on the colour, white glyphs. */
const ON_DARK = 'border-white/25 bg-white/15 active:bg-white/25'

/**
 * One of the square buttons in the top right.
 *
 * An outlined tile rather than a bare icon: an outline-weight glyph on its own
 * reads as decoration, not as something to press. Two of them and the Login
 * button is the ceiling — the location has to keep enough width to show an
 * area name before it truncates.
 */
function HeaderTile({
  href,
  label,
  icon,
  onDark = false,
}: {
  href: Href
  label: string
  icon: LucideIcon
  onDark?: boolean
}) {
  return (
    <Tappable href={href} accessibilityLabel={label} className={cn(TILE_CLASS, onDark && ON_DARK)}>
      <Icon as={icon} className={cn('size-5', onDark ? 'text-white' : 'text-brand')} />
    </Tappable>
  )
}
