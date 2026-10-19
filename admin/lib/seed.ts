import { APPLIANCES, BRANDS, LABOUR_RATE, type Appliance, type Brand } from './catalog'
import {
  BOOKING_FLOW,
  type Activity,
  type AdminSettings,
  type Booking,
  type BookingStatus,
  type Broadcast,
  type Coupon,
  type Customer,
  type PayMethod,
  type Payout,
  type Priority,
  type Review,
  type ServiceType,
  type Technician,
  type Ticket,
  type TimelineEntry,
} from './types'

/**
 * The demo network: a month of Hyderabad bookings, the people on both sides of
 * them, and the money and tickets they produced.
 *
 * Built from a fixed seed so every reload draws the same city, but laid out
 * relative to today so "today" on the dashboard is always today.
 */

function rng(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const AREAS = [
  { area: 'Madhapur', pincode: '500081', lat: 17.4483, lng: 78.3915 },
  { area: 'Gachibowli', pincode: '500032', lat: 17.4401, lng: 78.3489 },
  { area: 'Kondapur', pincode: '500084', lat: 17.46, lng: 78.357 },
  { area: 'Kukatpally', pincode: '500072', lat: 17.4849, lng: 78.4138 },
  { area: 'Banjara Hills', pincode: '500034', lat: 17.4156, lng: 78.4347 },
  { area: 'Jubilee Hills', pincode: '500033', lat: 17.4325, lng: 78.4073 },
  { area: 'Begumpet', pincode: '500016', lat: 17.4447, lng: 78.4664 },
  { area: 'Secunderabad', pincode: '500003', lat: 17.4399, lng: 78.4983 },
  { area: 'Ameerpet', pincode: '500038', lat: 17.4375, lng: 78.4482 },
  { area: 'Miyapur', pincode: '500049', lat: 17.4968, lng: 78.3614 },
  { area: 'Manikonda', pincode: '500089', lat: 17.405, lng: 78.3866 },
  { area: 'Kompally', pincode: '500014', lat: 17.5367, lng: 78.484 },
  { area: 'LB Nagar', pincode: '500074', lat: 17.3457, lng: 78.5522 },
  { area: 'Dilsukhnagar', pincode: '500060', lat: 17.3688, lng: 78.5247 },
  { area: 'Uppal', pincode: '500039', lat: 17.4058, lng: 78.5591 },
  { area: 'Tolichowki', pincode: '500008', lat: 17.395, lng: 78.414 },
  { area: 'Mehdipatnam', pincode: '500028', lat: 17.395, lng: 78.44 },
  { area: 'Somajiguda', pincode: '500082', lat: 17.4239, lng: 78.4594 },
  { area: 'Attapur', pincode: '500048', lat: 17.37, lng: 78.43 },
  { area: 'Nallagandla', pincode: '500019', lat: 17.471, lng: 78.31 },
] as const

const STREETS = ['Road No. 12', 'Ayyappa Society', 'Vittal Rao Nagar', 'Phase 2, HUDA Colony', 'Sri Sai Residency', 'Lane 4, Teachers Colony', 'Green Meadows', 'Prestige Towers', 'My Home Avatar', 'Aparna Sarovar']

const CUSTOMER_NAMES = [
  'Ananya Reddy', 'Rahul Verma', 'Priya Sharma', 'Mohammed Irfan', 'Sneha Kulkarni', 'Vikram Rao', 'Lakshmi Prasanna', 'Arjun Mehta',
  'Fatima Begum', 'Karthik Iyer', 'Divya Menon', 'Suresh Babu', 'Neha Agarwal', 'Sai Kiran', 'Pooja Desai', 'Imran Khan',
  'Harika Chowdary', 'Rohit Malhotra', 'Swathi Goud', 'Aditya Joshi', 'Meera Pillai', 'Venkatesh Yadav', 'Kavya Nair', 'Sanjay Gupta',
  'Ayesha Siddiqui', 'Naveen Kumar', 'Bhavana Rao', 'Manoj Tiwari', 'Ritika Jain', 'Srinivas Murthy', 'Tanvi Shah', 'Abdul Rahman',
  'Keerthi Reddy', 'Nikhil Bansal', 'Shruti Patil', 'Ganesh Raju', 'Zoya Ali', 'Pranav Saxena', 'Madhuri Devi', 'Kiran Varma',
  'Deepika Rao', 'Farhan Qureshi', 'Anjali Singh', 'Ramesh Chandra', 'Sahithi Gupta', 'Varun Kapoor', 'Nandini Rao', 'Sameer Hussain',
  'Rekha Srinivasan', 'Yash Agarwal', 'Haritha Reddy', 'Omkar Kulkarni', 'Sana Fatima', 'Ajay Krishna', 'Mounika Rao', 'Dev Khanna',
]

const FIRST = ['Aarav', 'Bhavya', 'Chaitanya', 'Deepa', 'Eshwar', 'Gayatri', 'Hemant', 'Ishita', 'Jaya', 'Kunal', 'Latha', 'Mukesh', 'Nisha', 'Pallavi', 'Raghav', 'Sowmya', 'Tarun', 'Uma', 'Vasanth', 'Yamini', 'Zubair', 'Anusha', 'Bharath', 'Charan']
const LAST = ['Reddy', 'Rao', 'Sharma', 'Naidu', 'Khan', 'Iyer', 'Goud', 'Verma', 'Patel', 'Chowdary', 'Menon', 'Ali', 'Kulkarni', 'Varma', 'Yadav', 'Shetty', 'Pillai', 'Joshi', 'Das']

const TECH_NAMES = [
  'Ravi Teja Naidu', 'Mahesh Goud', 'Syed Arif', 'Prakash Reddy', 'Naresh Kumar', 'Venu Gopal', 'Sandeep Yadav', 'Mohd Saleem',
  'Krishna Murthy', 'Rajesh Varma', 'Anil Kumar', 'Shiva Prasad', 'Ramu Naik', 'Kiran Babu', 'Satish Chary', 'Ashok Rao',
  'Feroz Khan', 'Bhaskar Reddy', 'Pavan Kalyan S', 'Srikanth M', 'Yusuf Ahmed', 'Gopi Krishna',
]

const APPLICANTS = ['Lokesh Patel', 'Rakesh Jadhav', 'Imtiaz Hussain', 'Vamshi Krishna']

const ISSUES: Record<Appliance, string[]> = {
  washer: ['Not draining, water stays in drum', 'Drum not spinning', 'Loud noise during spin', 'Water leaking from the bottom', 'Error 4E — no water inlet', 'Door not locking'],
  fridge: ['Not cooling', 'Ice build-up in freezer', 'Compressor making noise', 'Water leaking inside', 'Freezer cold, fridge warm'],
  oven: ['Not heating', 'Uneven temperature', 'Convection fan not working', 'Door seal damaged', 'Trips the MCB when switched on'],
  ac: ['Not cooling', 'Water dripping from indoor unit', 'Gas refill needed', 'Bad smell from the vents', 'Outdoor unit not starting', 'Remote not responding'],
  geyser: ['Not heating water', 'Water leaking from tank', 'Trips the MCB', 'Takes too long to heat', 'Thermostat cuts off early'],
}

const SERVICE_FOR: Record<Appliance, ServiceType[]> = {
  washer: ['Repair', 'Repair', 'Repair', 'General service', 'Deep cleaning', 'Installation'],
  fridge: ['Repair', 'Repair', 'Repair', 'Gas refill', 'General service'],
  oven: ['Repair', 'Repair', 'Repair', 'Installation'],
  ac: ['Repair', 'Repair', 'Gas refill', 'General service', 'Deep cleaning', 'Installation', 'Uninstallation'],
  geyser: ['Repair', 'Repair', 'Repair', 'Installation', 'General service'],
}

const REVIEW_TEXT: Record<number, string[]> = {
  5: [
    'Very professional, explained the fault before starting. Fridge cooling perfectly now.',
    'Reached on time and fixed the AC in under an hour. Highly recommend.',
    'Polite and neat work. Cleaned up after the repair too.',
    'Showed me the old part and the bill matched the estimate exactly.',
    'Came at 11 PM for an emergency, sorted the geyser leak quickly. Thank you!',
  ],
  4: ['Good repair, was 15 minutes late but called ahead.', 'Work was fine, part had to be ordered so it took two visits.', 'Knowledgeable technician. Price slightly higher than expected.'],
  3: ['Problem fixed but had to follow up twice for the visit.', 'Okay service. Did not explain the charges clearly.'],
  2: ['Machine started making noise again after two days.', 'Technician was in a hurry, did not test properly.'],
  1: ['Very rude on the phone and left without completing the job.'],
}

const pick = <T,>(r: () => number, a: readonly T[]): T => a[Math.floor(r() * a.length)]!
const round10 = (n: number) => Math.round(n / 10) * 10

function phone(r: () => number) {
  const n = () => Math.floor(r() * 10)
  return `+91 9${n()}${n()}${n()}${n()} ${n()}${n()}${n()}${n()}${n()}`
}

const slug = (name: string) => name.toLowerCase().replace(/[^a-z]+/g, '.').replace(/\.$/, '')

export interface Seed {
  customers: Customer[]
  technicians: Technician[]
  bookings: Booking[]
  payouts: Payout[]
  tickets: Ticket[]
  reviews: Review[]
  coupons: Coupon[]
  broadcasts: Broadcast[]
  activity: Activity[]
  settings: AdminSettings
}

export function seed(nowMs = Date.now()): Seed {
  const r = rng(24_07)
  const now = new Date(nowMs)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const at = (dayOffset: number, hour: number, min = 0) => new Date(startOfToday + dayOffset * 86_400_000 + (hour * 60 + min) * 60_000).toISOString()
  const minsAgo = (m: number) => new Date(nowMs - m * 60_000).toISOString()
  const nowHour = now.getHours() + now.getMinutes() / 60

  /* ---------------------------------------------------------- Customers */
  // The named regulars, then a wider city of one-off customers.
  const extra = Array.from({ length: 220 }, (_, i) => `${FIRST[i % FIRST.length]} ${LAST[(i * 7 + Math.floor(i / FIRST.length)) % LAST.length]}`)
  const customers: Customer[] = [...CUSTOMER_NAMES, ...extra].map((name, i) => {
    const a = pick(r, AREAS)
    return {
      id: `CUS-${10210 + i * 7}`,
      name,
      phone: phone(r),
      email: `${slug(name)}@${pick(r, ['gmail.com', 'outlook.com', 'yahoo.in'])}`,
      area: a.area,
      address: '',
      joinedAt: at(i % 9 === 0 ? -Math.floor(r() * 28) - 1 : -Math.floor(r() * 420) - 30, 10),
      status: i === 23 || i === 41 ? 'blocked' : 'active',
      addresses: [
        { label: 'Home', line: `${Math.floor(r() * 900) + 100}, ${pick(r, STREETS)}, ${a.area}, Hyderabad ${a.pincode}` },
        ...(r() < 0.35 ? [{ label: 'Office', line: `${pick(r, ['Cyber Towers', 'Mindspace', 'DLF Cyber City', 'Raheja IT Park'])}, ${pick(r, AREAS).area}, Hyderabad` }] : []),
      ],
      referralCode: `${name.split(' ')[0]!.toUpperCase().slice(0, 5)}${Math.floor(r() * 90) + 10}`,
      referrals: r() < 0.3 ? Math.floor(r() * 6) + 1 : 0,
      walletCredit: r() < 0.25 ? round10(r() * 400 + 100) : 0,
    }
  })

  for (const c of customers) c.address = c.addresses[0]!.line

  /* -------------------------------------------------------- Technicians */
  const techAreas = [AREAS[0], ...AREAS.slice(1)]
  const technicians: Technician[] = [...TECH_NAMES, ...APPLICANTS].map((name, i) => {
    const applicant = i >= TECH_NAMES.length
    const a = techAreas[i % techAreas.length]!
    const first = i === 0
    const allBrands = r() < 0.7
    const brands: Brand[] = allBrands ? [...BRANDS] : BRANDS.filter(() => r() < 0.75)
    const appliances: Appliance[] = r() < 0.55 ? [...APPLIANCES] : APPLIANCES.filter(() => r() < 0.7)
    const rating = first ? 4.86 : applicant ? 0 : Math.round((4.25 + r() * 0.7) * 100) / 100
    return {
      id: first ? 'TCH-HYD-0472' : `TCH-HYD-0${applicant ? 600 + i : 300 + i * 13}`,
      name,
      phone: phone(r),
      email: `${slug(name)}@partners.customerservice.example`,
      area: a.area,
      lat: a.lat + (r() - 0.5) * 0.012,
      lng: a.lng + (r() - 0.5) * 0.012,
      experienceYears: first ? 8 : applicant ? Math.floor(r() * 4) + 1 : Math.floor(r() * 12) + 2,
      rating,
      ratingCount: applicant ? 0 : first ? 1284 : Math.floor(r() * 900) + 120,
      completedJobs: applicant ? 0 : first ? 1462 : Math.floor(r() * 1100) + 150,
      brands: brands.length ? brands : ['samsung', 'lg'],
      appliances: appliances.length ? appliances : ['ac', 'fridge'],
      presence: 'offline',
      kyc: applicant ? 'pending' : i === 17 ? 'suspended' : 'verified',
      joinedAt: applicant ? minsAgo(60 * 24 * (i - TECH_NAMES.length + 1)) : at(-Math.floor(r() * 900) - 60, 10),
      acceptanceRate: applicant ? 0 : Math.round(82 + r() * 17),
      onTimeRate: applicant ? 0 : Math.round(86 + r() * 13),
      cashInHand: 0,
      tracking: applicant ? false : r() < 0.9,
      workingHours: r() < 0.5 ? { days: 'Mon–Sat', start: '08:00', end: '20:00' } : { days: 'All days', start: '07:00', end: '22:00' },
      radiusKm: pick(r, [8, 10, 12, 15]),
      docs: applicant
        ? { aadhaar: true, pan: i % 2 === 0, bank: true, training: i % 3 !== 0, police: false }
        : { aadhaar: true, pan: true, bank: true, training: true, police: true },
    }
  })
  const active = technicians.filter((t) => t.kyc === 'verified')
  const canDo = (b: Brand, ap: Appliance) => active.filter((t) => t.brands.includes(b) && t.appliances.includes(ap))

  /* ----------------------------------------------------------- Bookings */
  const bookings: Booking[] = []
  const onJob = new Set<string>()
  let seq = 24_011

  const makeTimeline = (status: BookingStatus, created: string, scheduled: string, paidOnline: boolean): TimelineEntry[] => {
    const out: TimelineEntry[] = []
    const t0 = new Date(created).getTime()
    const s0 = new Date(scheduled).getTime()
    const terminal = status === 'cancelled' || status === 'refunded'
    const reach = terminal ? (r() < 0.5 ? 'confirmed' : 'assigned') : status
    const idx = BOOKING_FLOW.indexOf(reach as (typeof BOOKING_FLOW)[number])
    const stamps: Record<string, number> = {
      pending_payment: t0,
      confirmed: t0 + 2 * 60_000,
      assigned: t0 + 9 * 60_000,
      en_route: s0 - 25 * 60_000,
      arrived: s0 + 2 * 60_000,
      in_progress: s0 + 8 * 60_000,
      completed: s0 + 70 * 60_000,
    }
    BOOKING_FLOW.forEach((st, i) => {
      if (i > idx) return
      if (st === 'pending_payment' && !paidOnline && status !== 'pending_payment') return
      out.push({ status: st, at: new Date(Math.min(stamps[st]!, nowMs - (idx - i) * 60_000)).toISOString() })
    })
    if (status === 'cancelled') out.push({ status, at: new Date(Math.min(s0 - 60 * 60_000, nowMs)).toISOString() })
    if (status === 'refunded') {
      out.push({ status: 'cancelled', at: new Date(Math.min(s0 - 60 * 60_000, nowMs - 120_000)).toISOString() })
      out.push({ status, at: new Date(Math.min(s0, nowMs - 60_000)).toISOString() })
    }
    return out
  }

  const book = (dayOffset: number, hour: number, status: BookingStatus, opts: Partial<Booking> = {}) => {
    const c = opts.customerId ? customers.find((x) => x.id === opts.customerId)! : pick(r, customers)
    const appliance = opts.appliance ?? pick(r, APPLIANCES)
    const brand = opts.brand ?? pick(r, BRANDS)
    const service = opts.service ?? pick(r, SERVICE_FOR[appliance])
    const a = AREAS.find((x) => x.area === c.area)!
    const min = Math.floor(r() * 4) * 15
    const scheduledAt = at(dayOffset, hour, min)
    const asked = new Date(scheduledAt).getTime() - (opts.priority === 'emergency' ? 35 : 60 * (2 + Math.floor(r() * 30))) * 60_000
    // Nothing can have been booked in the future.
    const createdAt = new Date(asked < nowMs ? asked : nowMs - (8 + Math.floor(r() * 170)) * 60_000).toISOString()
    const parts = service === 'Repair' ? round10(r() < 0.4 ? 0 : r() * 3800 + 250) : service === 'Gas refill' ? 2200 : 0
    const base = service === 'Installation' || service === 'Uninstallation' ? round10(LABOUR_RATE[appliance] * 0.8) : LABOUR_RATE[appliance]
    const priority: Priority = opts.priority ?? (r() < 0.12 ? 'high' : 'normal')
    const surcharge = priority === 'emergency' ? 299 : 0
    const method: PayMethod = pick(r, ['upi', 'upi', 'upi', 'card', 'cash', 'cash', 'wallet'])
    const paidOnline = method !== 'cash'
    const done = status === 'completed'
    const coupon = r() < 0.12 ? pick(r, ['FIRST150', 'MONSOON20', 'REFER100']) : undefined
    const discount = coupon === 'FIRST150' ? 150 : coupon === 'REFER100' ? 100 : coupon === 'MONSOON20' ? round10((base + parts) * 0.2) : 0
    const assigned = !['pending_payment', 'confirmed'].includes(status)
    const pool = canDo(brand, appliance)
    // A technician is on one live job at a time.
    const live = status === 'en_route' || status === 'arrived' || status === 'in_progress'
    const free = (list: Technician[]) => (live ? list.filter((t) => !onJob.has(t.id)) : list)
    const tech = opts.technicianId ?? (assigned || (status !== 'confirmed' && r() < 0.6) ? pick(r, free(pool).length ? free(pool) : free(active)).id : undefined)
    if (live && tech) onJob.add(tech)
    const b: Booking = {
      id: `BK-${seq++}`,
      customerId: c.id,
      technicianId: status === 'pending_payment' || status === 'confirmed' ? undefined : tech,
      brand,
      appliance,
      service,
      issue: pick(r, ISSUES[appliance]),
      priority,
      status,
      createdAt,
      scheduledAt,
      area: c.area,
      address: c.address,
      lat: a.lat + (r() - 0.5) * 0.01,
      lng: a.lng + (r() - 0.5) * 0.01,
      amount: Math.max(base + parts + surcharge - discount, 199),
      paid: done || (paidOnline && status !== 'pending_payment') || status === 'refunded',
      method: status === 'pending_payment' ? null : method,
      coupon,
      discount,
      rating: done && r() < 0.72 ? pick(r, [5, 5, 5, 5, 5, 5, 4, 4, 4, 3, 2, 5, 4, 1]) : undefined,
      cancelReason: status === 'cancelled' || status === 'refunded' ? pick(r, ['Customer not available', 'Booked by mistake', 'Fixed by customer', 'Technician delayed', 'Price too high']) : undefined,
      timeline: [],
      ...opts,
    }
    b.timeline = makeTimeline(status, b.createdAt, b.scheduledAt, paidOnline)
    bookings.push(b)
    return b
  }

  // The last 29 days: almost everything is finished.
  for (let d = -29; d <= -1; d++) {
    const n = 9 + Math.floor(r() * 7) + Math.floor((29 + d) / 6)
    for (let k = 0; k < n; k++) {
      const x = r()
      const status: BookingStatus = x < 0.86 ? 'completed' : x < 0.95 ? 'cancelled' : 'refunded'
      book(d, 8 + Math.floor(r() * 13), status, { priority: r() < 0.05 ? 'emergency' : undefined })
    }
  }

  // Today: the morning's work is done, the afternoon is moving, the evening is booked.
  const ravi = technicians[0]!.id
  const todayPlan: [number, BookingStatus, Partial<Booking>?][] = [
    [8, 'completed'], [8.5, 'completed', { technicianId: ravi }], [9, 'completed'], [9.5, 'completed'], [10, 'completed'],
    [10.5, 'completed'], [11, 'completed', { technicianId: ravi }], [11.5, 'cancelled'], [12, 'completed'], [12.5, 'completed'],
  ]
  const ahead: [number, BookingStatus, Partial<Booking>?][] = [
    [0, 'in_progress', { technicianId: ravi, appliance: 'washer', brand: 'samsung' }],
    [0, 'in_progress'], [0, 'arrived'], [0.5, 'en_route'], [0.5, 'en_route', { priority: 'high' }],
    [1, 'assigned'], [1.5, 'assigned'], [2, 'assigned', { technicianId: ravi }], [2, 'confirmed'], [2.5, 'confirmed', { priority: 'high' }],
    [3, 'confirmed'], [3, 'pending_payment'], [3.5, 'assigned'], [4, 'confirmed'], [4.5, 'pending_payment'],
  ]
  for (const [h, st, o] of todayPlan) if (h < nowHour - 1) book(0, h, st, o)
  for (const [h, st, o] of ahead) book(0, Math.min(nowHour + h, 23.5), st, o)

  // Live emergencies: one waiting for a technician, one already on the way.
  book(0, Math.min(nowHour + 0.4, 23.6), 'confirmed', { priority: 'emergency', appliance: 'geyser', brand: 'bosch', issue: 'Water leaking from tank, sparks near the switch', createdAt: minsAgo(6) })
  book(0, Math.min(nowHour + 0.3, 23.6), 'en_route', { priority: 'emergency', appliance: 'fridge', brand: 'lg', issue: 'Not cooling — stored medicines inside', createdAt: minsAgo(28) })

  // Tomorrow and the day after.
  for (let d = 1; d <= 2; d++)
    for (let k = 0; k < 9 - d * 2; k++) book(d, 9 + Math.floor(r() * 10), r() < 0.55 ? 'assigned' : 'confirmed')

  bookings.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  /* ------------------------------------------------ Technician presence */
  const liveTechs = new Set(bookings.filter((b) => ['en_route', 'arrived', 'in_progress'].includes(b.status)).map((b) => b.technicianId))
  for (const t of technicians) {
    if (t.kyc !== 'verified') continue
    t.presence = liveTechs.has(t.id) ? 'on_job' : t.id === ravi ? 'on_job' : r() < 0.62 ? 'online' : 'offline'
    t.cashInHand = bookings
      .filter((b) => b.technicianId === t.id && b.method === 'cash' && b.status === 'completed' && new Date(b.scheduledAt).getTime() > nowMs - 3 * 86_400_000)
      .reduce((s, b) => s + b.amount, 0)
  }

  /* ------------------------------------------------------------ Reviews */
  const reviews: Review[] = bookings
    .filter((b) => b.rating && b.technicianId)
    .slice(0, 90)
    .map((b, i) => ({
      id: `RV-${5100 + i}`,
      bookingId: b.id,
      customerId: b.customerId,
      technicianId: b.technicianId!,
      rating: b.rating!,
      text: r() < 0.75 ? pick(r, REVIEW_TEXT[b.rating!]!) : '',
      at: new Date(new Date(b.scheduledAt).getTime() + 3 * 3_600_000).toISOString(),
      status: b.rating! <= 1 ? 'flagged' : 'published',
    }))

  /* ------------------------------------------------------------ Payouts */
  const weekStart = (offsetWeeks: number) => {
    const d = new Date(startOfToday)
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7) - offsetWeeks * 7)
    return d
  }
  const payouts: Payout[] = []
  let po = 8801
  for (const w of [2, 1, 0]) {
    const from = weekStart(w).getTime()
    const to = from + 7 * 86_400_000
    for (const t of active) {
      const jobs = bookings.filter((b) => b.technicianId === t.id && b.status === 'completed' && +new Date(b.scheduledAt) >= from && +new Date(b.scheduledAt) < to)
      if (!jobs.length) continue
      const gross = jobs.reduce((s, b) => s + b.amount, 0)
      payouts.push({
        id: `PO-${po++}`,
        technicianId: t.id,
        period: `Week of ${new Date(from).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
        jobs: jobs.length,
        gross,
        commission: Math.round(gross * 0.2),
        status: w === 0 ? 'pending' : w === 1 && r() < 0.3 ? 'processing' : 'paid',
        at: new Date(Math.min(to, nowMs)).toISOString(),
      })
    }
  }

  /* ------------------------------------------------------------ Tickets */
  const live = bookings.filter((b) => b.technicianId)
  const tk = (i: number) => live[i * 5 + 2]!
  const tickets: Ticket[] = [
    {
      id: 'TKT-3108', side: 'customer', personId: tk(0).customerId, bookingId: tk(0).id, subject: 'Technician has not arrived yet', category: 'Delay',
      priority: 'urgent', status: 'open', createdAt: minsAgo(12),
      messages: [{ from: 'user', text: 'My slot was 30 minutes ago and nobody has called. Please check.', at: minsAgo(12) }],
    },
    {
      id: 'TKT-3107', side: 'technician', personId: technicians[3]!.id, subject: 'Part not available at Kukatpally hub', category: 'Parts & inventory',
      priority: 'high', status: 'in_progress', createdAt: minsAgo(55), assignee: 'Farah Khan',
      messages: [
        { from: 'user', text: 'Need LG inverter PCB (RF-PC08) for a job tomorrow morning. Hub says out of stock.', at: minsAgo(55) },
        { from: 'agent', text: 'Checking with the Secunderabad hub — will confirm in 20 min.', at: minsAgo(41) },
      ],
    },
    {
      id: 'TKT-3106', side: 'customer', personId: tk(1).customerId, bookingId: tk(1).id, subject: 'Charged twice for the same booking', category: 'Payment',
      priority: 'high', status: 'open', createdAt: minsAgo(80),
      messages: [{ from: 'user', text: 'UPI shows two debits of the same amount. Please refund one.', at: minsAgo(80) }],
    },
    {
      id: 'TKT-3105', side: 'technician', personId: technicians[6]!.id, subject: 'Customer refused to pay for replaced part', category: 'Payment dispute',
      priority: 'high', status: 'open', createdAt: minsAgo(140), bookingId: tk(2).id,
      messages: [{ from: 'user', text: 'Customer approved the drain pump on call but now says she did not. Photos uploaded in the job.', at: minsAgo(140) }],
    },
    {
      id: 'TKT-3104', side: 'customer', personId: tk(3).customerId, bookingId: tk(3).id, subject: 'AC stopped cooling again after repair', category: 'Repeat issue',
      priority: 'normal', status: 'in_progress', createdAt: minsAgo(60 * 6), assignee: 'Rohan Das',
      messages: [
        { from: 'user', text: 'Repair was done 3 days ago, again not cooling.', at: minsAgo(60 * 6) },
        { from: 'agent', text: 'Sorry about this. A free revisit is booked under warranty for tomorrow 10 AM.', at: minsAgo(60 * 5) },
      ],
    },
    {
      id: 'TKT-3103', side: 'technician', personId: technicians[9]!.id, subject: 'Payout for last week is short by ₹640', category: 'Payout',
      priority: 'normal', status: 'open', createdAt: minsAgo(60 * 9),
      messages: [{ from: 'user', text: 'Job BK cash collection seems counted twice in deduction.', at: minsAgo(60 * 9) }],
    },
    {
      id: 'TKT-3102', side: 'customer', personId: customers[12]!.id, subject: 'Want to reschedule to Sunday', category: 'Reschedule',
      priority: 'low', status: 'resolved', createdAt: minsAgo(60 * 22), assignee: 'Farah Khan',
      messages: [
        { from: 'user', text: 'Can I move my booking to Sunday morning?', at: minsAgo(60 * 22) },
        { from: 'agent', text: 'Done — moved to Sunday 10:00 AM. You will get a confirmation SMS.', at: minsAgo(60 * 21) },
      ],
    },
    {
      id: 'TKT-3101', side: 'technician', personId: technicians[1]!.id, subject: 'App crashed during bill generation', category: 'App issue',
      priority: 'normal', status: 'resolved', createdAt: minsAgo(60 * 30), assignee: 'Rohan Das',
      messages: [
        { from: 'user', text: 'App closed when I tapped Generate Bill.', at: minsAgo(60 * 30) },
        { from: 'agent', text: 'Fixed in today’s update. Please update the app from the store.', at: minsAgo(60 * 26) },
      ],
    },
    {
      id: 'TKT-3100', side: 'customer', personId: customers[30]!.id, subject: 'Technician was very professional', category: 'Feedback',
      priority: 'low', status: 'resolved', createdAt: minsAgo(60 * 48),
      messages: [{ from: 'user', text: 'Just wanted to say thanks — great service.', at: minsAgo(60 * 48) }],
    },
  ]

  /* -------------------------------------------------- Coupons, messages */
  const coupons: Coupon[] = [
    { code: 'FIRST150', title: 'First booking offer', description: '₹150 off the first booking', type: 'first_booking', kind: 'flat', value: 150, minOrder: 499, maxDiscount: 150, used: 412, limit: 1000, active: true, start: at(-60, 0), expires: at(45, 23, 59), brand: 'all', appliance: 'all', image: '/media/promo-washer.jpg' },
    { code: 'MONSOON20', title: 'Monsoon cooling care', description: '20% off AC & fridge gas refill', type: 'seasonal', kind: 'percent', value: 20, minOrder: 999, maxDiscount: 500, used: 238, limit: 500, active: true, start: at(-20, 0), expires: at(12, 23, 59), brand: 'all', appliance: 'ac', image: '/media/promo-ac-gas.jpg' },
    { code: 'REFER100', title: 'Refer a friend', description: 'Referral reward for both friends', type: 'fixed', kind: 'flat', value: 100, minOrder: 0, maxDiscount: 100, used: 167, limit: 5000, active: true, start: at(-120, 0), expires: at(180, 23, 59), brand: 'all', appliance: 'all' },
    { code: 'GEYSER99', title: 'Winter geyser check', description: 'Geyser service at ₹99 visit fee', type: 'service', kind: 'flat', value: 350, minOrder: 449, maxDiscount: 350, used: 89, limit: 300, active: false, start: at(-40, 0), expires: at(-4, 23, 59), brand: 'all', appliance: 'geyser' },
    { code: 'BOSCH10', title: 'Bosch washer week', description: '10% off Bosch washing machine repair', type: 'brand', kind: 'percent', value: 10, minOrder: 699, maxDiscount: 300, used: 31, limit: 200, active: true, start: at(-5, 0), expires: at(30, 23, 59), brand: 'bosch', appliance: 'washer' },
    { code: 'NIGHT24', title: 'Night emergency relief', description: '₹100 off emergency visits after 10 PM', type: 'emergency', kind: 'flat', value: 100, minOrder: 699, maxDiscount: 100, used: 54, limit: 400, active: true, start: at(-10, 0), expires: at(50, 23, 59), brand: 'all', appliance: 'all' },
  ]

  const broadcasts: Broadcast[] = [
    { id: 'BC-41', audience: 'technicians', title: 'Heavy rain alert tonight', body: 'Expect waterlogging near Madhapur and Kukatpally. Plan routes and update ETAs.', at: minsAgo(60 * 3), reach: 22 },
    { id: 'BC-40', audience: 'customers', title: 'Monsoon AC check-up — 20% off', body: 'Use MONSOON20 on any AC or fridge gas refill this week.', at: minsAgo(60 * 26), reach: 54 },
    { id: 'BC-39', audience: 'all', title: 'Diwali hours', body: 'Emergency desk stays open round the clock through the festival week.', at: minsAgo(60 * 72), reach: 80 },
  ]

  /* ----------------------------------------------------------- Activity */
  const techName = (id?: string) => technicians.find((t) => t.id === id)?.name ?? 'a technician'
  const activity: Activity[] = bookings
    .filter((b) => b.timeline.length > 0)
    .filter((b) => new Date(b.timeline.at(-1)?.at ?? b.createdAt).getTime() <= nowMs && new Date(b.timeline.at(-1)?.at ?? b.createdAt).getTime() > nowMs - 86_400_000)
    .slice(0, 24)
    .map((b, i) => {
      const last = b.timeline.at(-1)!
      const text =
        last.status === 'completed'
          ? `${techName(b.technicianId)} closed ${b.id} · ₹${b.amount.toLocaleString('en-IN')}`
          : last.status === 'cancelled'
            ? `${b.id} cancelled — ${b.cancelReason}`
            : last.status === 'assigned'
              ? `${b.id} assigned to ${techName(b.technicianId)}`
              : last.status === 'en_route'
                ? `${techName(b.technicianId)} is on the way for ${b.id}`
                : last.status === 'confirmed'
                  ? `New booking ${b.id} in ${b.area}`
                  : `${b.id} moved to ${last.status.replace('_', ' ')}`
      return {
        id: `AC-${900 + i}`,
        kind: (last.status === 'assigned' ? 'dispatch' : last.status === 'completed' ? 'payment' : 'booking') as Activity['kind'],
        text,
        at: last.at,
        actor: last.status === 'assigned' ? 'Auto-dispatch' : 'System',
      }
    })
    .sort((a, b) => b.at.localeCompare(a.at))

  /* ----------------------------------------------------------- Settings */
  const matrix = Object.fromEntries(BRANDS.map((b) => [b, Object.fromEntries(APPLIANCES.map((a) => [a, true]))])) as AdminSettings['matrix']
  const settings: AdminSettings = {
    labour: { ...LABOUR_RATE },
    matrix,
    emergencySurcharge: 299,
    commissionPct: 20,
    gstPct: 18,
    autoAssign: true,
    emergencySlaMin: 45,
    areas: AREAS.map((a, i) => ({ pincode: a.pincode, area: a.area, active: i !== 11 })),
    team: [
      { name: 'Aditi Rao', email: 'aditi.rao@customerservice.example', role: 'Super admin', lastActive: minsAgo(1) },
      { name: 'Vivek Menon', email: 'vivek.menon@customerservice.example', role: 'Operations', lastActive: minsAgo(14) },
      { name: 'Sravani K', email: 'sravani.k@customerservice.example', role: 'Dispatcher', lastActive: minsAgo(3) },
      { name: 'Farah Khan', email: 'farah.khan@customerservice.example', role: 'Support', lastActive: minsAgo(9) },
      { name: 'Rohan Das', email: 'rohan.das@customerservice.example', role: 'Support', lastActive: minsAgo(70) },
      { name: 'Meghana Iyer', email: 'meghana.iyer@customerservice.example', role: 'Finance', lastActive: minsAgo(60 * 5) },
    ],
  }

  return { customers, technicians, bookings, payouts, tickets, reviews, coupons, broadcasts, activity, settings }
}
