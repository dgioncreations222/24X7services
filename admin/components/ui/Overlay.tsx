'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, X } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * How many overlays hold the page still. A count, not a saved "previous"
 * value: a drawer and the modal on top of it re-run their effects in an
 * order React does not promise, and restoring a saved value left the page
 * stuck at overflow:hidden — no scrolling at all on a phone.
 */
let locks = 0

function lockScroll() {
  locks++
  document.body.style.overflow = 'hidden'
  return () => {
    locks = Math.max(0, locks - 1)
    if (locks === 0) document.body.style.overflow = ''
  }
}

function useEscape(open: boolean, onClose: () => void) {
  const close = useRef(onClose)
  useEffect(() => {
    close.current = onClose
  })
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close.current()
    document.addEventListener('keydown', onKey)
    const unlock = lockScroll()
    return () => {
      document.removeEventListener('keydown', onKey)
      unlock()
    }
  }, [open])
}

/** A record's detail, slid in from the right so the list stays in view. */
export function Drawer({
  open,
  onClose,
  title,
  sub,
  children,
  footer,
  width = 'max-w-xl',
}: {
  open: boolean
  onClose: () => void
  title: React.ReactNode
  sub?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  width?: string
}) {
  useEscape(open, onClose)
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true">
      <button type="button" aria-label="Close" className="animate-fade absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className={cn('animate-panel absolute inset-y-0 right-0 flex w-full flex-col bg-card shadow-float', width)}>
        <div className="flex items-start gap-2 border-b border-line px-3 py-3 sm:gap-3 sm:px-5 sm:py-4">
          {/* On a phone the drawer fills the screen, so it leads with Back like any page. */}
          <button type="button" onClick={onClose} aria-label="Back" className="grid size-10 shrink-0 place-items-center rounded-lg text-ink hover:bg-canvas sm:hidden">
            <ArrowLeft className="size-5" />
          </button>
          <div className="min-w-0 flex-1 pt-1.5 sm:pt-0">
            <h2 className="truncate text-lg font-extrabold tracking-tight">{title}</h2>
            {sub && <div className="mt-0.5 text-[13px] font-medium text-muted">{sub}</div>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 hidden size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-canvas hover:text-ink sm:grid">
            <X className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-canvas/50 px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body
  )
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  useEscape(open, onClose)
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <button type="button" aria-label="Close" className="animate-fade absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="animate-slide-up relative max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl bg-card shadow-float sm:max-w-md sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-base font-extrabold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 grid size-9 place-items-center rounded-lg text-muted hover:bg-canvas">
            <X className="size-5" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body
  )
}
