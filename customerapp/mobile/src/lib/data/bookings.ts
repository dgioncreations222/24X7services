import { useCallback } from 'react'
import type { BookingStatus } from '@app/shared'
import type { Booking } from '@app/shared/catalog-v2'

import { BOOKINGS } from '@/lib/mock/bookings'
import { mockRequest } from '@/lib/mock/request'
import { useAsync, type AsyncState } from '@/lib/useAsync'

/**
 * The customer's bookings. Same split as lib/data/catalog: async functions the
 * backend swap replaces, and hooks the screens call.
 */

/** Statuses after which nothing more happens to a booking: the Past tab. */
const FINISHED: readonly BookingStatus[] = ['completed', 'cancelled', 'refunded', 'failed']

/** True while the booking is still to happen or happening: the Upcoming tab. */
export function isUpcoming(booking: Booking): boolean {
  return !FINISHED.includes(booking.status)
}

/** Every booking, newest slot first. */
export function fetchBookings(): Promise<Booking[]> {
  const list = [...BOOKINGS].sort((a, b) =>
    `${b.slot.date} ${b.slot.start}`.localeCompare(`${a.slot.date} ${a.slot.start}`)
  )
  return mockRequest(list)
}

/** One booking, or null when there is no booking with that id. */
export function fetchBookingById(id: string): Promise<Booking | null> {
  return mockRequest(BOOKINGS.find((b) => b.id === id) ?? null)
}

export function useBookings(): AsyncState<Booking[]> {
  return useAsync(fetchBookings)
}

export function useBooking(id: string): AsyncState<Booking | null> {
  return useAsync(useCallback(() => fetchBookingById(id), [id]))
}
