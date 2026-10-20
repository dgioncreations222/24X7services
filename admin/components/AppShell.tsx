'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useAdminSession } from '@/lib/data'
import { actAs, useStore } from '@/lib/store'
import { Guard, Splash } from './shell/Guard'
import { TITLES } from './shell/nav'
import { SidebarBody } from './shell/Sidebar'
import { TopBar } from './shell/TopBar'
import { ToastProvider } from './toast'

/**
 * The frame around every console page: holds on a splash until the saved
 * session is read, sends anyone not signed in as an admin to /login, and
 * draws the sidebar (a drawer on a phone) and top bar. The pieces live in
 * ./shell/.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const store = useStore()
  const session = useAdminSession()
  const bare = pathname === '/' || pathname.startsWith('/login')
  const [menuOpen, setMenuOpen] = useState(false)
  const signedOut = session.status === 'signed_out'
  const admin = session.status === 'signed_in' ? session.admin : null
  // Before any page renders, so the older pages greet and log the right admin.
  if (admin) actAs(admin)

  useEffect(() => {
    if (signedOut && !bare) router.replace('/login')
  }, [signedOut, bare, router])

  // The console opens as the signed-in admin's own role, once per sign-in.
  const { viewAs } = store
  const openedFor = useRef<string | null>(null)
  useEffect(() => {
    if (!admin || openedFor.current === admin.id) return
    openedFor.current = admin.id
    viewAs(admin.role)
  }, [admin, viewAs])

  // A route change closes the phone drawer.
  const [lastPath, setLastPath] = useState(pathname)
  if (lastPath !== pathname) {
    setLastPath(pathname)
    setMenuOpen(false)
  }

  if (!store.ready || session.status === 'loading') return <Splash />
  if (bare) return <ToastProvider>{children}</ToastProvider>
  if (!admin) return <Splash />

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
          <TopBar onMenu={() => setMenuOpen(true)} title={TITLES['/' + (pathname.split('/')[1] ?? '')] ?? 'Admin'} admin={admin} />
          <div className="flex-1">
            <Guard path={'/' + (pathname.split('/')[1] ?? '')} admin={admin}>
              {children}
            </Guard>
          </div>
        </div>
      </div>
    </ToastProvider>
  )
}
