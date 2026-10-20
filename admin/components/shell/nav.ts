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
import { useStore } from '@/lib/store'
import type { Side } from '../ui'

/** The sidebar: every page, grouped, with the counts that wait on a person. */
export type Item = { href: Route; label: string; icon: typeof Bell; badge?: 'emergency' | 'unassigned' | 'kyc' | 'tickets' | 'payouts' }

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
      { href: '/promotions', label: 'Promotions', icon: BadgePercent },
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
      { href: '/catalog', label: 'Services & Pricing', icon: Tags },
      { href: '/reports', label: 'Reports', icon: ChartColumn },
    ],
  },
  { group: 'Content', items: [{ href: '/content', label: 'Content & Media', icon: Images }] },
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

export const TITLES: Record<string, string> = Object.fromEntries(NAV.flatMap((g) => g.items.map((i) => [i.href, i.label])))

/** Counts that sit beside menu items: things waiting on a person. */
export function useBadges() {
  const s = useStore()
  return useMemo(
    () => ({
      emergency: s.bookings.filter((b) => b.priority === 'emergency' && b.status === 'confirmed').length,
      unassigned: s.bookings.filter((b) => b.status === 'confirmed').length,
      kyc: s.technicians.filter((t) => t.kyc === 'pending').length,
      tickets: s.tickets.filter((t) => t.status === 'open').length,
      payouts: s.payouts.filter((p) => p.status === 'pending').length,
    }),
    [s.bookings, s.technicians, s.tickets, s.payouts]
  )
}
