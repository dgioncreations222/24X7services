import { APPLIANCES, BRANDS, LABOUR_RATE, type Appliance, type Brand } from './catalog'
import type { Customer, Job, Notice, Review, ServiceType, Settings, Technician } from './types'

/**
 * Demo data. There is no dispatch backend yet, so the app boots on a realistic
 * day's work for one Hyderabad technician. Times are built from "today" at
 * load, so the demo never opens on a stale schedule.
 */

function today(h: number, m = 0, dayOffset = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + dayOffset)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

function minutesAgo(min: number): string {
  return new Date(Date.now() - min * 60_000).toISOString()
}

function minutesFromNow(min: number): string {
  return new Date(Date.now() + min * 60_000).toISOString()
}

/** Where the technician starts the day. */
export const BASE = { lat: 17.469, lng: 78.364, label: 'Kondapur hub' }

const AREAS = {
  kondapur: { area: 'Kondapur', lat: 17.4712, lng: 78.3571 },
  madhapur: { area: 'Madhapur', lat: 17.4483, lng: 78.3915 },
  gachibowli: { area: 'Gachibowli', lat: 17.4401, lng: 78.3489 },
  hitech: { area: 'HITEC City', lat: 17.4435, lng: 78.3772 },
  kothaguda: { area: 'Kothaguda', lat: 17.463, lng: 78.371 },
  jubilee: { area: 'Jubilee Hills', lat: 17.4326, lng: 78.4071 },
  miyapur: { area: 'Miyapur', lat: 17.4968, lng: 78.3614 },
  kukatpally: { area: 'Kukatpally', lat: 17.4948, lng: 78.3996 },
  manikonda: { area: 'Manikonda', lat: 17.405, lng: 78.3869 },
  nanakramguda: { area: 'Nanakramguda', lat: 17.4176, lng: 78.3411 },
  banjara: { area: 'Banjara Hills', lat: 17.4156, lng: 78.4347 },
} as const

type AreaKey = keyof typeof AREAS

function customer(
  name: string,
  phone: string,
  address: string,
  where: AreaKey,
  landmark?: string
): Customer {
  const a = AREAS[where]
  return { name, phone, address: `${address}, ${a.area}`, landmark, ...a }
}

const blank = { log: {}, parts: [], photos: [] }

