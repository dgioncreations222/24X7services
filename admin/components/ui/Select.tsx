'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { inputClass } from './Field'

/**
 * A dropdown that fits a phone. The browser's own list opens as a tall panel
 * that runs off small screens, so this draws its own: a bottom sheet below
 * `sm`, a popover beside the button above it. Same props as a <select>.
 */
export function Select<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
  disabled,
  full,
}: {
  value: T
  onChange: (v: T) => void
  options: readonly { value: T; label: string }[]
  label: string
  className?: string
  disabled?: boolean
  /** Form-field style: full width, regular weight. */
  full?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [active, setActive] = useState(0)
  const btn = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const current = options.find((o) => o.value === value)

  const show = () => {
    if (disabled || !btn.current) return
    setRect(btn.current.getBoundingClientRect())
    setActive(Math.max(0, options.findIndex((o) => o.value === value)))
    setOpen(true)
  }
  const pick = (v: T) => {
    onChange(v)
    setOpen(false)
    btn.current?.focus()
  }

  useEffect(() => {
    if (!open) return
    const close = (e: Event) => {
      if (list.current?.contains(e.target as Node) || btn.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    const onResize = () => setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('scroll', close, true)
    window.addEventListener('resize', onResize)
    list.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', onResize)
    }
  }, [open])

  const onKey = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        show()
      }
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const next = (active + (e.key === 'ArrowDown' ? 1 : options.length - 1)) % options.length
      setActive(next)
      list.current?.children[next]?.scrollIntoView({ block: 'nearest' })
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const o = options[active]
      if (o) pick(o.value)
    }
  }

  const phone = typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches
  const below = rect ? window.innerHeight - rect.bottom : 0
  const up = rect ? below < 300 && rect.top > below : false

  const items = (
    <ul ref={list} role="listbox" aria-label={label} className={cn('overflow-y-auto overscroll-contain', phone ? 'max-h-[60dvh] px-2 pb-2' : 'max-h-72 p-1')}>
      {options.map((o, i) => {
        const on = o.value === value
        return (
          <li
            key={o.value}
            role="option"
            aria-selected={on}
            onMouseEnter={() => setActive(i)}
            onClick={() => pick(o.value)}
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded-lg px-3 text-sm',
              phone ? 'h-12 font-semibold' : 'h-9 font-medium',
              i === active && 'bg-canvas',
              on ? 'font-bold text-brand' : 'text-ink'
            )}
          >
            <span className="min-w-0 flex-1 truncate">{o.label}</span>
            {on && <Check className="size-4 shrink-0" aria-hidden />}
          </li>
        )
      })}
    </ul>
  )

  return (
    <>
      <button
        ref={btn}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${current?.label ?? ''}`}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKey}
        className={cn(
          inputClass,
          'flex h-10 items-center gap-2 text-left disabled:cursor-not-allowed disabled:opacity-60',
          full ? 'w-full font-medium' : 'w-auto font-semibold',
          open && 'border-brand shadow-focus',
          className
        )}
      >
        <span className="min-w-0 flex-1 truncate">{current?.label ?? label}</span>
        <ChevronDown className={cn('size-4 shrink-0 text-muted transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open &&
        rect &&
        createPortal(
          phone ? (
            <div className="fixed inset-0 z-[95] flex items-end" onKeyDown={onKey}>
              <button type="button" aria-label="Close" className="animate-fade absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
              <div className="animate-slide-up relative w-full rounded-t-2xl bg-card pb-[env(safe-area-inset-bottom)] shadow-float">
                <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line-strong" aria-hidden />
                <div className="flex items-center justify-between px-5 pb-2 pt-3">
                  <p className="text-[15px] font-extrabold">{label}</p>
                  <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="-mr-2 grid size-9 place-items-center rounded-lg text-muted hover:bg-canvas">
                    <X className="size-5" />
                  </button>
                </div>
                {items}
              </div>
            </div>
          ) : (
            <div
              className="animate-fade fixed z-[95] rounded-xl border border-line bg-card shadow-float"
              style={{
                left: Math.min(rect.left, window.innerWidth - Math.max(rect.width, 200) - 8),
                minWidth: Math.max(rect.width, 200),
                ...(up ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
              }}
            >
              {items}
            </div>
          ),
          document.body
        )}
    </>
  )
}
