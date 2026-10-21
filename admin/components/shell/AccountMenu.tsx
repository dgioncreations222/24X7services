'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ChevronDown, LogOut, Settings } from 'lucide-react'
import { cn } from '@/lib/cn'
import { signOut, type AdminAccount } from '@/lib/data'
import { useStore } from '@/lib/store'
import { ADMIN_ROLES, type AdminRole } from '@/lib/types'
import { Avatar } from '../ui'

/**
 * Who is signed in, Settings and Logout. A Super Admin can also preview the
 * console as another role; everyone else always sees their own.
 */
export function AccountMenu({ admin }: { admin: AdminAccount }) {
  const store = useStore()
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const previewing = store.as !== admin.role
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])
  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-canvas">
        <Avatar name={admin.name} size={32} />
        <span className="hidden text-left leading-tight md:block">
          <span className="block text-[13px] font-bold">{admin.name}</span>
          <span className={cn('block text-[11px] font-semibold', previewing ? 'text-warning' : 'text-muted')}>
            {previewing ? `Viewing as ${store.as}` : admin.role}
          </span>
        </span>
        <ChevronDown className="hidden size-4 text-faint md:block" aria-hidden />
      </button>
      {open && (
        <div className="animate-fade absolute right-0 top-12 z-50 w-60 rounded-xl border border-line bg-card p-1.5 shadow-float">
          <div className="border-b border-line px-3 pb-2.5 pt-1.5">
            <p className="text-sm font-bold">{admin.name}</p>
            <p className="truncate text-xs text-muted">{admin.email}</p>
          </div>
          {admin.role === 'Super Admin' && (
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
          )}
          <Link href="/settings" onClick={() => setOpen(false)} className="mt-1 flex h-9 items-center gap-2.5 rounded-lg border-t border-line px-3 pt-1 text-sm font-semibold hover:bg-canvas">
            <Settings className="size-4" aria-hidden /> Settings
          </Link>
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-sm font-semibold text-danger hover:bg-danger-soft"
          >
            <LogOut className="size-4" aria-hidden /> Logout
          </button>
        </div>
      )}
    </div>
  )
}
