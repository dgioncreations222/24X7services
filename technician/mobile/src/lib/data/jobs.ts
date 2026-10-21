/**
 * Jobs: the lists, one job, and everything a technician does to a job.
 * Actions are plain async functions — they resolve when the (mock) backend
 * has the change and throw a NetworkError when it could not be saved, so a
 * screen can show a toast and let the technician try again.
 */
import { mockRequest, mockUpload } from '../mock/api'
import { customerPays, customerReviewsExtra, queueNextOffer } from '../mock/customer'
import { read, write } from '../mock/db'
import { useResource, type Query } from './query'
import type { JobExtra, JobPhoto, JobsView, PartnerJob, PartnerJobStatus, RateCardItem } from './types'

const ONGOING: readonly PartnerJobStatus[] = ['en_route', 'arrived', 'in_progress', 'awaiting_approval']

const inView: Record<JobsView, (j: PartnerJob) => boolean> = {
  offers: (j) => j.status === 'offered',
  upcoming: (j) => j.status === 'assigned',
  ongoing: (j) => ONGOING.includes(j.status),
  completed: (j) => j.status === 'completed' || j.status === 'cancelled',
}

/** Completed lists newest first; everything else in slot order. */
const order = (view: JobsView) => (a: PartnerJob, b: PartnerJob) =>
  view === 'completed' ? b.slotStart - a.slotStart : a.slotStart - b.slotStart

export function useJobs(view: JobsView): Query<PartnerJob[]> {
  return useResource((db) => db.jobs.filter(inView[view]).sort(order(view)))
}

/** One job; `data` is null (not undefined) once loaded if there is no such job. */
export function useJob(id: string | undefined): Query<PartnerJob | null> {
  return useResource((db) => db.jobs.find((j) => j.id === id) ?? null)
}

/** The admin's rate card for one category, active items only. */
export function useRateCard(categoryId: string | undefined): Query<RateCardItem[]> {
  return useResource((db) => db.rateCard.filter((r) => r.active && r.categoryId === categoryId))
}

/* --------------------------------------------------------------- Actions */

/** A step the job is not ready for — say what is missing rather than fail quietly. */
export class JobStepError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'JobStepError'
  }
}

function job(id: string): PartnerJob {
  const j = read().jobs.find((x) => x.id === id)
  if (!j) throw new JobStepError('This job is no longer available.')
  return j
}

function patch(id: string, fn: (j: PartnerJob) => PartnerJob) {
  write((db) => ({ ...db, jobs: db.jobs.map((j) => (j.id === id ? fn(j) : j)) }))
}

function move(id: string, from: readonly PartnerJobStatus[], to: PartnerJobStatus) {
  return mockRequest(() => {
    const j = job(id)
    if (!from.includes(j.status)) throw new JobStepError(`Can’t move a job from ${j.status} to ${to}.`)
    patch(id, (x) => ({ ...x, status: to, offerExpiresAt: undefined, timeline: [...x.timeline, { status: to, at: Date.now() }] }))
  })
}

export async function acceptJob(id: string) {
  await move(id, ['offered'], 'assigned')
  queueNextOffer()
}

/** Turn down an offer (or let its timer run out); dispatch offers it to the next technician. */
export function rejectJob(id: string) {
  return mockRequest(() => {
    if (job(id).status !== 'offered') throw new JobStepError('Only a new request can be rejected.')
    write((db) => ({ ...db, jobs: db.jobs.filter((j) => j.id !== id) }))
    queueNextOffer()
  })
}

export const markOnTheWay = (id: string) => move(id, ['assigned'], 'en_route')
export const markArrived = (id: string) => move(id, ['en_route'], 'arrived')

/** Starts work. Needs at least one before photo — the screen keeps Start disabled until then. */
export function startJob(id: string) {
  if (read().jobs.find((j) => j.id === id)?.photos.before.length === 0) {
    return Promise.reject(new JobStepError('Take a before photo first.'))
  }
  return move(id, ['arrived'], 'in_progress')
}

/** Finishes work. Needs an after photo, and no extra still waiting on the customer. */
export function completeJob(id: string) {
  const j = read().jobs.find((x) => x.id === id)
  if (j && j.photos.after.length === 0) return Promise.reject(new JobStepError('Take an after photo first.'))
  if (j?.extras.some((e) => e.status === 'pending')) return Promise.reject(new JobStepError('Wait for the customer to approve the extra charges.'))
  return move(id, ['in_progress'], 'completed').then(() => customerPays(id))
}

/**
 * Add a part from the rate card (its price is fixed) or an "Other" line
 * with a name and amount. Either way it waits for the customer's approval.
 */
export function addExtra(id: string, extra: Pick<JobExtra, 'source' | 'rateCardItemId' | 'name' | 'amount'>) {
  return mockRequest(() => {
    const j = job(id)
    if (j.status !== 'in_progress' && j.status !== 'awaiting_approval') throw new JobStepError('Extras can be added once the job has started.')
    const line: JobExtra = { ...extra, id: `ex-${Date.now()}`, status: 'pending' }
    patch(id, (x) => ({ ...x, status: 'awaiting_approval', extras: [...x.extras, line] }))
    customerReviewsExtra(id, line.id)
    return line
  })
}

/** Upload a before / after photo; `onProgress` gets 0–1 while it goes up. */
export async function uploadPhoto(id: string, kind: 'before' | 'after', uri: string, onProgress?: (fraction: number) => void) {
  job(id)
  await mockUpload(onProgress)
  const photo: JobPhoto = { id: `ph-${Date.now()}`, url: uri, takenAt: Date.now() }
  patch(id, (x) => ({ ...x, photos: { ...x.photos, [kind]: [...x.photos[kind], photo] } }))
  return photo
}
