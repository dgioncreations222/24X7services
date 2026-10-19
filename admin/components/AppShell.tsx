'use client'

import Link from 'next/link'
import type { Route } from 'next'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BadgePercent,
  ChevronRight,
  FileClock,
  Images,
  Lock,
  ShieldCheck,
  Bell,
  BriefcaseBusiness,
  ChartColumn,
  ChevronDown,
  CreditCard,
  Headset,
  LayoutDashboard,
  LogOut,
  Menu,
  RadioTower,
  Search,
  Settings,
  Star,
  Tags,
  UserRoundCog,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { ago, matches } from '@/lib/format'
import { ADMIN, useStore, useTick } from '@/lib/store'
import { ROUTE_MODULE } from '@/lib/control'
import { ADMIN_ROLES, type AdminRole } from '@/lib/types'
import { APPLIANCE_LABEL, BRAND_LABEL } from '@/lib/catalog'
import { Avatar, type Side } from './ui'
import { Logo } from './Logo'
import { ToastProvider } from './toast'

type Item = { href: Route; label: string; icon: typeof Bell; badge?: 'emergency' | 'unassigned' | 'kyc' | 'tickets' | 'payouts' }

const NAV: { group: string; side?: Side; items: Item[] }[] = [
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

const COLLAPSE_KEY = 'admin.nav.collapsed'

const TITLES: Record<string, string> = Object.fromEntries(NAV.flatMap((g) => g.items.map((i) => [i.href, i.label])))

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const store = useStore()
  const bare = pathname === '/' || pathname.startsWith('/login')
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (store.ready && !store.signedIn && !bare) router.replace('/login')
  }, [store.ready, store.signedIn, bare, router])

  // A route change closes the phone drawer.
  const [lastPath, setLastPath] = useState(pathname)
  if (lastPath !== pathname) {
    setLastPath(pathname)
    setMenuOpen(false)
  }

  if (!store.ready) return <Splash />
  if (bare) return <ToastProvider>{children}</ToastProvider>
  if (!store.signedIn) return <Splash />

  return (
    <ToastProvider>
      <div className="lg:flex">
        <aside className="sticky top-0 hidden h-dvh w-[264px] shrink-0 flex-col border-r border-line bg-card lg:flex">
          <SidebarBody />
        </aside>

        {menuOpen && (
          <div className="fixed inset-0 z-[70] lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
            <button type="button" aria-label="Close menu" className="animate-fade absolute inset-0 bg-ink/50" onClick={() => setMenuOpen(false)} />
            <aside className="animate-drawer absolute inset-y-0 left-0 flex w-[84%] max-w-[300px] flex-col bg-card shadow-float">
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
                className="absolute right-2 top-3 z-10 grid size-10 place-items-center rounded-full text-muted hover:bg-canvas"
              >
                <X className="size-5" />
              </button>
              <SidebarBody />
            </aside>
          </div>
        )}

        <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
          <TopBar
            onMenu={() => setMenuOpen(true)}
            title={TITLES['/' + (pathname.split('/')[1] ?? '')] ?? 'Admin'}
          />
          <div className="flex-1">
            <Guard path={'/' + (pathname.split('/')[1] ?? '')}>{children}</Guard>
          </div>
        </div>
      </div>
    </ToastProvider>
  )
}

