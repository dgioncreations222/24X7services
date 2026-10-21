import { FLOW, type FlowStep, type Job, type JobStatus } from './types'

export type Tone = 'brand' | 'warning' | 'info' | 'violet' | 'success' | 'danger' | 'neutral'

export const STATUS: Record<JobStatus, { label: string; tone: Tone }> = {
  request: { label: 'New request', tone: 'brand' },
  assigned: { label: 'Pending', tone: 'warning' },
  accepted: { label: 'Accepted', tone: 'brand' },
  on_the_way: { label: 'On the way', tone: 'info' },
  arrived: { label: 'Arrived', tone: 'violet' },
  diagnosis: { label: 'Diagnosing', tone: 'violet' },
  repair: { label: 'In repair', tone: 'violet' },
  repaired: { label: 'Repair done', tone: 'success' },
  confirmation: { label: 'Awaiting sign-off', tone: 'success' },
  closed: { label: 'Completed', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'danger' },
  rejected: { label: 'Declined', tone: 'neutral' },
}

export const STEP_LABEL: Record<FlowStep, string> = {
  assigned: 'Job assigned',
  accepted: 'Job accepted',
  on_the_way: 'On the way',
  arrived: 'Arrived at location',
  diagnosis: 'Diagnosis started',
  repair: 'Repair in progress',
  repaired: 'Repair completed',
  confirmation: 'Customer confirmation',
  closed: 'Job closed',
}

/** The filter buckets the Jobs and History screens offer. */
export const STATUS_FILTERS = [
  { key: 'pending', label: 'Pending', match: ['request', 'assigned'] },
  { key: 'accepted', label: 'Accepted', match: ['accepted'] },
  { key: 'on_the_way', label: 'On The Way', match: ['on_the_way'] },
  { key: 'in_progress', label: 'In Progress', match: ['arrived', 'diagnosis', 'repair', 'repaired', 'confirmation'] },
  { key: 'completed', label: 'Completed', match: ['closed'] },
  { key: 'cancelled', label: 'Cancelled', match: ['cancelled', 'rejected'] },
] as const satisfies readonly { key: string; label: string; match: readonly JobStatus[] }[]

export type StatusFilter = (typeof STATUS_FILTERS)[number]['key']

export function inFilter(status: JobStatus, key: StatusFilter): boolean {
  const f = STATUS_FILTERS.find((s) => s.key === key)
  return (f?.match as readonly JobStatus[] | undefined)?.includes(status) ?? false
}

export const ACTIVE: JobStatus[] = ['accepted', 'on_the_way', 'arrived', 'diagnosis', 'repair', 'repaired', 'confirmation']
export const IN_PROGRESS: JobStatus[] = ['arrived', 'diagnosis', 'repair', 'repaired', 'confirmation']

export function isActive(job: Job): boolean {
  return ACTIVE.includes(job.status)
}

export function isOpen(job: Job): boolean {
  return job.status === 'assigned' || isActive(job)
}

export function stepIndex(status: JobStatus): number {
  return FLOW.indexOf(status as FlowStep)
}

/** The one button a job's screen leads with, in the order the work happens. */
export const NEXT_ACTION: Partial<Record<JobStatus, { label: string; to: FlowStep }>> = {
  assigned: { label: 'Accept Job', to: 'accepted' },
  accepted: { label: 'On The Way', to: 'on_the_way' },
  on_the_way: { label: 'Arrived', to: 'arrived' },
  arrived: { label: 'Start Diagnosis', to: 'diagnosis' },
  diagnosis: { label: 'Start Repair', to: 'repair' },
  repair: { label: 'Complete Repair', to: 'repaired' },
  repaired: { label: 'Generate Bill', to: 'confirmation' },
  confirmation: { label: 'Close Job', to: 'closed' },
}
