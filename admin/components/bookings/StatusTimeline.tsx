'use client'

import { Check } from 'lucide-react'
import type { AdminBooking, BookingStatus } from '@/lib/data'
import { cn } from '@/lib/cn'
import { BOOKING_STATUS, slot } from './status'

const PATH: BookingStatus[] = ['confirmed', 'assigned', 'en_route', 'arrived', 'in_progress', 'completed']

/**
 * Everything that happened to the booking, oldest first, then the steps
 * still to come (greyed) so it is clear where it stands.
 */
export function StatusTimeline({ booking: b }: { booking: AdminBooking }) {
  const done = new Set(b.timeline.map((e) => e.status))
  const closed = ['completed', 'cancelled', 'refunded', 'failed'].includes(b.status)
  const ahead = closed ? [] : PATH.filter((s) => !done.has(s) && PATH.indexOf(s) > PATH.indexOf(b.status === 'awaiting_approval' ? 'in_progress' : b.status))
  return (
    <ol className="relative space-y-0">
      {b.timeline.map((e, i) => {
        const bad = e.status === 'cancelled' || e.status === 'failed'
        return (
          <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
            <span className={cn('relative z-10 mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-white', bad ? 'bg-danger' : 'bg-success')}>
              <Check className="size-3" strokeWidth={3} aria-hidden />
            </span>
            {(i < b.timeline.length - 1 || ahead.length > 0) && <span aria-hidden className="absolute left-[9px] top-6 h-[calc(100%-1rem)] w-0.5 bg-line" />}
            <div className="min-w-0 text-sm">
              <p className="font-bold">{BOOKING_STATUS[e.status].step}</p>
              <p className="text-xs text-muted">
                {slot(e.at)}
                {e.by && ` · ${e.by}`}
              </p>
              {e.note && <p className="mt-0.5 text-[13px] text-ink-2">{e.note}</p>}
            </div>
          </li>
        )
      })}
      {ahead.map((s, i) => (
        <li key={s} className="relative flex gap-3 pb-4 last:pb-0">
          <span className="relative z-10 mt-0.5 size-5 shrink-0 rounded-full border-2 border-line-strong bg-card" />
          {i < ahead.length - 1 && <span aria-hidden className="absolute left-[9px] top-6 h-[calc(100%-1rem)] w-0.5 bg-line" />}
          <p className="text-sm font-semibold text-faint">{BOOKING_STATUS[s].step}</p>
        </li>
      ))}
    </ol>
  )
}