/** Counts that sit beside menu items: things waiting on a person. */
function useBadges() {
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

function SidebarBody() {
  const pathname = usePathname()
  const router = useRouter()
  const store = useStore()
  const badges = useBadges()
  const online = store.technicians.filter((t) => t.presence !== 'offline' && t.kyc === 'verified').length
  const verified = store.technicians.filter((t) => t.kyc === 'verified').length
  const [collapsed, setCollapsed] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(COLLAPSE_KEY) ?? '[]') as string[]
    } catch {
      return []
    }
  })
  const toggle = (group: string) => {
    const next = collapsed.includes(group) ? collapsed.filter((g) => g !== group) : [...collapsed, group]
    setCollapsed(next)
    try {
      localStorage.setItem(COLLAPSE_KEY, JSON.stringify(next))
    } catch {
      /* per-viewer convenience only */
    }
  }
  const groups = NAV.map((g) => ({ ...g, items: g.items.filter((i) => store.can(ROUTE_MODULE[i.href] ?? 'dashboard')) })).filter((g) => g.items.length)
  return (
    <>
      <div className="flex h-16 shrink-0 items-center border-b border-line px-5">
        <Link href="/dashboard" aria-label="Dashboard">
          <Logo />
        </Link>
      </div>

      <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3 py-3">
        {groups.map((g) => {
          // The group holding the current page never folds away.
          const hasActive = g.items.some((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))
          const shut = collapsed.includes(g.group) && !hasActive
          return (
          <div key={g.group} className="mb-2 last:mb-0">
            <button
              type="button"
              onClick={() => toggle(g.group)}
              aria-expanded={!shut}
              className={cn(
                'group/h flex w-full items-center gap-1.5 rounded-md px-3 pb-1.5 pt-2 text-left text-[10.5px] font-extrabold uppercase tracking-[0.14em]',
                g.side === 'customer' ? 'text-cust' : g.side === 'technician' ? 'text-tech' : 'text-faint hover:text-muted'
              )}
            >
              {g.side && <span className={cn('size-1.5 rounded-full', g.side === 'customer' ? 'bg-cust' : 'bg-tech')} aria-hidden />}
              <span className="flex-1">{g.group}</span>
              <ChevronDown className={cn('size-3.5 opacity-0 transition-[transform,opacity] group-hover/h:opacity-70', shut && '-rotate-90 opacity-70')} aria-hidden />
            </button>
            {!shut && <ul className={cn('space-y-0.5', g.side && 'ml-1.5 border-l-2 pl-1.5', g.side === 'customer' && 'border-cust/25', g.side === 'technician' && 'border-tech/25')}>
              {g.items.map(({ href, label, icon: Icon, badge }) => {
                const active = pathname === href || pathname.startsWith(`${href}/`)
                const n = badge ? badges[badge] : 0
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition-colors',
                        active
                          ? g.side === 'customer'
                            ? 'bg-cust-soft text-cust'
                            : g.side === 'technician'
                              ? 'bg-tech-soft text-tech'
                              : 'bg-brand-soft text-brand'
                          : 'text-ink-2 hover:bg-canvas hover:text-ink'
                      )}
                    >
                      <Icon
                        className={cn('size-[18px] shrink-0', !active && g.side === 'customer' && 'text-cust', !active && g.side === 'technician' && 'text-tech')}
                        strokeWidth={active ? 2.3 : 1.9}
                        aria-hidden
                      />
                      <span className="flex-1 truncate">{label}</span>
                      {n > 0 && (
                        <span
                          className={cn(
                            'num grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold',
                            badge === 'emergency' ? 'bg-danger text-white' : badge === 'kyc' || badge === 'tickets' ? 'bg-warning text-white' : 'bg-brand-soft text-brand',
                            active && badge === 'unassigned' && 'bg-brand text-white'
                          )}
                          aria-label={`${n} waiting`}
                        >
                          {n}
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>}
          </div>
          )
        })}
        {/* A soft edge so a long menu reads as "more below", not cut off. */}
        <div aria-hidden className="pointer-events-none sticky -bottom-3 -mx-3 -mb-3 h-8 bg-gradient-to-t from-card to-transparent" />
      </nav>

      <div className="shrink-0 border-t border-line p-3">
        <Link
          href="/dispatch"
          aria-label={`Network live, ${online} of ${verified} technicians online. Open Live Dispatch`}
          className="group mb-1.5 flex items-center gap-2.5 rounded-lg bg-canvas px-3 py-2 transition-colors hover:bg-success-soft"
        >
          <span className="relative grid size-2.5 place-items-center" aria-hidden>
            <span className="animate-blink absolute inset-0 rounded-full bg-success/40" />
            <span className="size-2 rounded-full bg-success" />
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-success">Network live</span>
            <span className="num block text-xs font-bold text-ink-2">
              {online}/{verified} technicians online
            </span>
          </span>
          <ChevronRight className="size-4 text-faint transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
        <button
          type="button"
          onClick={() => {
            store.signOut()
            router.replace('/login')
          }}
          className="flex h-9 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold text-danger hover:bg-danger-soft"
        >
          <LogOut className="size-[18px]" aria-hidden /> Logout
        </button>
      </div>
    </>
  )
}

/* -------------------------------------------------------------- Top bar */

function TopBar({ onMenu, title }: { onMenu: () => void; title: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-card/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-1 px-2 sm:gap-3 sm:px-6 lg:px-8">
        <button type="button" aria-label="Open menu" onClick={onMenu} className="grid size-10 shrink-0 place-items-center rounded-lg text-ink hover:bg-canvas lg:hidden">
          <Menu className="size-5" />
        </button>

        <p className="truncate text-[15px] font-extrabold sm:hidden">{title}</p>
        <GlobalSearch />
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Clock />
          <Alerts />
          <AccountMenu />
        </div>
      </div>
    </header>
  )
}

function Clock() {
  const now = useTick(30_000)
  const d = new Date(now)
  return (
    <span className="hidden items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-ink-2 xl:inline-flex">
      <span className="size-1.5 rounded-full bg-success" aria-hidden />
      Hyderabad ·{' '}
      <span className="num">
        {d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })},{' '}
        {d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase()}
      </span>
    </span>
  )
}

