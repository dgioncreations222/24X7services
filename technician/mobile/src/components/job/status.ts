import type { PartnerJobStatus } from '@/lib/data'
import type { Tone } from '@/lib/status'

/** How each job status reads on a chip, and its colour. */
export const JOB_STATUS: Record<PartnerJobStatus, { label: string; tone: Tone; live?: boolean }> = {
  offered: { label: 'New request', tone: 'brand', live: true },
  assigned: { label: 'Upcoming', tone: 'info' },
  en_route: { label: 'On the way', tone: 'violet', live: true },
  arrived: { label: 'Arrived', tone: 'warning' },
  in_progress: { label: 'In progress', tone: 'violet', live: true },
  awaiting_approval: { label: 'Waiting for customer', tone: 'warning', live: true },
  completed: { label: 'Completed', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
}

/** The job screen each status opens on from a list. */
export function jobRoute(id: string, status: PartnerJobStatus) {
  return status === 'offered' ? (`/request?id=${id}` as const) : (`/jobs/detail?id=${id}` as const)
}
