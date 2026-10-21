'use client'

import { UserRound, Wrench } from 'lucide-react'
import { cn } from '@/lib/cn'
import { initials } from '@/lib/format'

const AVATAR_BG = [
  'from-avatar-blue to-avatar-blue-deep',
  'from-avatar-teal to-avatar-teal-deep',
  'from-avatar-purple to-avatar-purple-deep',
  'from-avatar-orange to-avatar-orange-deep',
  'from-avatar-green to-avatar-green-deep',
]

export type Side = 'customer' | 'technician'

const SIDE_BG: Record<Side, string> = {
  customer: 'from-avatar-cust to-avatar-cust-deep',
  technician: 'from-avatar-tech to-avatar-tech-deep',
}

/** Initials in a circle: blue for a customer, green for a technician, mixed for staff. */
export function Avatar({ name, size = 36, className, side }: { name: string; size?: number; className?: string; side?: Side }) {
  const h = [...name].reduce((s, c) => s + c.charCodeAt(0), 0)
  return (
    <span
      aria-hidden
      className={cn('grid shrink-0 place-items-center rounded-full bg-gradient-to-br font-extrabold text-white', side ? SIDE_BG[side] : AVATAR_BG[h % AVATAR_BG.length], className)}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(name)}
    </span>
  )
}

/** Names which side of the network a record belongs to. */
export function SideTag({ side, className, label }: { side: Side; className?: string; label?: string }) {
  const Icon = side === 'customer' ? UserRound : Wrench
  return (
    <span
      className={cn(
        'inline-flex h-6 shrink-0 items-center gap-1 rounded-md px-2 text-[11px] font-extrabold uppercase tracking-[0.06em]',
        side === 'customer' ? 'bg-cust-soft text-cust' : 'bg-tech-soft text-tech',
        className
      )}
    >
      <Icon className="size-3.5" strokeWidth={2.4} aria-hidden />
      {label ?? (side === 'customer' ? 'Customer side' : 'Technician side')}
    </span>
  )
}