/** One box that finds a booking, a customer or a technician by anything about them. */
function GlobalSearch() {
  const store = useStore()
  const router = useRouter()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDown = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement))) {
        e.preventDefault()
        box.current?.querySelector('input')?.focus()
        setOpen(true)
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  const results = useMemo(() => {
    if (q.trim().length < 2) return null
    const bookings = store.bookings
      .filter((b) => matches([b.id, store.customer(b.customerId)?.name, BRAND_LABEL[b.brand], APPLIANCE_LABEL[b.appliance], b.area, b.issue], q))
      .slice(0, 5)
    const customers = store.customers.filter((c) => matches([c.id, c.name, c.phone.replace(/\s/g, ''), c.email, c.area], q)).slice(0, 4)
    const techs = store.technicians.filter((t) => matches([t.id, t.name, t.phone.replace(/\s/g, ''), t.area], q)).slice(0, 4)
    return { bookings, customers, techs }
  }, [q, store])

  const go = (href: string) => {
    setOpen(false)
    setQ('')
    router.push(href as Route)
  }
  const none = results && !results.bookings.length && !results.customers.length && !results.techs.length

  return (
    <div ref={box} className="relative hidden w-full max-w-md sm:block">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden />
      <input
        type="search"
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search bookings, customers, technicians…"
        aria-label="Search"
        className="h-10 w-full rounded-lg border border-line bg-canvas pl-9 pr-12 text-sm font-medium placeholder:text-faint focus:border-brand focus:bg-card focus:shadow-[0_0_0_3px_rgba(37,71,208,0.15)]"
      />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-line-strong bg-card px-1.5 text-[10px] font-bold text-faint md:block">Ctrl K</kbd>
      {open && results && (
        <div className="animate-fade absolute inset-x-0 top-12 z-50 max-h-[70dvh] overflow-y-auto rounded-xl border border-line bg-card p-2 shadow-float">
          {none && <p className="px-3 py-6 text-center text-sm font-semibold text-muted">Nothing matches “{q}”</p>}
          {!!results.bookings.length && <ResultGroup label="Bookings" />}
          {results.bookings.map((b) => (
            <ResultRow
              key={b.id}
              onClick={() => go(`/bookings/?id=${b.id}`)}
              title={`${b.id} · ${BRAND_LABEL[b.brand]} ${APPLIANCE_LABEL[b.appliance]}`}
              sub={`${store.customer(b.customerId)?.name} · ${b.area}`}
            />
          ))}
          {!!results.customers.length && <ResultGroup label="Customers" />}
          {results.customers.map((c) => (
            <ResultRow key={c.id} onClick={() => go(`/customers/?id=${c.id}`)} title={c.name} sub={`${c.id} · ${c.area}`} avatar={c.name} side="customer" />
          ))}
          {!!results.techs.length && <ResultGroup label="Technicians" />}
          {results.techs.map((t) => (
            <ResultRow key={t.id} onClick={() => go(`/technicians/?id=${t.id}`)} title={t.name} sub={`${t.id} · ${t.area}`} avatar={t.name} side="technician" />
          ))}
        </div>
      )}
    </div>
  )
}

