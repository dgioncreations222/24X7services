'use client'

import Link from 'next/link'
import type { Route } from 'next'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { Tone } from '@/lib/status'
import { SideTag, type Side } from './Avatar'
import { tone } from './Chip'

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('rounded-card border border-line bg-card shadow-card', className)} {...rest}>
      {children}
    </div>
  )
}

export function CardHeader({ title, sub, action, className }: { title: React.ReactNode; sub?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-start justify-between gap-3 border-b border-line px-5 py-4', className)}>
      <div className="min-w-0">
        <h2 className="text-[15px] font-extrabold tracking-tight">{title}</h2>
        {sub && <p className="mt-0.5 text-xs font-medium text-muted">{sub}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  )
}

/** Title row every screen opens with: what it is, then what you can do. */
export function PageHeader({ title, sub, actions, side }: { title: string; sub?: React.ReactNode; actions?: React.ReactNode; side?: Side }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {side && <SideTag side={side} className="mb-2" />}
        <h1 className="text-[22px] font-extrabold tracking-tight sm:text-2xl">{title}</h1>
        {sub && <p className="mt-1 text-sm font-medium text-muted">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Page({ children, className }: { children: React.ReactNode; className?: string }) {
  return <main className={cn('mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8', className)}>{children}</main>
}

export function StatCard({
  label,
  value,
  icon,
  toneName = 'brand',
  delta,
  hint,
  href,
}: {
  label: string
  value: React.ReactNode
  icon: React.ReactNode
  toneName?: Tone
  /** Percent change against the comparison period; positive is good unless `invert`. */
  delta?: { value: number; label: string; invert?: boolean }
  hint?: React.ReactNode
  href?: Route
}) {
  const t = tone(toneName)
  const good = delta ? (delta.invert ? delta.value <= 0 : delta.value >= 0) : true
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-bold text-muted">{label}</p>
        <span className={cn('grid size-9 shrink-0 place-items-center rounded-lg [&_svg]:size-[18px]', t.soft, t.text)}>{icon}</span>
      </div>
      <p className="num mt-1 text-[26px] font-extrabold leading-tight tracking-tight">{value}</p>
      <div className="mt-2 flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-muted">
        {delta && (
          <span className={cn('num inline-flex items-center gap-0.5 rounded px-1 py-0.5 font-bold', good ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger')}>
            {delta.value >= 0 ? <ArrowUpRight className="size-3.5" aria-hidden /> : <ArrowDownRight className="size-3.5" aria-hidden />}
            {Math.abs(delta.value).toFixed(0)}%
          </span>
        )}
        {delta && <span>{delta.label}</span>}
        {hint}
      </div>
    </>
  )
  const cls = 'block rounded-card border border-line bg-card p-4 shadow-card sm:p-5'
  return href ? (
    <Link href={href} className={cn(cls, 'transition-colors hover:border-line-strong')}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}
