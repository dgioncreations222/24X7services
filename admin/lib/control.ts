import { APPLIANCES, APPLIANCE_LABEL, BRANDS, BRAND_LABEL, LABOUR_RATE, type Appliance } from './catalog'
import type { Seed } from './seed'
import {
  MODULES,
  PERMS,
  type AdminRole,
  type AdminUser,
  type AiCallConfig,
  type AiCallLog,
  type AiChatConfig,
  type AuditEntry,
  type CallPurpose,
  type Catalog,
  type MediaItem,
  type Module,
  type Perm,
  type RoleMatrix,
  type SiteContent,
} from './types'

/**
 * The control centre's starting state: who may do what, the AI agents'
 * scripts, the customer app's content and the catalogue it sells from.
 * Everything here is what an admin edits instead of asking a developer.
 */

/* ------------------------------------------------------------ Roles */

const ALL = [...PERMS]
const r = (...p: Perm[]) => p

export const DEFAULT_ROLES: RoleMatrix = {
  'Super Admin': Object.fromEntries(MODULES.map((m) => [m, m === 'audit' ? r('view', 'export') : ALL])) as RoleMatrix['Super Admin'],
  'Operations Admin': {
    dashboard: r('view'),
    dispatch: r('view', 'assign', 'edit'),
    bookings: r('view', 'create', 'edit', 'assign', 'export'),
    technicians: r('view', 'create', 'edit', 'approve', 'assign'),
    customers: r('view', 'edit'),
    support: r('view'),
    reports: r('view'),
  },
  'Finance Admin': {
    dashboard: r('view'),
    bookings: r('view'),
    payments: r('view', 'edit', 'approve', 'export'),
    payouts: r('view', 'approve', 'export'),
    reports: r('view', 'export'),
  },
  'Content Admin': {
    dashboard: r('view'),
    content: r('view', 'create', 'edit', 'delete', 'publish'),
    promotions: r('view', 'create', 'edit', 'delete', 'publish'),
    catalog: r('view'),
    reviews: r('view'),
  },
  'Support Admin': {
    dashboard: r('view'),
    support: r('view', 'create', 'edit', 'assign'),
    customers: r('view', 'edit'),
    reviews: r('view', 'edit', 'publish'),
    bookings: r('view'),
    ai: r('view'),
  },
}

export const MODULE_LABEL: Record<Module, string> = {
  dashboard: 'Dashboard',
  dispatch: 'Live Dispatch & Emergency',
  bookings: 'Bookings',
  support: 'Support Tickets',
  customers: 'Customers',
  reviews: 'Reviews & Ratings',
  promotions: 'Promotions & Offers',
  technicians: 'Technicians',
  payouts: 'Payouts',
  payments: 'Payments & Refunds',
  catalog: 'Services & Pricing',
  reports: 'Reports',
  ai: 'AI Center',
  content: 'Content & Media',
  admins: 'Admin Users',
  audit: 'Audit Logs',
  settings: 'Settings',
}

export const ROLE_NOTE: Record<AdminRole, string> = {
  'Super Admin': 'Full access to every module.',
  'Operations Admin': 'Bookings, technicians, customers, live dispatch and emergency operations.',
  'Finance Admin': 'Payments, payouts, refunds and reports.',
  'Content Admin': 'Content, media, banners, promotions, FAQs and testimonials.',
  'Support Admin': 'Support tickets, customers, reviews and customer communication.',
}

/* ------------------------------------------------------------- Seed */

export interface Control {
  roles: RoleMatrix
  admins: AdminUser[]
  audit: AuditEntry[]
  aiChat: AiChatConfig
  aiCall: AiCallConfig
  aiCalls: AiCallLog[]
  media: MediaItem[]
  content: SiteContent
  published: SiteContent
  contentPublishedAt: string
  catalog: Catalog
  catalogPublished: Catalog
  catalogPublishedAt: string
}