export function seedJobs(): Job[] {
  const jobs: Job[] = [
    {
      ...blank,
      id: 'JB-24829',
      customer: customer('Anjali Verma', '+91 98480 21457', 'Flat 402, Aparna Towers', 'kondapur', 'Opp. Sarath City Mall'),
      appliance: 'fridge',
      brand: 'lg',
      model: 'GL-T292RPZY (double door)',
      service: 'Gas refill',
      issue: 'Freezer cold, lower compartment not cooling',
      priority: 'normal',
      status: 'closed',
      requestedAt: today(8, 5),
      scheduledAt: today(9, 0),
      distanceKm: 1.4,
      etaMin: 6,
      durationMin: 75,
      estFee: 649,
      amount: 2449,
      log: {
        assigned: today(8, 6),
        accepted: today(8, 7),
        on_the_way: today(8, 44),
        arrived: today(8, 55),
        diagnosis: today(9, 0),
        repair: today(9, 18),
        repaired: today(10, 2),
        confirmation: today(10, 6),
        closed: today(10, 9),
      },
      parts: [{ sku: 'RF-GS05', name: 'Refrigerant R600a recharge', qty: 1, price: 1800, inVan: true }],
      diagnosis: {
        condition: 'Fair',
        problem: 'Low refrigerant; micro-leak at capillary joint',
        category: 'Cooling / gas',
        repair: 'Brazed capillary joint, vacuumed and recharged R600a',
        notes: 'Pressure held for 20 min after brazing. Advised customer to keep 10 cm gap at rear.',
        estimate: 2449,
      },
      bill: { labour: 649, additional: 0, additionalNote: '', paid: true, method: 'online' },
      confirmation: { signature: '', rating: 5, review: 'Explained everything clearly. Fridge cooling perfectly now.', at: today(10, 8) },
    },
    {
      ...blank,
      id: 'JB-24831',
      customer: customer('Priya Reddy', '+91 99890 44120', 'H.No 2-48/7, Sri Ram Nagar Colony', 'kothaguda', 'Behind Kothaguda Cross Roads'),
      appliance: 'washer',
      brand: 'samsung',
      model: 'WA70A4002GS (7 kg top load)',
      service: 'Repair',
      issue: 'Machine not draining',
      customerNote: 'Water stays in the drum after the wash cycle. Showing error 5C. Please call before coming — gate is locked.',
      priority: 'normal',
      status: 'on_the_way',
      requestedAt: today(9, 40),
      scheduledAt: today(11, 30),
      distanceKm: 3.2,
      etaMin: 11,
      durationMin: 60,
      estFee: 549,
      log: { assigned: today(9, 41), accepted: today(9, 43), on_the_way: minutesAgo(6) },
    },
    {
      ...blank,
      id: 'JB-24833',
      customer: customer('Rahul Menon', '+91 90000 71836', 'Villa 18, My Home Abhra', 'madhapur', 'Near Durgam Cheruvu metro'),
      appliance: 'oven',
      brand: 'bosch',
      model: 'HBF113BR0I (built-in, 66 L)',
      service: 'Repair',
      issue: 'Oven not heating',
      customerNote: 'Fan and light work, but it stays cold on every mode.',
      priority: 'normal',
      status: 'accepted',
      requestedAt: today(10, 12),
      scheduledAt: today(13, 0),
      distanceKm: 5.8,
      etaMin: 18,
      durationMin: 50,
      estFee: 499,
      log: { assigned: today(10, 13), accepted: today(10, 20) },
    },
    {
      ...blank,
      id: 'JB-24835',
      customer: customer('Sneha Kulkarni', '+91 97010 55283', 'Tower C-1104, SMR Vinay Iconia', 'gachibowli', 'Gate 2, visitor parking B1'),
      appliance: 'ac',
      brand: 'lg',
      model: '1.5 T split inverter',
      service: 'General service',
      issue: 'Weak cooling, water dripping from indoor unit',
      priority: 'high',
      status: 'assigned',
      requestedAt: today(10, 50),
      scheduledAt: today(15, 30),
      distanceKm: 4.1,
      etaMin: 14,
      durationMin: 70,
      estFee: 699,
      log: { assigned: today(10, 51) },
    },
    {
      ...blank,
      id: 'JB-24836',
      customer: customer('Mohammed Irfan', '+91 91211 60947', '3rd floor, Vasavi Residency', 'kukatpally', 'KPHB Phase 6, near Forum Mall'),
      appliance: 'geyser',
      brand: 'ifb',
      model: '25 L storage',
      service: 'Repair',
      issue: 'Geyser tripping the MCB when switched on',
      priority: 'normal',
      status: 'assigned',
      requestedAt: today(11, 2),
      scheduledAt: today(17, 30),
      distanceKm: 7.6,
      etaMin: 24,
      durationMin: 45,
      estFee: 449,
      log: { assigned: today(11, 3) },
    },
    {
      ...blank,
      id: 'JB-24838',
      customer: customer('Kavya Sharma', '+91 98661 30972', 'Plot 44, Road No. 36', 'jubilee', 'Next to Peddamma Temple'),
      appliance: 'fridge',
      brand: 'samsung',
      model: 'RT42 frost-free, 415 L',
      service: 'Repair',
      issue: 'Stopped cooling completely',
      customerNote: 'Insulin and baby food inside. Compressor clicks every few minutes but does not start.',
      priority: 'emergency',
      status: 'request',
      requestedAt: minutesAgo(4),
      scheduledAt: minutesFromNow(40),
      distanceKm: 6.4,
      etaMin: 21,
      durationMin: 60,
      estFee: 899,
    },
    {
      ...blank,
      id: 'JB-24839',
      customer: customer('Arjun Rao', '+91 94405 18263', 'B-707, Cyber Meadows', 'hitech', 'Opp. Cyber Towers'),
      appliance: 'washer',
      brand: 'lg',
      model: 'FHM1207ZDL (7 kg front load)',
      service: 'Repair',
      issue: 'Error OE — water not draining',
      priority: 'normal',
      status: 'request',
      requestedAt: minutesAgo(11),
      scheduledAt: today(16, 30),
      distanceKm: 2.7,
      etaMin: 9,
      durationMin: 60,
      estFee: 549,
    },
    {
      ...blank,
      id: 'JB-24840',
      customer: customer('Lakshmi Devi', '+91 93470 82651', 'H.No 11-3/2, Allwyn Colony', 'miyapur', 'Near Allwyn X Roads bus stop'),
      appliance: 'geyser',
      brand: 'bosch',
      model: '15 L storage, wall mount',
      service: 'Repair',
      issue: 'Water leaking from bottom, sparking near switch',
      customerNote: 'Main switch turned off. Elderly couple at home.',
      priority: 'emergency',
      status: 'request',
      requestedAt: minutesAgo(2),
      scheduledAt: minutesFromNow(35),
      distanceKm: 9.1,
      etaMin: 27,
      durationMin: 45,
      estFee: 749,
    },
    {
      ...blank,
      id: 'JB-24832',
      customer: customer('Vikram Singh', '+91 99590 27714', 'Flat 9B, Rainbow Vistas', 'manikonda'),
      appliance: 'ac',
      brand: 'samsung',
      service: 'Installation',
      issue: 'New 1.5 T split AC installation',
      priority: 'normal',
      status: 'cancelled',
      cancelReason: 'Customer rescheduled — AC delivery delayed',
      requestedAt: today(7, 30),
      scheduledAt: today(12, 0),
      distanceKm: 8.2,
      etaMin: 25,
      durationMin: 90,
      estFee: 1299,
      log: { assigned: today(7, 31), accepted: today(7, 40) },
    },
  ]
  return [...jobs, ...seedHistory()]
}

