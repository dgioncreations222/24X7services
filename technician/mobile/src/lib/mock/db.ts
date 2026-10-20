/**
 * The mock backend's data: the demo day from lib/seed, reshaped into
 * lib/data's types and kept in memory. A reload starts the day afresh.
 *
 * `read` returns the current snapshot; `write` replaces it and tells every
 * subscriber, which is how a screen sees a job it accepted move to Ongoing.
 */
import { APPLIANCE_LABEL, BRAND_LABEL } from '../catalog'
import { DEFAULT_SETTINGS, TECHNICIAN, seedJobs, seedReviews } from '../seed'
import type { Job } from '../types'
import type { PartnerJob, PartnerJobStatus, PartnerProfile, PartnerReview, Payout, RateCardItem } from '../data/types'

/** The platform's cut of each job, until the backend says otherwise. */
export const COMMISSION_RATE = 0.2

export interface MockDb {
  jobs: PartnerJob[]
  profile: PartnerProfile
  payouts: Payout[]
  reviews: PartnerReview[]
  rateCard: RateCardItem[]
}

const paise = (rupees: number) => Math.round(rupees * 100)
const ms = (iso?: string) => (iso ? new Date(iso).getTime() : undefined)

const STATUS: Record<Job['status'], PartnerJobStatus | null> = {
  request: 'offered',
  assigned: 'assigned',
  accepted: 'assigned',
  on_the_way: 'en_route',
  arrived: 'arrived',
  diagnosis: 'in_progress',
  repair: 'in_progress',
  repaired: 'in_progress',
  confirmation: 'in_progress',
  closed: 'completed',
  cancelled: 'cancelled',
  rejected: null,
}

export function toPartnerJob(j: Job): PartnerJob | null {
  const status = STATUS[j.status]
  if (!status) return null
  const bill = j.amount ?? j.estFee
  const timeline = (
    [
      ['assigned', j.log.accepted ?? j.log.assigned],
      ['en_route', j.log.on_the_way],
      ['arrived', j.log.arrived],
      ['in_progress', j.log.diagnosis],
      ['completed', j.log.closed],
    ] as const
  ).flatMap(([s, at]) => (at ? [{ status: s as PartnerJobStatus, at: ms(at)! }] : []))
  return {
    id: j.id,
    displayId: `#${j.id.replace(/\D/g, '')}`,
    status,
    priority: j.priority === 'emergency' ? 'emergency' : 'normal',
    service: {
      categoryId: j.appliance,
      categoryName: APPLIANCE_LABEL[j.appliance],
      serviceId: `${j.appliance}-${j.service.toLowerCase().replace(/\s+/g, '-')}`,
      name: `${APPLIANCE_LABEL[j.appliance]} ${j.service.toLowerCase()}`,
    },
    customer: { name: j.customer.name, phone: j.customer.phone },
    address: {
      flat: j.customer.address.split(',')[0] ?? j.customer.address,
      area: j.customer.area,
      landmark: j.customer.landmark,
      city: 'Hyderabad',
      pincode: '500081',
      geo: { lat: j.customer.lat, lng: j.customer.lng },
    },
    slotStart: ms(j.scheduledAt)!,
    durationMin: j.durationMin,
    distanceKm: j.distanceKm,
    etaMin: j.etaMin,
    // What the booking asked the customer; real questions come from the admin's builder.
    answers: [
      { questionId: 'brand', label: 'Brand', value: BRAND_LABEL[j.brand] },
      ...(j.model ? [{ questionId: 'model', label: 'Model', value: j.model }] : []),
      { questionId: 'problem', label: 'What’s wrong?', value: j.issue },
    ],
    notes: j.customerNote,
    earning: paise(bill * (1 - COMMISSION_RATE)),
    payment: { amount: paise(bill), status: j.bill?.paid || j.status === 'closed' ? 'paid' : 'pending' },
    photos: {
      before: j.photos.filter((p) => p.kind === 'before').map((p) => ({ id: p.id, url: p.url, takenAt: ms(j.log.diagnosis) ?? 0 })),
      after: j.photos.filter((p) => p.kind === 'after').map((p) => ({ id: p.id, url: p.url, takenAt: ms(j.log.repaired) ?? 0 })),
    },
    extras: j.parts.map((p) => ({
      id: p.sku,
      source: 'rate_card' as const,
      rateCardItemId: p.sku,
      name: p.qty > 1 ? `${p.name} ×${p.qty}` : p.name,
      amount: paise(p.qty * p.price),
      status: 'approved' as const,
    })),
    offerExpiresAt: status === 'offered' ? ms(j.requestedAt)! + 30_000 : undefined,
    timeline,
    rating: j.confirmation?.rating,
  }
}

