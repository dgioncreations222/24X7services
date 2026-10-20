import { useCallback, useState } from 'react'
import { View } from 'react-native'
import type { Href } from 'expo-router'
import {
  CalendarClock,
  CalendarX,
  ReceiptIndianRupee,
  ShieldCheck,
  Truck,
  type LucideIcon,
} from 'lucide-react-native'
import {
  ACTIVE_STATUSES,
  CLOSED_STATUSES,
  UPCOMING_STATUSES,
  type BookingStatus,
  type CatalogService,
} from '@app/shared'

import { AppShell } from '@/components/AppShell'
import { Header } from '@/components/Screen'
import { BookingCard } from '@/components/BookingCard'
import { EmptyState , ErrorState } from '@/components/ui/States'

import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { Tappable } from '@/components/ui/Tappable'
import { Text } from '@/components/ui/Text'
import { useSignInHref } from '@/components/ProfileShell'
import { BookingListSkeleton } from '@/components/ui/Skeleton'
import { useAuth } from '@/lib/auth'
import { fetchAllServices } from '@/lib/catalog'
import { useAsync } from '@/lib/useAsync'
import { useMyBookings } from '@/lib/useMyBookings'
import { cn } from '@/lib/cn'

/**
 * Every booking, in three tabs.
 *
 * The tabs are the three states a customer thinks in: something is coming,
 * something is happening right now, and something is done. They are not the
 * eleven statuses the system tracks — a customer does not care whether a
 * booking is `en_route` or `arrived`, only that someone is on their way.
 *
 * Active leads, because a job in progress is the one thing on this screen that
 * might need an answer in the next ten minutes.
 *
 * Signed out it draws itself rather than bouncing to the login form — but not
 * with the tabs. Three filters over nothing all show the same block, so
 * tapping one does nothing, and a control that does nothing is worse than no
 * control. They come back with the account that has something to filter.
 *
 * What fills the screen instead is what a booking here actually carries: the
 * technician tracked on the way, the invoice, the warranty. Those are facts
 * about this business rather than about one account, they are true before
 * anybody signs in, and they are the answer to the question a signed-out
 * visitor on this screen is really asking — what do I get for booking through
 * the app rather than ringing someone. The same block sits under an empty
 * list for somebody who has signed in and not booked yet, because that screen
 * is just as blank and the answer is just as useful.
 *
 * Sign in leads. Somebody who opened "My bookings" most likely has some; a
 * screen that puts the catalogue first and signing in in the small print is
 * telling a returning customer they are in the wrong place.
 *
 * No back arrow: this is a tab, so there is nowhere behind it to go.
 */

const TABS = [
  { key: 'active', label: 'Active', statuses: ACTIVE_STATUSES },
  { key: 'upcoming', label: 'Upcoming', statuses: UPCOMING_STATUSES },
  { key: 'past', label: 'Past', statuses: CLOSED_STATUSES },
] as const satisfies readonly {
  key: string
  label: string
  statuses: readonly BookingStatus[]
}[]

type TabKey = (typeof TABS)[number]['key']

