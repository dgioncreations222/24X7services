/**
 * The mock backend's data: the demo day from lib/seed, reshaped into
 * lib/data's types and kept in memory. A reload starts the day afresh.
 *
 * `read` returns the current snapshot; `write` replaces it and tells every
 * subscriber, which is how a screen sees a job it accepted move to Ongoing.
 */
import { APPLIANCE_LABEL, BRAND_LABEL } from '../catalog'
import { DEFAULT_SETTINGS, TECHNICIAN, seedJobs, seedNotices, seedReviews } from '../seed'
import type { Job, Notice } from '../types'
import type {
  PartnerJob,
  PartnerJobStatus,
  PartnerNotification,
  PartnerNotificationKind,
  PartnerProfile,
  PartnerReview,
  Payout,
  RateCardItem,
  SupportTicket,
} from '../data/types'

/** The platform's cut of each job, in percent, until the backend says otherwise. */
export const COMMISSION_PCT = 20

/**
 * A bill split between the platform and the technician: the commission is a
 * percent of the whole bill, parts and extras included, and the technician
 * keeps the rest. The one place this sum is done, so every screen agrees.
 */
export function split(bill: number, pct: number) {
  const commission = Math.round((bill * pct) / 100)
  return { commission, net: bill - commission }
}

export interface MockDb {
  jobs: PartnerJob[]
  profile: PartnerProfile
  payouts: Payout[]
  reviews: PartnerReview[]
  rateCard: RateCardItem[]
  /** How many 5★, 4★ … 1★ ratings make up the profile's average. */
  ratingBreakdown: [number, number, number, number, number]
  notifications: PartnerNotification[]
  tickets: SupportTicket[]
}

const paise = (rupees: number) => Math.round(rupees * 100)
const ms = (iso?: string) => (iso ? new Date(iso).getTime() : undefined)

/** What the customer sees on their booking: #AP and five digits, as shared's bookingSchema expects. */
export const displayIdOf = (n: number | string) => `#AP${String(n).replace(/\D/g, '').padStart(5, '0').slice(-5)}`

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
  // A cancelled job was never billed.
  const bill = status === 'cancelled' ? 0 : (j.amount ?? j.estFee)
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
    displayId: displayIdOf(j.id),
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
    earning: split(paise(bill), COMMISSION_PCT).net,
    commissionPct: COMMISSION_PCT,
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
    const gross = Math.round(net / (1 - COMMISSION_PCT / 100))
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

const NOTICE_KIND: Partial<Record<Notice['kind'], PartnerNotificationKind>> = {
  request: 'request',
  emergency: 'emergency',
  assigned: 'assigned',
  accepted: 'assigned',
  schedule: 'schedule',
  cancelled: 'cancelled',
  customer: 'customer',
  payment: 'payment',
  rating: 'rating',
}

/** The seeded inbox, plus last week's payout; AI call summaries are left out. */
function seedNotifications(payouts: Payout[]): PartnerNotification[] {
  const paid = payouts.find((p) => p.status === 'paid')
  const seeded = seedNotices().flatMap((n) => {
    const kind = NOTICE_KIND[n.kind]
    return kind ? [{ id: n.id, kind, title: n.title, body: n.body, at: new Date(n.at).getTime(), read: n.read, jobId: n.jobId }] : []
  })
  return paid?.paidAt
    ? [
        ...seeded,
        {
          id: 'n-payout',
          kind: 'payout',
          title: `Payout sent · ₹${Math.round(paid.net / 100).toLocaleString('en-IN')}`,
          body: `${paid.jobCount} jobs, paid to your bank account.`,
          at: Math.min(paid.paidAt, Date.now() - 86_400_000),
          read: true,
        },
      ]
    : seeded
}

/** One ticket the desk already answered, so the list is not empty on day one. */
function seedTickets(now: number): SupportTicket[] {
  return [
    {
      id: 'SUP-20417',
      topic: 'payment',
      jobId: 'JB-24829',
      details: 'Customer says they paid by UPI but the job still showed payment pending for a while.',
      status: 'resolved',
      createdAt: now - 3 * 86_400_000,
      reply: 'The payment reached us after a short bank delay. It is in this week’s payout.',
    },
  ]
}

function fresh(): MockDb {
  const now = Date.now()
  const jobs = seedJobs()
    .map(toPartnerJob)
    .filter((j): j is PartnerJob => j !== null)
  const payouts = seedPayouts(now)
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
    payouts,
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
    ratingBreakdown: TECHNICIAN.ratingBreakdown,
    notifications: seedNotifications(payouts),
    tickets: seedTickets(now),
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

/** Put a new notification at the top of the inbox. */
export function addNotification(n: Omit<PartnerNotification, 'id' | 'at' | 'read'>) {
  write((db) => ({ ...db, notifications: [{ ...n, id: `n-${Date.now()}`, at: Date.now(), read: false }, ...db.notifications] }))
}

/** Back to the seeded day — for the dev screen and tests. */
export function resetMockDb() {
  write(() => fresh())
}