export function controlSeed(base: Seed, nowMs = Date.now()): Control {
  const ago = (min: number) => new Date(nowMs - min * 60_000).toISOString()

  const admins: AdminUser[] = [
    { id: 'ADM-01', name: 'Aditi Rao', email: 'aditi.rao@customerservice.example', phone: '+91 98480 11201', role: 'Super Admin', status: 'active', twoFactor: true, lastActive: ago(1), createdAt: ago(60 * 24 * 410) },
  ]

  /* ---------------------------------------------------------- Catalog */
  const rows = Object.fromEntries(
    BRANDS.map((b) => [
      b,
      Object.fromEntries(
        APPLIANCES.map((a) => {
          const normal = LABOUR_RATE[a] - 50 + (b === 'samsung' ? 0 : b === 'lg' ? 0 : b === 'bosch' ? 50 : 100)
          return [a, { normal, emergency: normal + 300 }]
        })
      ),
    ])
  ) as Catalog['pricing']['rows']

  const SERVICE_COPY: Record<Appliance, string> = {
    washer: 'Front-load, top-load and semi-automatic repair, drum service and installation.',
    fridge: 'Cooling faults, gas refill, compressor and defrost repair for single and double door.',
    oven: 'Microwave, OTG and built-in oven repair — heating, fan, thermostat and PCB.',
    ac: 'Split and window AC repair, gas refill, deep cleaning, installation and uninstallation.',
    geyser: 'Storage and instant geyser repair, element and thermostat replacement, installation.',
  }
  const TYPES: Record<Appliance, [string, number][]> = {
    washer: [['Repair', 549], ['General service', 549], ['Deep cleaning', 699], ['Installation', 440], ['Uninstallation', 440]],
    fridge: [['Repair', 649], ['General service', 649], ['Gas refill', 2849], ['Installation', 520]],
    oven: [['Repair', 499], ['General service', 499], ['Installation', 400]],
    ac: [['Repair', 699], ['General service', 699], ['Gas refill', 2899], ['Deep cleaning', 799], ['Installation', 1499], ['Uninstallation', 560]],
    geyser: [['Repair', 449], ['General service', 449], ['Installation', 360], ['Uninstallation', 360]],
  }
  const catalog: Catalog = {
    services: Object.fromEntries(
      APPLIANCES.map((a) => [
        a,
        { name: APPLIANCE_LABEL[a], description: SERVICE_COPY[a], image: `/media/svc-${a}.jpg`, enabled: true, types: TYPES[a].map(([name, price]) => ({ name, price, enabled: true })) },
      ])
    ) as Catalog['services'],
    brands: Object.fromEntries(
      BRANDS.map((b) => [
        b,
        { name: BRAND_LABEL[b], logo: `/media/logo-${b}.svg`, image: `/media/svc-${b === 'samsung' ? 'ac' : b === 'lg' ? 'fridge' : b === 'bosch' ? 'washer' : 'oven'}.jpg`, tagline: `Certified ${BRAND_LABEL[b]} service`, enabled: true },
      ])
    ) as Catalog['brands'],
    pricing: { rows, visitCharge: 199, labour: { ...LABOUR_RATE }, emergencyCharge: 299, taxPct: 18, platformFee: 29, cancellationFee: 99, additionalCharge: 150 },
    emergency: { enabled: true, surcharge: 299, nightSurcharge: 150, nightFrom: '22:00', nightTo: '06:00', slaMin: 45, maxRadiusKm: 15 },
  }
  // The published catalogue lags one change behind, so "Publish" has something to show.
  const catalogPublished: Catalog = structuredClone(catalog)
  catalog.pricing.rows.samsung.ac = { normal: 599, emergency: 899 }
  catalogPublished.pricing.rows.samsung.ac = { normal: 499, emergency: 799 }

  /* ------------------------------------------------------------ Media */
  const m = (id: string, name: string, category: MediaItem['category'], url: string, size: number, width: number, height: number, alt: string, daysAgo: number, by = 'Kavya Shetty'): MediaItem => ({
    id, name, category, url, size, width, height, alt, uploadedAt: ago(60 * 24 * daysAgo + 37), uploadedBy: by,
  })
  const media: MediaItem[] = [
    m('MD-101', 'washing-machine.jpg', 'service', '/media/svc-washer.jpg', 16766, 600, 600, 'Washing machine', 40),
    m('MD-102', 'refrigerator.jpg', 'service', '/media/svc-fridge.jpg', 17221, 600, 600, 'Refrigerator', 40),
    m('MD-103', 'oven.jpg', 'service', '/media/svc-oven.jpg', 36089, 600, 600, 'Oven', 40),
    m('MD-104', 'air-conditioner.jpg', 'service', '/media/svc-ac.jpg', 7691, 600, 600, 'Split AC', 40),
    m('MD-105', 'geyser.jpg', 'service', '/media/svc-geyser.jpg', 13918, 600, 600, 'Geyser', 40),
    m('MD-201', 'samsung-logo.svg', 'brand', '/media/logo-samsung.svg', 4466, 7051, 1080, 'Samsung logo', 60),
    m('MD-202', 'lg-logo.svg', 'brand', '/media/logo-lg.svg', 1835, 200, 90, 'LG logo', 60),
    m('MD-203', 'bosch-logo.svg', 'brand', '/media/logo-bosch.svg', 2309, 300, 70, 'Bosch logo', 60),
    m('MD-204', 'ifb-logo.svg', 'brand', '/media/logo-ifb.svg', 410, 120, 48, 'IFB logo', 60),
    m('MD-301', 'banner-ac-summer.jpg', 'banner', '/media/banner-air-conditioner.jpg', 66076, 1200, 675, 'Technician servicing a split AC', 12),
    m('MD-302', 'banner-fridge.jpg', 'banner', '/media/banner-refrigerator.jpg', 74785, 1200, 675, 'Refrigerator repair', 12),
    m('MD-303', 'banner-washer.jpg', 'banner', '/media/banner-washing-machine.jpg', 76709, 1200, 675, 'Washing machine repair', 9),
    m('MD-304', 'banner-geyser.jpg', 'banner', '/media/banner-geyser.jpg', 66322, 1200, 675, 'Geyser installation', 3),
    m('MD-401', 'promo-ac-gas-refill.jpg', 'promotion', '/media/promo-ac-gas.jpg', 87831, 1200, 800, 'AC gas refill offer', 18),
    m('MD-402', 'promo-washer-service.jpg', 'promotion', '/media/promo-washer.jpg', 75005, 1200, 800, 'Washer service offer', 18),
    m('MD-501', 'shield.svg', 'icon', '/media/icon-shield.svg', 333, 24, 24, 'Warranty shield', 90, 'Aditi Rao'),
    m('MD-502', 'chat.svg', 'icon', '/media/icon-chat.svg', 706, 24, 24, 'Chat bubble', 90, 'Aditi Rao'),
    m('MD-503', 'estimate.svg', 'icon', '/media/icon-estimate.svg', 639, 24, 24, 'Estimate', 90, 'Aditi Rao'),
  ]

  /* ---------------------------------------------------------- Content */
  const content: SiteContent = {
    homepage: {
      heroHeading: 'Appliance repair at your door, round the clock',
      heroSub: 'Certified Samsung, LG, Bosch and IFB technicians in Hyderabad — usually there within 45 minutes.',
      cta: 'Book a technician',
      heroImage: '/media/banner-air-conditioner.jpg',
      services: { visible: true, title: 'What we fix', body: 'Washing machines, refrigerators, ovens, ACs and geysers.' },
      promo: { visible: true, title: 'Offers this week', body: 'Save on monsoon AC care and your first booking.' },
      trust: { visible: true, title: 'Why Hyderabad trusts Customer Service', body: 'Verified technicians · 30-day service warranty · Upfront prices · Genuine parts.' },
      faq: { visible: true, title: 'Questions, answered', body: 'Everything about visits, prices and warranty.' },
    },
    banners: [
      { id: 'BN-11', image: '/media/banner-air-conditioner.jpg', heading: 'AC not cooling?', sub: 'Gas refill and deep cleaning from ₹699', cta: 'Book AC service', link: '/services/ac', placement: 'Home hero', start: ago(60 * 24 * 10), end: new Date(nowMs + 20 * 86_400_000).toISOString(), enabled: true },
      { id: 'BN-12', image: '/media/banner-refrigerator.jpg', heading: 'Fridge trouble, fixed today', sub: 'Same-day refrigerator repair across Hyderabad', cta: 'Book now', link: '/services/fridge', placement: 'Home hero', start: ago(60 * 24 * 6), end: new Date(nowMs + 24 * 86_400_000).toISOString(), enabled: true },
      { id: 'BN-13', image: '/media/banner-washing-machine.jpg', heading: 'Bosch washer week', sub: '10% off with BOSCH10', cta: 'See offer', link: '/offers', placement: 'Home strip', start: ago(60 * 24 * 2), end: new Date(nowMs + 12 * 86_400_000).toISOString(), enabled: true },
      { id: 'BN-14', image: '/media/banner-geyser.jpg', heading: 'Winter is coming', sub: 'Book a geyser check before the rush', cta: 'Schedule', link: '/services/geyser', placement: 'Offers page', start: new Date(nowMs + 30 * 86_400_000).toISOString(), end: new Date(nowMs + 75 * 86_400_000).toISOString(), enabled: true },
    ],
    serviceImages: Object.fromEntries(APPLIANCES.map((a) => [a, `/media/svc-${a}.jpg`])) as SiteContent['serviceImages'],
    brandLogos: Object.fromEntries(BRANDS.map((b) => [b, { url: `/media/logo-${b}.svg`, enabled: true }])) as SiteContent['brandLogos'],
    faqs: [
      { id: 'FQ-1', category: 'Visits', q: 'How fast can a technician reach me?', a: 'Most visits start within 45 minutes. Emergency requests are dispatched first, day or night.', visible: true },
      { id: 'FQ-2', category: 'Prices', q: 'Is there a visit charge?', a: 'The visit charge is adjusted in your bill when you go ahead with the repair.', visible: true },
      { id: 'FQ-3', category: 'Warranty', q: 'Is the repair covered by warranty?', a: 'Every repair carries a 30-day service warranty; genuine parts carry the maker’s warranty.', visible: true },
      { id: 'FQ-4', category: 'Brands', q: 'Which brands do you service?', a: 'Samsung, LG, Bosch and IFB — washing machines, refrigerators, ovens, ACs and geysers.', visible: true },
      { id: 'FQ-5', category: 'Payments', q: 'How can I pay?', a: 'UPI, card, Customer Service wallet or cash after the service.', visible: true },
      { id: 'FQ-6', category: 'Visits', q: 'Can I reschedule?', a: 'Yes, free of charge up to one hour before the slot.', visible: false },
    ],
    testimonials: [
      { id: 'TS-1', name: 'Ananya Reddy', area: 'Gachibowli', appliance: 'Samsung AC', rating: 5, text: 'Technician arrived in 30 minutes and the AC was cooling again within the hour.', visible: true },
      { id: 'TS-2', name: 'Mohammed Irfan', area: 'Tolichowki', appliance: 'LG Refrigerator', rating: 5, text: 'Explained the fault, showed the old part, and the bill matched the estimate.', visible: true },
      { id: 'TS-3', name: 'Priya Sharma', area: 'Kondapur', appliance: 'Bosch Washing Machine', rating: 4, text: 'Neat work and very polite. Part took a day to arrive but they kept me posted.', visible: true },
      { id: 'TS-4', name: 'Vikram Rao', area: 'Banjara Hills', appliance: 'IFB Oven', rating: 5, text: 'Late-night emergency handled calmly. Highly recommend Customer Service.', visible: false },
    ],
  }
  const published: SiteContent = structuredClone(content)

  /* --------------------------------------------------------------- AI */
  const aiChat: AiChatConfig = {
    enabled: true,
    name: 'Seva',
    avatar: '/media/icon-chat.svg',
    welcome: 'Namaste! I’m Seva, the Customer Service assistant. Tell me what’s wrong with your appliance and I’ll help you book the right service.',
    quickQuestions: ['My AC is not cooling', 'Washing machine not draining', 'Fridge making noise', 'What does a visit cost?', 'Track my technician'],
    instructions:
      'You are the Customer Service assistant for customers and technicians in Hyderabad. Help diagnose common faults, explain error codes in plain language, suggest the right service, and book or track visits. Be warm, short and accurate.',
    brands: [...BRANDS],
    appliances: [...APPLIANCES],
    techRules:
      'Say a cause is possible, never confirmed. List likely parts with “check compatibility for the model”. Never quote a final price — give the starting price and say the technician confirms on site.',
    safety:
      'If the customer mentions sparks, burning smell, gas smell, water near sockets or a tripping MCB repeatedly, tell them to switch off the mains and offer an emergency booking. Never guide anyone to open a sealed refrigerant circuit or live PCB.',
    tone: 'Friendly',
    handoff: true,
  }
  const aiCall: AiCallConfig = {
    enabled: true,
    name: 'Seva Voice',
    voice: 'Ananya — warm, Indian English',
    language: 'English + Hindi',
    greeting: 'Hello, this is Seva, an automated assistant calling from Customer Service about your appliance booking.',
    scripts: {
      confirm: 'Your {appliance} service is booked for {slot}. Can you confirm someone will be home? Say yes to confirm or reschedule to pick a new time.',
      eta: '{technician} is on the way and should reach you in about {eta} minutes.',
      followup: 'We hope your {appliance} is working well after yesterday’s visit. On a scale of 1 to 5, how was the service?',
      reschedule: 'No problem. I can offer {options}. Which suits you?',
      escalation: 'I’ll connect you to our support team now. Please stay on the line.',
    },
    maxDurationMin: 4,
    callingHours: { start: '08:00', end: '21:00' },
    recording: { enabled: true, consent: true, retentionDays: 90 },
    summary: { auto: true, attachToBooking: true, notifyTechnician: true, format: 'Short' },
  }

  const PURPOSE_TEXT: Record<CallPurpose, { summary: string; outcome: string; lines: [string, string][] }> = {
    'Appointment confirmation': {
      summary: 'Customer confirmed the slot and will be home.', outcome: 'Slot confirmed',
      lines: [['ai', 'Your service is booked for this afternoon. Will someone be home?'], ['customer', 'Yes, I’ll be home after 2.'], ['ai', 'Thank you, your slot is confirmed.']],
    },
    'ETA update': {
      summary: 'Customer informed of technician ETA; gate code shared.', outcome: 'ETA shared',
      lines: [['ai', 'Your technician is on the way and should reach in about 20 minutes.'], ['customer', 'Okay. Tell him to use gate 2, code 4471.'], ['ai', 'Noted, I’ll pass that on.']],
    },
    'Location confirmation': {
      summary: 'Landmark confirmed: opposite the Ratnadeep supermarket.', outcome: 'Location confirmed',
      lines: [['ai', 'Can you confirm a landmark near your address?'], ['customer', 'Opposite Ratnadeep, third floor.'], ['ai', 'Thank you, I’ve added that to the booking.']],
    },
    'Service follow-up': {
      summary: 'Appliance working fine; customer rated 5.', outcome: 'Rated 5★',
      lines: [['ai', 'Is your appliance working well after the visit?'], ['customer', 'Yes, all good. Very happy.'], ['ai', 'Wonderful. How would you rate the service from 1 to 5?'], ['customer', 'Five.']],
    },
    Rescheduling: {
      summary: 'Customer moved the visit to tomorrow 10 AM.', outcome: 'Rescheduled',
      lines: [['ai', 'Would you like to keep today’s slot?'], ['customer', 'Can we do tomorrow morning instead?'], ['ai', 'I can offer 10 AM or 11:30 AM.'], ['customer', '10 is fine.']],
    },
    Escalation: {
      summary: 'Customer upset about delay; transferred to support.', outcome: 'Escalated to support',
      lines: [['ai', 'Your technician is running about 25 minutes late.'], ['customer', 'This is the second time. I want to speak to someone.'], ['ai', 'I understand. Connecting you to our support team now.']],
    },
  }
  const recent = base.bookings.filter((b) => b.technicianId && nowMs - new Date(b.scheduledAt).getTime() < 6 * 86_400_000 && new Date(b.createdAt).getTime() < nowMs)
  const purposes = Object.keys(PURPOSE_TEXT) as CallPurpose[]
  const aiCalls: AiCallLog[] = recent.slice(0, 42).map((b, i) => {
    const purpose = b.status === 'completed' ? (i % 3 === 0 ? 'Service follow-up' : 'Appointment confirmation') : purposes[i % purposes.length]!
    const p = PURPOSE_TEXT[purpose]
    const status: AiCallLog['status'] = purpose === 'Escalation' ? 'escalated' : i % 11 === 4 ? 'no_answer' : i % 17 === 9 ? 'voicemail' : i % 23 === 13 ? 'failed' : 'completed'
    const answered = status === 'completed' || status === 'escalated'
    const at = new Date(Math.min(new Date(b.scheduledAt).getTime() - (purpose === 'Service follow-up' ? -20 : 2) * 3_600_000, nowMs - (i + 1) * 9 * 60_000)).toISOString()
    return {
      id: `CL-${7300 + i}`,
      bookingId: b.id,
      customerId: b.customerId,
      technicianId: b.technicianId,
      purpose,
      at,
      durationSec: answered ? 48 + ((i * 37) % 150) : status === 'voicemail' ? 22 : 0,
      status,
      sentiment: purpose === 'Escalation' ? 'negative' : purpose === 'Service follow-up' ? 'positive' : 'neutral',
      summary: answered ? p.summary : status === 'no_answer' ? 'No answer after 3 rings; SMS sent with booking details.' : status === 'voicemail' ? 'Reached voicemail; left a short message.' : 'Call could not connect (network).',
      outcome: answered ? p.outcome : status === 'no_answer' ? 'Retry scheduled' : status === 'voicemail' ? 'Message left' : 'Failed',
      recording: answered,
      transcript: answered
        ? [{ who: 'ai' as const, text: aiCall.greeting, t: 0 }, ...p.lines.map(([who, text], k) => ({ who: who as 'ai' | 'customer', text, t: 6 + k * 9 }))]
        : [],
    }
  })

  /* ------------------------------------------------------------ Audit */
  const A = (min: number, admin: string, role: AuditEntry['role'], module: Module, action: string, target?: string, old?: string, nw?: string): AuditEntry => ({
    id: `AU-${Math.round(nowMs / 1000) - min}`, at: ago(min), admin, role, module, action, target, old, new: nw,
  })
  const anyBooking = base.bookings.find((b) => b.technicianId && b.status === 'assigned') ?? base.bookings[0]!
  const tName = base.technicians.find((t) => t.id === anyBooking.technicianId)?.name ?? 'a technician'
  const audit: AuditEntry[] = [
    A(22, 'Aditi Rao', 'Super Admin', 'catalog', 'Changed price', 'Samsung AC · normal', '₹499', '₹599'),
    A(23, 'Aditi Rao', 'Super Admin', 'catalog', 'Changed price', 'Samsung AC · emergency', '₹799', '₹899'),
    A(48, 'Kavya Shetty', 'Content Admin', 'content', 'Replaced banner image', 'BN-11 · AC not cooling?', 'banner-ac-old.jpg', 'banner-ac-summer.jpg'),
    A(65, 'Sravani K', 'Operations Admin', 'bookings', 'Assigned technician', anyBooking.id, 'Unassigned', tName),
    A(130, 'Vivek Menon', 'Operations Admin', 'catalog', 'Disabled service', 'LG Refrigerator', 'Enabled', 'Disabled'),
    A(131, 'Vivek Menon', 'Operations Admin', 'catalog', 'Enabled service', 'LG Refrigerator', 'Disabled', 'Enabled'),
    A(190, 'Meghana Iyer', 'Finance Admin', 'payouts', 'Released payouts', '14 technicians', '—', '₹62,410'),
    A(260, 'Kavya Shetty', 'Content Admin', 'content', 'Published homepage', 'Homepage', 'Version 13', 'Version 14'),
    A(320, 'Farah Khan', 'Support Admin', 'support', 'Resolved ticket', 'TKT-3102'),
    A(410, 'Aditi Rao', 'Super Admin', 'admins', 'Changed role', 'Kavya Shetty', 'Support Admin', 'Content Admin'),
    A(600, 'Kavya Shetty', 'Content Admin', 'promotions', 'Created offer', 'BOSCH10', '—', '10% · Bosch washer'),
    A(780, 'Aditi Rao', 'Super Admin', 'ai', 'Updated AI call script', 'ETA script', '“…reach in {eta} min.”', '“…should reach you in about {eta} minutes.”'),
    A(900, 'Vivek Menon', 'Operations Admin', 'technicians', 'Suspended technician', base.technicians[17]?.name ?? 'Technician', 'Verified', 'Suspended'),
    A(1300, 'Meghana Iyer', 'Finance Admin', 'payments', 'Issued refund', base.bookings.find((b) => b.status === 'refunded')?.id ?? 'BK', '—', '₹649'),
    A(1500, 'Aditi Rao', 'Super Admin', 'settings', 'Changed emergency SLA', 'Operations', '60 min', '45 min'),
    A(2100, 'Aditi Rao', 'Super Admin', 'admins', 'Invited admin', 'Imran Siddiqui', '—', 'Finance Admin'),
    A(2900, 'Kavya Shetty', 'Content Admin', 'content', 'Uploaded media', 'banner-geyser.jpg'),
    A(3600, 'System', 'System', 'catalog', 'Published catalogue', 'Services & Pricing', 'Draft', 'Live'),
  ]

  return {
    roles: DEFAULT_ROLES,
    admins,
    audit,
    aiChat,
    aiCall,
    aiCalls,
    media,
    content,
    published,
    contentPublishedAt: ago(260),
    catalog,
    catalogPublished,
    catalogPublishedAt: ago(3600),
  }
}

/** Route → the module that guards it. */
export const ROUTE_MODULE: Record<string, Module> = {
  '/dashboard': 'dashboard',
  '/dispatch': 'dispatch',
  '/bookings': 'bookings',
  '/support': 'support',
  '/customers': 'customers',
  '/reviews': 'reviews',
  '/promotions': 'promotions',
  '/technicians': 'technicians',
  '/payouts': 'payouts',
  '/payments': 'payments',
  '/catalog': 'catalog',
  '/reports': 'reports',
  '/ai': 'ai',
  '/content': 'content',
  '/admins': 'admins',
  '/audit': 'audit',
  '/settings': 'settings',
}