export default function BookingsScreen() {
  const { user, ready } = useAuth()
  const [tab, setTab] = useState<TabKey>('active')
  const signIn = useSignInHref()

  const loadServices = useCallback(() => fetchAllServices(), [])
  const services = useAsync(loadServices)

  const active = TABS.find((t) => t.key === tab) ?? TABS[0]
  const { bookings, loading, error } = useMyBookings(user?.uid, active.statuses)

  // Every card needs the catalog name for what was booked; the booking stores
  // the ids, not the wording, so that a renamed service renames everywhere.
  const nameFor = (applianceId: string, serviceKey: string): string =>
    services.data?.find(
      (service: CatalogService) => service.applianceId === applianceId && service.serviceKey === serviceKey
    )?.name ?? 'Service'

  return (
    <AppShell
      mobileHeader={
        <Header
          title="My bookings"
          // Help sits on this screen because this is where the questions are.
          // A booking that has gone wrong is the reason most people open
          // support at all, and making them find it from the nav is a tap
          // spent on navigation instead of on the problem.
          right={
            <Tappable
              href={'/support' as Href}
              className="mr-2 h-9 justify-center rounded-pill border border-border px-4 active:border-brand active:opacity-100"
            >
              <Text className="text-sm font-semibold text-brand">Help</Text>
            </Tappable>
          }
        />
      }
    >
      {/* Wraps rather than scrolling, so no pill is ever sliced at the edge. */}
      {user ? (
        <View accessibilityRole="tablist" accessibilityLabel="Booking status" className="mt-4 flex-row flex-wrap gap-2">
          {TABS.map((option) => {
            const selected = option.key === tab
            return (
              <Tappable
                key={option.key}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                onPress={() => setTab(option.key)}
                className={cn(
                  'min-h-11 shrink-0 justify-center rounded-pill border px-4 active:opacity-100',
                  selected ? 'border-brand bg-brand' : 'border-border bg-bg active:border-brand'
                )}
              >
                <Text className={cn('text-sm font-medium', selected ? 'text-white' : 'text-ink')}>
                  {option.label}
                </Text>
              </Tappable>
            )
          })}
        </View>
      ) : null}

      <View className="mt-5">
        {!ready || (user && loading) ? (
          <BookingListSkeleton />
        ) : !user ? (
          <>
            <View className="items-center gap-3 px-6 pt-8">
              <View className="size-14 items-center justify-center rounded-full bg-surface">
                <Icon as={CalendarClock} className="size-6 text-muted" />
              </View>
              <Text accessibilityRole="header" className="text-center text-lg font-semibold text-ink">
                Your bookings live here
              </Text>
              <Text className="max-w-xs text-center text-sm text-muted">
                Sign in to pick up a job you have already booked, or start a new one — a repair, a service and an
                installation all begin the same way.
              </Text>
              {/* Stacked, so neither reads as the footnote of the other. */}
              <View className="mt-2 w-full max-w-xs gap-2">
                <Tappable
                  href={signIn}
                  className="min-h-11 items-center justify-center rounded-pill bg-brand px-5 active:bg-brand-deep active:opacity-100"
                >
                  <Text className="text-sm font-semibold text-white">Sign in</Text>
                </Tappable>
                <Tappable
                  href={'/services' as Href}
                  className="min-h-11 items-center justify-center rounded-pill border border-border px-5 active:border-brand active:opacity-100"
                >
                  <Text className="text-sm font-semibold text-ink">Explore our services</Text>
                </Tappable>
              </View>
            </View>
            <WhatBookingsCarry className="mt-8" />
          </>
        ) : error ? (
          <ErrorState className="py-16" description="We could not load your bookings. Please try again." />
        ) : bookings.length === 0 ? (
          <>
            <EmptyState
              className="pb-4 pt-10"
              icon={CalendarX}
              title={
                tab === 'active'
                  ? 'Nothing happening right now'
                  : tab === 'upcoming'
                    ? 'No bookings yet'
                    : 'Nothing finished yet'
              }
              description={
                tab === 'past'
                  ? 'Completed and cancelled bookings collect here.'
                  : tab === 'active'
                    ? 'A job shows up here from the moment your technician is on the way until it is done.'
                    : 'Looks like you have not had us out yet. A repair, a service or an installation all start the same way.'
              }
              action={{ label: 'Explore our services', href: '/services' as Href }}
            />
            <WhatBookingsCarry className="mt-4" />
          </>
        ) : (
          <View className="gap-3">
            {bookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                serviceName={nameFor(booking.applianceId, booking.serviceKey)}
              />
            ))}
          </View>
        )}
      </View>
    </AppShell>
  )
}

/**
 * What booking through the app gets you, on the screen with nothing on it.
 *
 * Each line is a screen that already exists — `/bookings/track`,
 * `/bookings/invoice`, `/bookings/warranty` — so this is a description of the
 * product rather than a promise made on its behalf. Nothing here is a number
 * or a guarantee, because those are the parts that go stale without anybody
 * noticing.
 */
const CARRIED: readonly {
  key: string
  icon: LucideIcon
  label: string
  detail: string
}[] = [
  {
    key: 'track',
    icon: Truck,
    label: 'The technician, tracked',
    detail: 'From the moment they set off — where they are, when they are due, and the code that starts the job.',
  },
  {
    key: 'invoice',
    icon: ReceiptIndianRupee,
    label: 'An itemised GST invoice',
    detail: 'Parts and labour listed separately, in the app, as soon as the job is closed.',
  },
  {
    key: 'warranty',
    icon: ShieldCheck,
    label: 'The warranty, in one place',
    detail: 'What is covered and until when, with the claim started from the booking itself.',
  },
]

function WhatBookingsCarry({ className }: { className?: string }) {
  return (
    <Card className={cn('p-4', className)}>
      <Text accessibilityRole="header" className="text-sm font-semibold text-ink">
        What a booking here carries
      </Text>
      <View className="mt-3 gap-3.5">
        {CARRIED.map(({ key, icon, label, detail }) => (
          <View key={key} className="flex-row items-start gap-3">
            <View className="mt-0.5 size-8 shrink-0 items-center justify-center rounded-full bg-surface">
              <Icon as={icon} className="size-4 text-brand" />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-sm font-semibold text-ink">{label}</Text>
              <Text className="mt-0.5 text-sm leading-[22px] text-muted">{detail}</Text>
            </View>
          </View>
        ))}
      </View>
    </Card>
  )
}