/** A request that lands a little after the technician goes online. */
export function lateRequest(): Job {
  return {
    ...blank,
    id: 'JB-24842',
    customer: customer('Deepika Nair', '+91 90102 66348', 'Flat 305, Lodha Meridian', 'kukatpally', 'KPHB Road No. 4'),
    appliance: 'ac',
    brand: 'samsung',
    model: '1 T window AC',
    service: 'Gas refill',
    issue: 'AC blowing warm air',
    customerNote: 'Outdoor fan runs, but no cooling at all since yesterday.',
    priority: 'high',
    status: 'request',
    requestedAt: new Date().toISOString(),
    scheduledAt: minutesFromNow(90),
    distanceKm: 5.3,
    etaMin: 17,
    durationMin: 75,
    estFee: 699,
  }
}

const NAMES = [
  'Sanjay Gupta', 'Meera Iyer', 'Faisal Khan', 'Divya Rao', 'Harish Babu', 'Pooja Jain',
  'Naveen Kumar', 'Swathi Reddy', 'Rohit Agarwal', 'Nandini Pillai', 'Imran Shaikh',
  'Aishwarya Joshi', 'Kiran Goud', 'Shalini Das', 'Venkat Ramana', 'Ritu Malhotra',
]

const ISSUES: Record<Appliance, [ServiceType, string][]> = {
  washer: [['Repair', 'Drum not spinning'], ['Repair', 'Water leaking from door'], ['General service', 'Periodic service & descaling'], ['Installation', 'New machine installation']],
  fridge: [['Repair', 'Not cooling'], ['Repair', 'Excess frost in freezer'], ['Gas refill', 'Gas refill'], ['Repair', 'Loud compressor noise']],
  oven: [['Repair', 'Not heating'], ['Repair', 'Convection fan not working'], ['Repair', 'Door not closing properly']],
  ac: [['General service', 'Jet wash service'], ['Gas refill', 'Gas refill — low cooling'], ['Repair', 'Outdoor unit not starting'], ['Installation', 'Split AC installation'], ['Uninstallation', 'Uninstallation for shifting']],
  geyser: [['Repair', 'Not heating'], ['Installation', 'New geyser installation'], ['Repair', 'Thermostat cutting off early']],
}

