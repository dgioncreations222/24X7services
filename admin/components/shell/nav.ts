'use client'

import type { Route } from 'next'
import { useMemo } from 'react'
import {
  BadgePercent,
  Bell,
  BriefcaseBusiness,
  ChartColumn,
  CreditCard,
  FileClock,
  GalleryHorizontal,
  Headset,
  Images,
  LayoutDashboard,
  RadioTower,
  Settings,
  ShieldCheck,
  Star,
  Tags,
  UserRoundCog,
  Users,
  Wallet,
} from 'lucide-react'
import { useKycQueueCount, useUnassignedCount, useUrgentDispatchCount } from '@/lib/data'
import { ROUTE_MODULE } from '@/lib/control'
import { useStore } from '@/lib/store'
import type { Module } from '@/lib/types'
import type { Side } from '../ui'

/** The sidebar: every page, grouped, with the counts that wait on a person. */
export type Item = {
  href: Route
  label: string
  icon: typeof Bell
  /** The exact path it lights up for, when two items share a section. */
  match?: string
  badge?: 'emergency' | 'unassigned' | 'kyc' | 'tickets' | 'payouts' }

export const NAV: { group: string; side?: Side; items: Item[] }[] = [
  {
    group: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/dispatch', label: 'Live Dispatch', icon: RadioTower, badge: 'emergency' },
    ],
  },
  {
    group: 'Operations',
    items: [
      { href: '/bookings', label: 'Bookings', icon: BriefcaseBusiness, badge: 'unassigned' },
      { href: '/support', label: 'Support Tickets', icon: Headset, badge: 'tickets' },
    ],
  },
  {
    group: 'Customer side',
    side: 'customer',
    items: [
      { href: '/customers', label: 'Customers', icon: Users },
      { href: '/reviews', label: 'Reviews & Ratings', icon: Star },
      // The old Promotions page (/promotions) stays in the repo, unlinked.
      { href: '/coupons', label: 'Coupons & Plus', icon: BadgePercent },
    ],
  },
  {
    group: 'Technician side',
    side: 'technician',
    items: [
      { href: '/technicians', label: 'Technicians', icon: UserRoundCog, badge: 'kyc' },
      { href: '/payouts', label: 'Payouts', icon: Wallet, badge: 'payouts' },
    ],
  },
  {
    group: 'Business',
    items: [
      { href: '/payments', label: 'Payments', icon: CreditCard },
      // The old Services & Pricing page (/catalog) stays in the repo, unlinked.
      { href: '/catalog/categories', label: 'Catalog', icon: Tags },
      { href: '/reports', label: 'Reports', icon: ChartColumn },
    ],
  },
  {
    group: 'Content',
    items: [
      { href: '/content/banners', label: 'Home banners', icon: GalleryHorizontal, match: '/content/banners' },
      { href: '/content', label: 'Content & Media', icon: Images, match: '/content' },
    ],
  },
  {
    group: 'System',
    items: [
      { href: '/admins', label: 'Admin Users', icon: ShieldCheck },
      { href: '/audit', label: 'Audit Logs', icon: FileClock },
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
]

export const COLLAPSE_KEY = 'admin.nav.collapsed'

/** '/catalog/categories' → '/catalog': the part of a path that names its section. */
export const section = (path: string) => '/' + (path.split('/')[1] ?? '')

/** Sections whose pages are new routes the old permission table does not know. */
const NEW_SECTIONS: Record<string, Module> = { '/coupons': 'promotions' }

/** Which permission module a path belongs to. */
export const moduleFor = (path: string): Module | undefined => ROUTE_MODULE[section(path)] ?? NEW_SECTIONS[section(path)]

/** Whether a sidebar item is the current page. */
export const isActive = (item: Item, pathname: string) => {
  const p = pathname.replace(/\/$/, '')
  return item.match ? (item.match === '/content' ? p === '/content' : p.startsWith(item.match)) : section(p) === section(item.href)
}

/** Page titles by section, for the phone top bar. */
export const TITLES: Record<string, string> = Object.fromEntries(NAV.flatMap((g) => g.items.map((i) => [section(i.href), i.label])))

/** Counts that sit beside menu items: things waiting on a person. */
export function useBadges() {
  const s = useStore()
  // Counts for pages already on lib/data (technicians PR 9, bookings PR 10); the rest follow as their pages move.
  const kyc = useKycQueueCount()
  const unassigned = useUnassignedCount()
  const emergency = useUrgentDispatchCount()
  return useMemo(
    () => ({
      emergency,
      unassigned,
      kyc,
      tickets: s.tickets.filter((t) => t.status === 'open').length,
      payouts: s.payouts.filter((p) => p.status === 'pending').length,
    }),
    [emergency, unassigned, kyc, s.tickets, s.payouts]
  )
}
