import type { Href } from 'expo-router'
import type { PartnerJobStatus } from '@/lib/data'

type Step = { label: string; href: (id: string) => Href }

const to = (screen: string) => (id: string) => `/jobs/${screen}?id=${id}` as Href

/**
 * The one thing to do next on a job, by status — the big button on Home and
 * on the job screen. Null when there is nothing for the technician to do.
 */
export const NEXT_STEP: Record<PartnerJobStatus, Step | null> = {
  offered: null,
  assigned: { label: 'Start trip', href: to('navigate') },
  en_route: { label: 'I’ve arrived', href: to('navigate') },
  arrived: { label: 'Start job', href: to('start') },
  in_progress: { label: 'Complete job', href: to('complete') },
  awaiting_approval: { label: 'See extra charges', href: to('parts') },
  completed: { label: 'View summary', href: to('summary') },
  cancelled: null,
}