/** A month of finished work, deterministic so totals do not jump on reload. */
function seedHistory(): Job[] {
  const areaKeys = Object.keys(AREAS) as AreaKey[]
  const out: Job[] = []
  let seed = 7
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
  let n = 24828
  for (let day = 1; day <= 34; day++) {
    const count = day % 7 === 0 ? 1 : 2 + Math.floor(rnd() * 3)
    for (let i = 0; i < count; i++) {
      const appliance = APPLIANCES[Math.floor(rnd() * APPLIANCES.length)]!
      const brand: Brand = BRANDS[Math.floor(rnd() * BRANDS.length)]!
      const options = ISSUES[appliance]
      const [service, issue] = options[Math.floor(rnd() * options.length)]!
      const where = areaKeys[Math.floor(rnd() * areaKeys.length)]!
      const hour = 9 + i * 3 + Math.floor(rnd() * 2)
      const cancelled = rnd() < 0.08
      const partsCost = service === 'Repair' || service === 'Gas refill' ? Math.round((rnd() * 2400 + 300) / 10) * 10 : 0
      const amount = LABOUR_RATE[appliance] + partsCost + (service === 'Installation' ? 450 : 0)
      const name = NAMES[Math.floor(rnd() * NAMES.length)]!
      out.push({
        ...blank,
        id: `JB-${n--}`,
        customer: customer(name, '+91 9' + String(Math.floor(rnd() * 1e9)).padStart(9, '0'), 'Residence', where),
        appliance,
        brand,
        service,
        issue,
        priority: rnd() < 0.12 ? 'emergency' : 'normal',
        status: cancelled ? 'cancelled' : 'closed',
        cancelReason: cancelled ? 'Cancelled by customer' : undefined,
        requestedAt: today(hour - 2, 0, -day),
        scheduledAt: today(hour, 0, -day),
        distanceKm: Math.round((rnd() * 9 + 1) * 10) / 10,
        etaMin: 15,
        durationMin: 60,
        estFee: LABOUR_RATE[appliance],
        amount: cancelled ? 0 : amount,
        log: cancelled ? {} : { closed: today(hour + 1, 10, -day) },
        confirmation: cancelled ? undefined : { signature: '', rating: rnd() < 0.8 ? 5 : 4, review: '', at: today(hour + 1, 8, -day) },
      })
    }
  }
  return out
}

export function seedNotices(): Notice[] {
  return [
    { id: 'n1', kind: 'emergency', title: 'Emergency request · 9.1 km', body: 'Bosch Geyser — water leaking, sparking near switch. Miyapur.', at: minutesAgo(2), read: false, jobId: 'JB-24840' },
    { id: 'n2', kind: 'emergency', title: 'Emergency request · 6.4 km', body: 'Samsung Refrigerator stopped cooling. Jubilee Hills.', at: minutesAgo(4), read: false, jobId: 'JB-24838' },
    { id: 'n3', kind: 'request', title: 'New service request', body: 'LG Washing Machine — Error OE, not draining. HITEC City, 4:30 PM.', at: minutesAgo(11), read: false, jobId: 'JB-24839' },
    { id: 'n4', kind: 'customer', title: 'Priya Reddy sent a note', body: '“Gate is locked, please call when you reach the lane.”', at: minutesAgo(18), read: false, jobId: 'JB-24831' },
    { id: 'n5', kind: 'schedule', title: 'Schedule changed', body: 'JB-24836 moved from 4:00 PM to 5:30 PM at the customer’s request.', at: minutesAgo(52), read: true, jobId: 'JB-24836' },
    { id: 'n6', kind: 'assigned', title: 'Job assigned by dispatch', body: 'LG AC general service, Gachibowli — 3:30 PM.', at: today(10, 51), read: true, jobId: 'JB-24835' },
    { id: 'n7', kind: 'cancelled', title: 'Job cancelled', body: 'JB-24832 Samsung AC installation — customer rescheduled.', at: today(10, 15), read: true, jobId: 'JB-24832' },
    { id: 'n8', kind: 'payment', title: 'Payment received · ₹2,449', body: 'UPI payment for JB-24829 settled to your wallet.', at: today(10, 9), read: true, jobId: 'JB-24829' },
    { id: 'n9', kind: 'rating', title: 'New 5★ rating', body: 'Anjali Verma: “Explained everything clearly.”', at: today(10, 10), read: true, jobId: 'JB-24829' },
  ]
}

