import type { TicketPriority, TicketStatus } from '@/lib/data'
import type { Tone } from '@/lib/status'

export const STATUS: Record<TicketStatus, { label: string; tone: Tone }> = {
  open: { label: 'Open', tone: 'warning' },
  in_progress: { label: 'In progress', tone: 'brand' },
  resolved: { label: 'Resolved', tone: 'success' },
}

export const PRIORITY: Record<TicketPriority, { label: string; tone: Tone; rank: number }> = {
  urgent: { label: 'Urgent', tone: 'danger', rank: 0 },
  high: { label: 'High', tone: 'warning', rank: 1 },
  normal: { label: 'Normal', tone: 'brand', rank: 2 },
  low: { label: 'Low', tone: 'neutral', rank: 3 },
}

/** 20 Oct, 4:15 PM */
export const when = (ms: number) =>
  new Date(ms).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }).replace(/am|pm/, (m) => m.toUpperCase())