function ResultGroup({ label }: { label: string }) {
  return <p className="px-3 pb-1 pt-2 text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-faint">{label}</p>
}

function ResultRow({ title, sub, onClick, avatar, side }: { title: string; sub: string; onClick: () => void; avatar?: string; side?: Side }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-canvas">
      {avatar ? <Avatar name={avatar} size={28} side={side} /> : <span className="grid size-7 place-items-center rounded-md bg-brand-soft text-brand"><BriefcaseBusiness className="size-3.5" /></span>}
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold">{title}</span>
        <span className="block truncate text-xs font-medium text-muted">{sub}</span>
      </span>
    </button>
  )
}

/** Everything that needs a person, newest first. */
function useAlerts() {
  const s = useStore()
  return useMemo(() => {
    const out: { id: string; tone: 'danger' | 'warning' | 'brand'; title: string; body: string; href: string; at: string }[] = []
    for (const b of s.bookings) {
      if (b.priority === 'emergency' && b.status === 'confirmed')
        out.push({ id: `em-${b.id}`, tone: 'danger', title: 'Emergency waiting for a technician', body: `${b.id} · ${BRAND_LABEL[b.brand]} ${APPLIANCE_LABEL[b.appliance]}, ${b.area}`, href: `/dispatch/?id=${b.id}`, at: b.createdAt })
    }
    for (const t of s.tickets) {
      if (t.status === 'open' && (t.priority === 'urgent' || t.priority === 'high'))
        out.push({ id: `tk-${t.id}`, tone: t.priority === 'urgent' ? 'danger' : 'warning', title: `${t.priority === 'urgent' ? 'Urgent' : 'High priority'} ticket from a ${t.side}`, body: `${t.id} · ${t.subject}`, href: `/support/?id=${t.id}`, at: t.createdAt })
    }
    for (const t of s.technicians) {
      if (t.kyc === 'pending') out.push({ id: `kyc-${t.id}`, tone: 'warning', title: 'Technician application to review', body: `${t.name} · ${t.experienceYears} yrs, ${t.area}`, href: `/technicians/?id=${t.id}`, at: t.joinedAt })
    }
    for (const r of s.reviews) {
      if (r.status === 'flagged') out.push({ id: `rv-${r.id}`, tone: 'warning', title: `${r.rating}★ review flagged`, body: r.text || 'No comment left', href: '/reviews', at: r.at })
    }
    return out.sort((a, b) => b.at.localeCompare(a.at))
  }, [s.bookings, s.tickets, s.technicians, s.reviews])
}