export const TECHNICIAN: Technician = {
  name: 'Ravi Teja Naidu',
  id: 'TCH-HYD-0472',
  phone: '+91 98855 20471',
  email: 'ravi.naidu@customerservice.example',
  photo: '',
  area: 'Kondapur · Gachibowli · Madhapur',
  base: 'Kondapur hub, Hyderabad',
  experienceYears: 8,
  rating: 4.86,
  ratingCount: 1284,
  // 6,236 stars over 1,284 ratings = 4.86.
  ratingBreakdown: [1156, 90, 26, 6, 6],
  completedJobs: 2317,
  joined: 'March 2019',
  brands: ['samsung', 'lg', 'bosch', 'ifb'],
  appliances: ['Washing Machine', 'Refrigerator', 'Oven', 'AC', 'Geyser'],
}

export const DEFAULT_SETTINGS: Settings = {
  schedule: {
    mon: { on: true, start: '09:00', end: '20:00' },
    tue: { on: true, start: '09:00', end: '20:00' },
    wed: { on: true, start: '09:00', end: '20:00' },
    thu: { on: true, start: '09:00', end: '20:00' },
    fri: { on: true, start: '09:00', end: '20:00' },
    sat: { on: true, start: '10:00', end: '18:00' },
    sun: { on: false, start: '10:00', end: '18:00' },
  },
  breakTime: { on: true, start: '13:00', end: '14:00' },
  emergencyAnyTime: true,
  radiusKm: 10,
  language: 'English',
  notify: { requests: true, emergency: true, schedule: true, payments: true, sound: true },
  upi: 'ravinaidu@okhdfc',
  bank: 'HDFC Bank ···· 4471',
  fingerprint: true,
  passwordChangedAt: new Date(Date.now() - 42 * 86_400_000).toISOString(),
  devices: [{ id: 'd1', name: 'Redmi Note 12 · Android', lastActive: new Date(Date.now() - 3 * 86_400_000).toISOString() }],
}

/** Demo credentials shown on the login screen. */
export const DEMO_OTP = '482913'

/**
 * Reviews left before this device's history begins. Short and specific, the
 * way customers actually write them — a few are lukewarm.
 */
export function seedReviews(): Review[] {
  const d = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString()
  return [
    { id: 'rv1', name: 'Anjali Verma', rating: 5, at: d(1), appliance: 'LG Refrigerator', text: 'Explained everything clearly. Fridge cooling perfectly now.' },
    { id: 'rv2', name: 'Suresh Babu', rating: 5, at: d(3), appliance: 'Samsung AC', text: 'Arrived on time and cleaned the outdoor unit properly. Cooling is much better.' },
    { id: 'rv3', name: 'Farah Siddiqui', rating: 4, at: d(5), appliance: 'Bosch Washing Machine', text: 'Fixed the drain issue quickly. Had to wait a day for the pump, but I was kept informed.' },
    { id: 'rv4', name: 'Karthik Reddy', rating: 5, at: d(8), appliance: 'IFB Geyser', text: 'Found the earth leakage and replaced the element. Very safety-conscious.' },
    { id: 'rv5', name: 'Lakshmi Prasad', rating: 5, at: d(12), appliance: 'LG Washing Machine', text: 'Polite, wore shoe covers, and showed me the old part before replacing it.' },
    { id: 'rv6', name: 'Rohan Mehta', rating: 3, at: d(16), appliance: 'Samsung Oven', text: 'Repair worked, but the visit was about 40 minutes late.' },
    { id: 'rv7', name: 'Divya Nair', rating: 5, at: d(21), appliance: 'Bosch Oven', text: 'Heating element replaced in under an hour. Bill matched the quote.' },
    { id: 'rv8', name: 'Imran Khan', rating: 4, at: d(27), appliance: 'LG AC', text: 'Good work on the gas top-up. Could have called before arriving.' },
  ]
}
