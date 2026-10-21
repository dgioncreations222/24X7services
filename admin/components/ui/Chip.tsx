'use client'

import { Star } from 'lucide-react'
import { cn } from '@/lib/cn'
import { BOOKING_STATUS, PRIORITY, type Tone } from '@/lib/status'
import type { BookingStatus, Priority } from '@/lib/types'

const toneClass: Record<Tone, { chip: string; dot: string; soft: string; text: string }> = {
  brand: { chip: 'bg-brand-soft text-brand border-brand/15', dot: 'bg-brand', soft: 'bg-brand-soft', text: 'text-brand' },
  warning: { chip: 'bg-warning-soft text-warning border-warning/20', dot: 'bg-warning', soft: 'bg-warning-soft', text: 'text-warning' },
  info: { chip: 'bg-info-soft text-info border-info/20', dot: 'bg-info', soft: 'bg-info-soft', text: 'text-info' },
  violet: { chip: 'bg-violet-soft text-violet border-violet/20', dot: 'bg-violet', soft: 'bg-violet-soft', text: 'text-violet' },
  success: { chip: 'bg-success-soft text-success border-success/20', dot: 'bg-success', soft: 'bg-success-soft', text: 'text-success' },
  danger: { chip: 'bg-danger-soft text-danger border-danger/20', dot: 'bg-danger', soft: 'bg-danger-soft', text: 'text-danger' },
  neutral: { chip: 'bg-canvas text-muted border-line', dot: 'bg-faint', soft: 'bg-canvas', text: 'text-muted' },
}

export const tone = (t: Tone) => toneClass[t]

export function Chip({ tone: t, children, live, className, dot = true }: { tone: Tone; children: React.ReactNode; live?: boolean; className?: string; dot?: boolean }) {
  const c = toneClass[t]
  return (
    <span className={cn('inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-pill border px-2 text-[11px] font-bold', c.chip, className)}>
      {dot && <span className={cn('size-1.5 rounded-full', c.dot, live && 'animate-blink')} aria-hidden />}
      {children}
    </span>
  )
}

export function StatusChip({ status, className }: { status: BookingStatus; className?: string }) {
  const s = BOOKING_STATUS[status]
  return (
    <Chip tone={s.tone} live={status === 'en_route' || status === 'in_progress'} className={className}>
      {s.label}
    </Chip>
  )
}

export function PriorityTag({ priority }: { priority: Priority }) {
  if (priority === 'normal') return <span className="text-xs font-semibold text-faint">Normal</span>
  const p = PRIORITY[priority]
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center rounded px-1.5 text-[10px] font-extrabold uppercase tracking-wider',
        priority === 'emergency' ? 'bg-danger text-white' : 'border border-warning/30 bg-warning-soft text-warning'
      )}
    >
      {p.label}
    </span>
  )
}

export function Rating({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn('num inline-flex items-center gap-1 text-[13px] font-bold', className)}>
      <Star className="size-3.5 fill-warning text-warning" aria-hidden />
      {value ? value.toFixed(2) : '—'}
    </span>
  )
}
