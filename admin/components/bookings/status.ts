import type { AdminBooking, BookingStatus, PaymentStatus } from '@/lib/data'
import type { Tone } from '@/lib/status'

export const BOOKING_STATUS: Record<BookingStatus, { label: string; tone: Tone; step: string }> = {
  pending_payment: { label: 'Awaiting payment', tone: 'neutral', step: 'Booked, waiting for payment' },
  confirmed: { label: 'Unassigned', tone: 'warning', step: 'Confirmed' },
  assigned: { label: 'Assigned', tone: 'brand', step: 'Technician assigned' },
  en_route: { label: 'On the way', tone: 'info', step: 'On the way' },
  arrived: { label: 'Arrived', tone: 'violet', step: 'Arrived' },
  in_progress: { label: 'In progress', tone: 'violet', step: 'Work started' },
  awaiting_approval: { label: 'Extra to approve', tone: 'warning', step: 'Extra sent to the customer' },
  completed: { label: 'Completed', tone: 'success', step: 'Completed' },
  cancelled: { label: 'Cancelled', tone: 'danger', step: 'Cancelled' },
  refunded: { label: 'Refunded', tone: 'neutral', step: 'Refunded' },
  failed: { label: 'Payment failed', tone: 'danger', step: 'Payment failed' },
}

export const PAYMENT_STATUS: Record<PaymentStatus, { label: string; tone: Tone }> = {
  not_required: { label: 'Nothing to pay', tone: 'neutral' },
  pending: { label: 'Not paid yet', tone: 'warning' },
  paid: { label: 'Paid', tone: 'success' },
  partially_paid: { label: 'Partly refunded', tone: 'info' },
  failed: { label: 'Payment failed', tone: 'danger' },
  refunded: { label: 'Refunded', tone: 'neutral' },
}

export const EXTRA_STATUS = {
  pending: { label: 'Waiting for customer', tone: 'warning' },
  approved: { label: 'Approved', tone: 'success' },
  rejected: { label: 'Declined', tone: 'danger' },
} as const satisfies Record<AdminBooking['extras'][number]['status'], { label: string; tone: Tone }>

export const rupees = (paise: number) => '₹' + Math.round(paise / 100).toLocaleString('en-IN')

/** 4:30 PM · Today / Tue 21 Oct */
export function slot(ms: number) {
  const d = new Date(ms)
  const day = new Date(d)
  day.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((day.getTime() - today.getTime()) / 86_400_000)
  const label = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : diff === -1 ? 'Yesterday' : d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
  return `${label}, ${d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase()}`
}
