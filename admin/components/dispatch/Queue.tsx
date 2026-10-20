'use client'

import { Siren, UserRoundPlus, UserRoundX } from 'lucide-react'
import { BOOKING_STATUS, slot } from '@/components/bookings/status'
import { Button, Chip } from '@/components/ui'
import type { AdminBooking, Partner } from '@/lib/data'
import { cn } from '@/lib/cn'

/** One dispatch list: a booking per row, its slot and place, and Assign. */
export function Queue({
  rows,
  partners,
  onOpen,
  onAssign,
  empty,
}: {
  rows: AdminBooking[]
  partners: Partner[]
  onOpen: (id: string) => void
  onAssign?: (b: AdminBooking) => void
  empty: string
}) {
  if (!rows.length) return <p className="px-5 py-6 text-center text-sm font-semibold text-muted">{empty}</p>
  return (
    <ul className="divide-y divide-line">
      {rows.map((b) => {
        const tech = partners.find((p) => p.id === b.technicianId)
        const urgent = b.priority === 'emergency' || b.dispatch.noTechFound
        return (
          <li key={b.id} className={cn('flex items-center gap-3 px-4 py-3', urgent && b.status === 'confirmed' && 'bg-danger-soft/40')}>
            <span className={cn('grid size-9 shrink-0 place-items-center rounded-lg', urgent ? 'bg-danger-soft text-danger' : 'bg-brand-soft text-brand')}>
              {b.dispatch.noTechFound ? <UserRoundX className="size-4" /> : b.priority === 'emergency' ? <Siren className="size-4" /> : <span className="num text-[11px] font-extrabold">{new Date(b.slotStart).getHours()}h</span>}
            </span>
            <button type="button" onClick={() => onOpen(b.id)} className="min-w-0 flex-1 text-left">
              <span className="block truncate text-sm font-bold">
                <span className="num">{b.displayId}</span> · {b.serviceName}
              </span>
              <span className="block truncate text-xs text-muted">
                {slot(b.slotStart)} · {b.area}
                {tech ? ` · ${tech.name}` : b.dispatch.noTechFound ? ` · ${b.dispatch.declinedBy.length} said no` : ''}
              </span>
            </button>
            {onAssign ? (
              <Button size="sm" variant={urgent ? 'danger' : 'primary'} onClick={() => onAssign(b)}>
                <UserRoundPlus /> Assign
              </Button>
            ) : (
              <Chip tone={BOOKING_STATUS[b.status].tone} live={b.status === 'en_route' || b.status === 'in_progress'}>
                {BOOKING_STATUS[b.status].label}
              </Chip>
            )}
          </li>
        )
      })}
    </ul>
  )
}
