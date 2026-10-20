import { useCallback } from 'react'
import { View } from 'react-native'
import { router, type Href } from 'expo-router'
import Constants from 'expo-constants'
import {
  BadgeCheck,
  Bell,
  CalendarCheck,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  CreditCard,
  FileText,
  Gift,
  Headset,
  Info,
  LogOut,
  MapPin,
  Settings,
  ShieldCheck,
  Star,
  User,
  WalletMinimal,
  type LucideIcon,
} from 'lucide-react-native'
import { REFERRAL_REWARD, formatPaise, type UserProfile } from '@app/shared'

import { AppShell } from '@/components/AppShell'
import { brand } from '@/config/brand'
import { Header } from '@/components/Screen'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Tappable } from '@/components/ui/Tappable'
import { Text } from '@/components/ui/Text'
import { ProfileSkeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/Toast'
import { signOut, useAuth } from '@/lib/auth'
import { fetchProfile } from '@/lib/api/profile'
import { formatPhone } from '@/lib/format'
import { useAsync } from '@/lib/useAsync'

/**
 * The account, and everything filed under it.
 *
 * Laid out the way an account screen is laid out everywhere, because a
 * customer opening Profile is not reading it — they are aiming at one row. Who
 * they are at the top, the three places people actually go as tiles under it,
 * then everything else as a plain list, and signing out at the bottom where it
 * cannot be pressed by accident. Each row is one thing a customer might have
 * come here to do, named as they would say it — "Saved addresses", not
 * "Address management".
 *
 * The phone number is shown and cannot be edited, because it is the account. A
 * row that looks editable and is not is worse than one that never offered.
 *
 * Nobody is turned away at the door, and that goes for the rows as well as for
 * this screen. A row goes to its own screen whether or not anyone is signed in,
 * and that screen says what it holds and offers the way in. `ProfileShell` is
 * where that decision lives.
 */

/** Where a row sends someone who is not signed in yet. */
function signInTo(href: string): Href {
  return `/login?next=${encodeURIComponent(href)}` as Href
}

/** The three that the rest of this screen exists to be less important than. */
const TILES: readonly { href: Href; label: string; icon: LucideIcon }[] = [
  { href: '/bookings', label: 'My bookings', icon: ClipboardList },
  { href: '/profile/wallet', label: 'Balance', icon: WalletMinimal },
  { href: '/support', label: 'Help & support', icon: Headset },
]

const ROWS: readonly { href: Href; label: string; detail: string; icon: LucideIcon }[] = [
  { href: '/profile/personal', label: 'Personal details', detail: 'Your name and email', icon: User },
  { href: '/profile/plans', label: 'Plans', detail: 'Yearly cover on your appliances', icon: CalendarCheck },
  {
    href: '/profile/membership',
    label: 'Membership',
    detail: `${brand.name} Plus — no visit fee, 10% off repairs`,
    icon: BadgeCheck,
  },
  { href: '/profile/reviews', label: 'Your reviews', detail: 'What you told us', icon: Star },
  { href: '/profile/addresses', label: 'Saved addresses', detail: 'Where we come to', icon: MapPin },
  {
    href: '/profile/payment-methods',
    label: 'Payment methods',
    detail: 'How you would rather pay',
    icon: CreditCard,
  },
  { href: '/profile/warranties', label: 'Warranties', detail: 'What is still covered', icon: ShieldCheck },
  { href: '/profile/payments', label: 'Invoices', detail: 'Every bill we have issued you', icon: FileText },
  { href: '/profile/notifications', label: 'Notifications', detail: 'Everything we have sent you', icon: Bell },
  {
    href: '/profile/settings',
    label: 'Settings',
    detail: 'Permissions, legal, closing your account',
    icon: Settings,
  },
  { href: '/profile/about', label: `About ${brand.name}`, detail: 'Who we are, and the paperwork', icon: Info },
]

/** The version the app was built as, from app.json. */
const APP_VERSION = Constants.expoConfig?.version

export default function ProfileScreen() {
  const { user, ready } = useAuth()
  const toast = useToast()
  const uid = user?.uid

  const load = useCallback(async (): Promise<UserProfile | null> => {
    if (!uid) return null
    return fetchProfile(uid)
  }, [uid])

  const profile = useAsync(load)

  // A name is what the technician is handed and what an invoice is made out
  // to, so an account without one is worth saying out loud here rather than
  // leaving the customer to find out at checkout.
  const incomplete = profile.status === 'ready' && (profile.data?.name ?? '').trim().length === 0

  async function leave(): Promise<void> {
    try {
      await signOut()
      router.replace('/home')
    } catch {
      toast.show('We could not sign you out. Please try again.', { tone: 'error' })
    }
  }

  return (
    <AppShell mobileHeader={<Header title="Profile" />}>
      {!ready || (user && profile.status === 'loading') ? (
        <View className="mt-6">
          <ProfileSkeleton />
        </View>
      ) : (
        <>
          <View className="mt-6">
            {user && incomplete ? (
              <View className="mb-4 flex-row items-center justify-between gap-3">
                <View className="flex-row items-center gap-1.5 rounded-pill bg-error-soft px-3 py-1.5">
                  <Icon as={CircleAlert} className="size-3.5 text-error" />
                  <Text className="text-xs font-bold text-error">Incomplete profile</Text>
                </View>
                <Tappable
                  href="/profile/personal"
                  className="h-9 shrink-0 flex-row items-center rounded-pill border border-border px-4 active:border-brand"
                >
                  <Text className="text-sm font-bold text-ink">Complete</Text>
                </Tappable>
              </View>
            ) : null}

            <Text accessibilityRole="header" className="text-3xl font-bold text-ink">
              {(user ? profile.data?.name : undefined) ?? 'Your account'}
            </Text>

            {user ? (
              <Text className="mt-1.5 text-base text-muted">
                {/* The account is the number, so it is stated and not offered
                    as something to change. */}
                {user.phoneNumber ? formatPhone(user.phoneNumber) : 'Signed in'}
              </Text>
            ) : (
              <>
                <Text className="mt-1.5 text-base text-muted">
                  Sign in to see your bookings, your addresses and everything on your balance.
                </Text>
                <Button href={signInTo('/profile')} fullWidth className="mt-4">
                  Sign in
                </Button>
              </>
            )}
          </View>

          <View className="mt-6 flex-row gap-3">
            {TILES.map((tile) => (
              <Tappable
                key={tile.label}
                href={tile.href}
                className="flex-1 gap-3 rounded-card border border-border p-4 active:border-brand active:opacity-100"
              >
                <Icon as={tile.icon} className="size-6 text-ink" />
                <Text className="text-sm font-bold leading-[18px] text-ink">{tile.label}</Text>
              </Tappable>
            ))}
          </View>

          {/* Full bleed, so the list below reads as a different part of the
              screen rather than as more of the same column. */}
          <View className="-mx-4 mt-8 h-2 bg-surface" />

          <View className="-mx-4">
            {ROWS.map((row, index) => (
              <Tappable
                key={row.label}
                href={row.href}
                className={
                  'flex-row items-center gap-4 px-4 py-4 active:bg-surface active:opacity-100' +
                  (index < ROWS.length - 1 ? ' border-b border-border' : '')
                }
              >
                <Icon as={row.icon} className="size-5 shrink-0 text-ink" />
                <View className="min-w-0 flex-1">
                  <Text className="text-base font-medium text-ink">{row.label}</Text>
                  <Text className="mt-0.5 text-xs text-muted">{row.detail}</Text>
                </View>
                <Icon as={ChevronRight} className="size-5 shrink-0 text-muted" />
              </Tappable>
            ))}
          </View>

          <ReferCard />

          {user ? (
            <Button
              className="mt-8"
              variant="secondary"
              fullWidth
              onPress={() => void leave()}
              iconLeft={<Icon as={LogOut} className="size-4 text-brand" />}
            >
              Sign out
            </Button>
          ) : null}

          <View className="mt-8 flex-row items-center justify-center gap-1.5">
            <Icon as={CreditCard} className="size-3.5 text-muted" />
            <Text className="text-xs text-muted">We never store your card details. Payments go through Razorpay.</Text>
          </View>

          {APP_VERSION ? (
            <Text className="mt-3 text-center text-xs text-muted">Version {APP_VERSION}</Text>
          ) : null}
        </>
      )}
    </AppShell>
  )
}

/**
 * The one thing on this screen that is not a row.
 *
 * It sits below the list rather than above it because it is an offer, not
 * something the customer came here to do. Below the list, after everything
 * useful, it is still the largest thing on the screen at that point and
 * impossible to miss.
 *
 * The figure comes from the same constant the server pays out, so the promise
 * on this card cannot drift from what lands on the balance.
 */
function ReferCard() {
  return (
    <View className="mt-8 overflow-hidden rounded-card bg-brand-soft p-5">
      <View className="flex-row items-start justify-between gap-4">
        <View className="min-w-0 flex-1">
          <Text className="text-xl font-bold text-ink">{`Refer & earn ${formatPaise(REFERRAL_REWARD)}`}</Text>
          <Text className="mt-1 max-w-[22rem] text-sm text-muted">
            {`Get ${formatPaise(REFERRAL_REWARD)} in credits when a friend's first booking is finished. They get the same.`}
          </Text>
        </View>

        <View className="size-14 shrink-0 items-center justify-center rounded-full bg-bg">
          <Icon as={Gift} className="size-7 text-brand" />
        </View>
      </View>

      <Button href="/profile/refer" className="mt-4 self-start px-6">
        Refer now
      </Button>
    </View>
  )
}