function Alerts() {
  const store = useStore()
  const router = useRouter()
  const alerts = useAlerts()
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const unseen = alerts.filter((a) => !store.seen.includes(a.id)).length
  useTick(60_000)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-label={`Notifications${unseen ? `, ${unseen} new` : ''}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative grid size-10 place-items-center rounded-lg text-ink-2 hover:bg-canvas"
      >
        <Bell className="size-5" />
        {unseen > 0 && (
          <span className="num absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white ring-2 ring-card">{unseen}</span>
        )}
      </button>
      {open && (
        <div className="animate-fade fixed inset-x-3 top-16 z-50 rounded-xl border border-line bg-card shadow-float sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-96">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-extrabold">Needs attention</p>
            {unseen > 0 && (
              <button type="button" onClick={() => store.markSeen(alerts.map((a) => a.id))} className="text-xs font-bold text-brand hover:underline">
                Mark all as seen
              </button>
            )}
          </div>
          <ul className="max-h-[60dvh] overflow-y-auto p-1.5">
            {alerts.length === 0 && <li className="px-3 py-8 text-center text-sm font-semibold text-muted">All clear — nothing waiting.</li>}
            {alerts.map((a) => {
              const fresh = !store.seen.includes(a.id)
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => {
                      store.markSeen([a.id])
                      setOpen(false)
                      router.push(a.href as Route)
                    }}
                    className="flex w-full gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-canvas"
                  >
                    <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', a.tone === 'danger' ? 'bg-danger' : a.tone === 'warning' ? 'bg-warning' : 'bg-brand', !fresh && 'opacity-30')} />
                    <span className="min-w-0 flex-1">
                      <span className={cn('block text-[13px] font-bold', !fresh && 'text-muted')}>{a.title}</span>
                      <span className="block truncate text-xs font-medium text-muted">{a.body}</span>
                    </span>
                    <span className="shrink-0 text-[11px] font-semibold text-faint">{ago(a.at)}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

function AccountMenu() {
  const store = useStore()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])
  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-canvas">
        <Avatar name={ADMIN.name} size={32} />
        <span className="hidden text-left leading-tight md:block">
          <span className="block text-[13px] font-bold">{ADMIN.name}</span>
          <span className={cn('block text-[11px] font-semibold', store.as === ADMIN.role ? 'text-muted' : 'text-warning')}>
            {store.as === ADMIN.role ? ADMIN.role : `Viewing as ${store.as}`}
          </span>
        </span>
        <ChevronDown className="hidden size-4 text-faint md:block" aria-hidden />
      </button>
      {open && (
        <div className="animate-fade absolute right-0 top-12 z-50 w-60 rounded-xl border border-line bg-card p-1.5 shadow-float">
          <div className="border-b border-line px-3 pb-2.5 pt-1.5">
            <p className="text-sm font-bold">{ADMIN.name}</p>
            <p className="truncate text-xs text-muted">{ADMIN.email}</p>
          </div>
          <label className="mt-1.5 block px-3 pb-1.5">
            <span className="text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-faint">View console as</span>
            <select
              value={store.as}
              onChange={(e) => store.viewAs(e.target.value as AdminRole)}
              className="mt-1 h-8 w-full rounded-md border border-line-strong bg-card px-2 text-[13px] font-semibold"
            >
              {ADMIN_ROLES.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
            <span className="mt-1 block text-[11px] text-muted">Preview what each role can see.</span>
          </label>
          <Link href="/settings" onClick={() => setOpen(false)} className="mt-1 flex h-9 items-center gap-2.5 rounded-lg border-t border-line px-3 pt-1 text-sm font-semibold hover:bg-canvas">
            <Settings className="size-4" aria-hidden /> Settings
          </Link>
          <button
            type="button"
            onClick={() => {
              store.signOut()
              router.replace('/login')
            }}
            className="flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-sm font-semibold text-danger hover:bg-danger-soft"
          >
            <LogOut className="size-4" aria-hidden /> Logout
          </button>
        </div>
      )}
    </div>
  )
}

/** A page the current role has no access to. */
function Guard({ path, children }: { path: string; children: React.ReactNode }) {
  const store = useStore()
  const mod = ROUTE_MODULE[path]
  if (!mod || store.can(mod)) return <>{children}</>
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center">
      <span className="mb-4 grid size-12 place-items-center rounded-full bg-canvas text-muted">
        <Lock className="size-5" />
      </span>
      <h1 className="text-lg font-extrabold">No access for {store.as}</h1>
      <p className="mt-1 text-sm text-muted">This module isn’t part of the {store.as} role. A Super Admin can grant it in Admin Users → Permissions.</p>
      {store.as !== ADMIN.role && (
        <button type="button" onClick={() => store.viewAs(ADMIN.role)} className="mt-5 h-9 rounded-lg bg-brand px-4 text-sm font-bold text-white hover:bg-brand-deep">
          Back to {ADMIN.role}
        </button>
      )}
    </div>
  )
}

function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center bg-brand-ink">
      <div className="flex flex-col items-center gap-4">
        <Logo inverted large />
        <div className="h-1 w-24 overflow-hidden rounded-full bg-white/15">
          <div className="animate-loader h-full w-1/2 rounded-full bg-white/70" />
        </div>
      </div>
    </div>
  )
}