/** Four weekly payouts behind today; the latest is still waiting for approval. */
function seedPayouts(now: number): Payout[] {
  const week = 7 * 86_400_000
  const nets = [11840, 13260, 9980, 12410]
  return nets.map((net, i) => {
    const end = now - i * week
    const gross = Math.round(net / (1 - COMMISSION_RATE))
    return {
      id: `PO-${4 - i}`,
      periodStart: end - week,
      periodEnd: end,
      gross: paise(gross),
      commission: paise(gross - net),
      net: paise(net),
      jobCount: 14 + ((i * 3) % 5),
      status: i === 0 ? 'pending' : 'paid',
      paidAt: i === 0 ? undefined : end + 86_400_000,
    }
  })
}

/** A small rate card per category, until the admin's rate card exists. */
const RATE_CARD: RateCardItem[] = [
  { id: 'rc-fridge-gas', categoryId: 'fridge', name: 'Refrigerant recharge', price: paise(1800), active: true },
  { id: 'rc-fridge-relay', categoryId: 'fridge', name: 'Compressor relay', price: paise(650), active: true },
  { id: 'rc-washer-pump', categoryId: 'washer', name: 'Drain pump', price: paise(1450), active: true },
  { id: 'rc-washer-belt', categoryId: 'washer', name: 'Drive belt', price: paise(480), active: true },
  { id: 'rc-ac-gas', categoryId: 'ac', name: 'Gas top-up (per 100 g)', price: paise(900), active: true },
  { id: 'rc-ac-cap', categoryId: 'ac', name: 'Fan capacitor', price: paise(550), active: true },
  { id: 'rc-geyser-element', categoryId: 'geyser', name: 'Heating element', price: paise(1150), active: true },
  { id: 'rc-oven-element', categoryId: 'oven', name: 'Grill element', price: paise(1300), active: true },
]

function fresh(): MockDb {
  const now = Date.now()
  const jobs = seedJobs()
    .map(toPartnerJob)
    .filter((j): j is PartnerJob => j !== null)
  const bankLast4 = DEFAULT_SETTINGS.bank.replace(/\D/g, '').slice(-4)
  return {
    jobs,
    profile: {
      id: TECHNICIAN.id,
      name: TECHNICIAN.name,
      phone: TECHNICIAN.phone,
      email: TECHNICIAN.email,
      photo: TECHNICIAN.photo || undefined,
      city: 'Hyderabad',
      zone: TECHNICIAN.area,
      skills: ['washer', 'fridge', 'oven', 'ac', 'geyser'],
      experienceYears: TECHNICIAN.experienceYears,
      status: 'active',
      online: true,
      rating: TECHNICIAN.rating,
      ratingCount: TECHNICIAN.ratingCount,
      completedJobs: TECHNICIAN.completedJobs,
      bank: { name: DEFAULT_SETTINGS.bank.split('·')[0]!.trim(), last4: bankLast4 },
      upiId: DEFAULT_SETTINGS.upi,
    },
    payouts: seedPayouts(now),
    reviews: seedReviews().map((r) => ({
      id: r.id,
      bookingId: r.id,
      rating: r.rating,
      text: r.text,
      createdAt: new Date(r.at).getTime(),
      authorName: r.name.split(' ')[0]!,
      serviceName: r.appliance,
    })),
    rateCard: RATE_CARD,
  }
}

let db: MockDb = fresh()
const listeners = new Set<() => void>()

export function read(): MockDb {
  return db
}

/** Replace the snapshot (never mutate it) and notify subscribers. */
export function write(next: (current: MockDb) => MockDb) {
  db = next(db)
  listeners.forEach((l) => l())
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Back to the seeded day — for the dev screen and tests. */
export function resetMockDb() {
  write(() => fresh())
}
