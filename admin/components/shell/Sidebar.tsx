'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { ChevronDown, ChevronRight, LogOut } from 'lucide-react'
import { cn } from '@/lib/cn'
import { ROUTE_MODULE } from '@/lib/control'
import { signOut } from '@/lib/data'
import { useStore } from '@/lib/store'
import { Logo } from '../Logo'
import { COLLAPSE_KEY, NAV, useBadges } from './nav'

/** Logo, every page the role may open, the network's pulse, and Logout. */
export function SidebarBody() {
  const pathname = usePathname()
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
          onClick={() => void signOut()}
          className="flex h-9 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold text-danger hover:bg-danger-soft"
        >
          <LogOut className="size-[18px]" aria-hidden /> Logout
        </button>
      </div>
    </>
  )
}
