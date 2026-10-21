'use client'

import { Menu } from 'lucide-react'
import type { AdminAccount } from '@/lib/data'
import { useTick } from '@/lib/store'
import { AccountMenu } from './AccountMenu'
import { Alerts } from './Alerts'
import { GlobalSearch } from './GlobalSearch'

export function TopBar({ onMenu, title, admin }: { onMenu: () => void; title: string; admin: AdminAccount }) {
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
          <AccountMenu admin={admin} />
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
