'use client'

import { Lock } from 'lucide-react'
import { moduleFor } from './nav'
import { useCan, type AdminAccount } from '@/lib/data'
import { useStore } from '@/lib/store'
import { Logo } from '../Logo'

/** A page the current role has no access to. */
export function Guard({ path, admin, children }: { path: string; admin: AdminAccount; children: React.ReactNode }) {
  const store = useStore()
  const can = useCan()
  const mod = moduleFor(path)
  if (!mod || can(mod)) return <>{children}</>
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center">
      <span className="mb-4 grid size-12 place-items-center rounded-full bg-canvas text-muted">
        <Lock className="size-5" />
      </span>
      <h1 className="text-lg font-extrabold">No access for {store.as}</h1>
      <p className="mt-1 text-sm text-muted">This module isn’t part of the {store.as} role. A Super Admin can grant it in Admin Users → Permissions.</p>
      {store.as !== admin.role && (
        <button type="button" onClick={() => store.viewAs(admin.role)} className="mt-5 h-9 rounded-lg bg-brand px-4 text-sm font-bold text-white hover:bg-brand-deep">
          Back to {admin.role}
        </button>
      )}
    </div>
  )
}

export function Splash() {
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
