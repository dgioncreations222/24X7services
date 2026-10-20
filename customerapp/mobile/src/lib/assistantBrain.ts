import {
  APPLIANCE_IDS,
  formatPaise,
  type ApplianceId,
  type BusinessConfig,
  type CatalogIssue,
  type CatalogService,
  type DiagnosisRule,
  type ServiceArea,
  type ServiceKey,
} from '@app/shared'
import { brand } from '@/config/brand'

/**
 * How the assistant reads a message and what it says back.
 *
 * It is not a language model. It reads the message for what is being asked —
 * a question about warranty, payment, timing or cancelling; a kind of job; an
 * appliance and a symptom — and answers from the catalog and business config
 * the rest of the app already shows: the issues and diagnosis rules our
 * technicians wrote, the services and their fees and FAQs, the cancellation
 * policy. Every answer is one we would stand behind, it is free to run, and it
 * works in the backend-free demo.
 *
 * The rule it keeps: answer the question that was asked. A question about the
 * warranty gets the warranty, not a list of fridge faults because the fridge
 * was mentioned two messages ago; a TV gets told we do not repair TVs rather
 * than being asked which of five appliances it is.
 *
 * Pure: everything it reads comes through `AssistantSource`, which is what
 * lets it be exercised against the seed fixtures without a Firestore.
 */

export interface AssistantAction {
  label: string
  href: string
  /** The one thing to do next. Everything else is secondary. */
  primary?: boolean
}

export interface AssistantReply {
  text: string
  /** A heading for the answer: the symptom matched, or the topic. */
  issue?: string
  causes?: string[]
  tips?: string[]
  actions?: AssistantAction[]
  /** Tappable answers to the question the reply just asked. */
  quickReplies?: string[]
}

/** What carries from one message to the next. */
export interface AssistantContext {
  applianceId?: ApplianceId
}

export interface AssistantSource {
  services(applianceId: ApplianceId): Promise<CatalogService[]>
  issues(applianceId: ApplianceId): Promise<CatalogIssue[]>
  rule(issueId: string): Promise<DiagnosisRule | null>
  business(): Promise<BusinessConfig | null>
  areas(): Promise<ServiceArea[]>
}

// ---------------------------------------------------------------------------
// Reading the message
// ---------------------------------------------------------------------------

const APPLIANCE_NAMES: Record<ApplianceId, string> = {
  'washing-machine': 'Washing Machine',
  'air-conditioner': 'AC',
  refrigerator: 'Fridge',
  geyser: 'Geyser',
  microwave: 'Microwave',
}

/** Tested in order; the first appliance whose pattern matches wins. */
const APPLIANCE_PATTERNS: [ApplianceId, RegExp][] = [
  ['washing-machine', /washing|washer|laundry|front ?load|top ?load/],
  ['refrigerator', /fridge|frige|refrigerat|freezer|double door|single door/],
  ['air-conditioner', /\bac\b|\ba\.c\b|air ?con|aircon|split ac|window ac|inverter ac/],
  ['geyser', /geyser|geysar|gyser|water heater|\bheater\b/],
  ['microwave', /microwave|\boven\b|\botg\b/],
]

/** Things people will ask about that we do not repair. */
const NOT_SERVICED: [string, RegExp][] = [
  ['TVs', /\btv\b|television|\bled tv\b/],
  ['laptops and computers', /laptop|computer|\bpc\b|desktop/],
  ['phones', /\bphone\b|mobile|iphone|android/],
  ['fans', /\bfans?\b|ceiling fan/],
  ['air coolers', /\bcooler\b/],
  ['chimneys', /chimney/],
  ['dishwashers', /dish ?washer/],
  ['water purifiers', /purifier|\bro\b|\bro water\b/],
  ['inverters and batteries', /inverter(?! ac)|battery|ups\b/],
  ['cars and bikes', /\bcar\b|\bbike\b|scooter/],
  ['plumbing and electrical work', /plumb|electrician|wiring|\btap\b|pipe burst/],
  ['cleaning and beauty services', /facial|salon|haircut|massage|sofa|bathroom clean|pest/],
]

/** Hinglish and common misspellings, rewritten into words the catalog uses. */
const FOLDS: [RegExp, string][] = [
  [/\b(thanda|thandi|thanda nahi)\b/g, 'cooling'],
  [/\b(garam|garm)\b/g, 'hot heating'],
  [/\b(awaaz|awaz|aawaz|avaaz|shor)\b/g, 'noise'],
  [/\b(pani|paani)\b/g, 'water'],
  [/\b(tapak|tapakna|tapak raha|tapakta)\b/g, 'leaking drip'],
  [/\b(badboo|badbu|smell aa)\b/g, 'smell'],
  [/\b(baraf|barf)\b/g, 'ice'],
  [/\b(chal nahi|chalu nahi|on nahi|start nahi|band ho)\w*/g, 'not switching on'],
  [/\b(ghoom|ghum)\w*/g, 'spinning'],
  [/\b(kharab|kaam nahi|work nahi)\w*/g, 'not working'],
  [/\b(lagwana|lagana|fitting)\b/g, 'install'],
  [/\b(nikalna|hatana)\b/g, 'uninstall'],
  [/\b(kitna|kitne|kitni)\b/g, 'how much'],
  [/\b(kab|kitne baje)\b/g, 'when'],
  [/\b(aaj|aj)\b/g, 'today'],
  [/\b(kal)\b/g, 'tomorrow'],
  [/\bnahi\b|\bnhi\b|\bnai\b|\bna\b/g, 'not'],
]

/** Words that point at a symptom, keyed by the tail of the issue id. */
const SYMPTOM_WORDS: Record<string, string[]> = {
  'not-draining': ['drain', 'not going out', 'water stays', 'standing water', 'water not coming out'],
  'not-spinning': ['spin', 'drum', 'rotat', 'not turning'],
  leaking: ['leak', 'drip', 'puddle', 'water on the floor', 'water coming out'],
  noisy: ['noise', 'noisy', 'sound', 'loud', 'rattl', 'vibrat', 'shak', 'hum', 'buzz', 'knock', 'rumbl'],
  'not-starting': ['switching on', 'switch on', 'turn on', 'turning on', 'start', 'no power', 'dead', 'not working', 'stopped working'],
  'error-code': ['error', 'code', 'blink'],
  'door-stuck': ['door stuck', 'door locked', 'door will not open', 'door not opening', 'door'],
  'not-cooling': ['cool', 'cold', 'warm', 'not chilling', 'hot air'],
  'bad-smell': ['smell', 'odour', 'odor', 'stink'],
  icing: ['ice', 'frost', 'frozen pipe'],
  tripping: ['trip', 'mcb', 'fuse', 'breaker', 'shock', 'spark'],
  'excess-ice': ['ice', 'frost', 'freezer full'],
  'door-seal': ['seal', 'gasket', 'door not closing', 'door'],
  'always-running': ['always running', 'never stops', 'keeps running', 'continuous', 'runs all the time'],
  'light-out': ['light', 'display', 'bulb'],
  'no-hot-water': ['no hot', 'cold water', 'not heating', 'not hot', 'heating'],
  'slow-heating': ['slow', 'takes long', 'too long'],
  'low-pressure': ['pressure', 'flow', 'trickle'],
  'not-heating': ['not heat', 'cold food', 'food stays cold', 'food is cold', 'heat'],
  sparking: ['spark', 'fire', 'flash', 'burning'],
  turntable: ['turntable', 'plate', 'rotat', 'not turning'],
  panel: ['button', 'display', 'panel', 'touch', 'keypad'],
  door: ['door'],
}

/** The kind of job, when the message names one. Repair is the default. */
const JOB_PATTERNS: [ServiceKey, RegExp][] = [
  ['uninstallation', /uninstall|dismount|remov(e|al|ing)|relocat|shift(ing)? (the|my|it|house)/],
  ['installation', /install|new (ac|fridge|geyser|machine|washing|microwave)|\bmount/],
  ['gas-refill', /\bgas\b|refill|recharg/],
  ['deep-clean', /deep ?clean|jet (wash|clean)|foam/],
  [
    'service',
    /servicing|general service|annual service|routine service|(ac|fridge|refrigerator|machine|geyser|microwave|oven) servic|\bservice (my|the|of|for|it)\b|\b(need|needs|want|get|book|do)( an?| my| the)? (general )?service\b|maintenance|\bclean(ing)?\b/,
  ],
]

/**
 * Questions that are not about a fault, in the order they are checked. The
 * first match is the topic of the reply.
 */
type Topic =
  | 'greeting'
  | 'thanks'
  | 'human'
  | 'status'
  | 'cancel'
  | 'reschedule'
  | 'warranty'
  | 'parts'
  | 'payment'
  | 'price'
  | 'timing'
  | 'technician'
  | 'area'
  | 'booking'
  | 'capabilities'

const TOPICS: [Topic, RegExp][] = [
  ['thanks', /^(thanks|thank you|thank u|thx|ty|ok thanks|okay thanks|great thanks|shukriya|dhanyavad)\b/],
  ['greeting', /^(hi+|hello|hey|namaste|namaskar|good (morning|afternoon|evening))\b[\s!.]*$/],
  ['human', /talk to (a )?(human|person|someone|agent)|customer care|call (you|me|support)|phone number|contact|helpline|support team|complain/],
  ['status', /where is (my|the) (technician|expert)|technician (is )?(late|not come|not arrived|not here)|booking status|track/],
  ['cancel', /cancel/],
  ['reschedule', /reschedul|change (the )?(time|date|slot)|move (my|the) booking|postpone/],
  ['warranty', /warranty|guarantee|(comes?|came|coming) back|again after (the )?repair|repeat|after (the )?repair/],
  ['parts', /spare|parts?\b|original part|genuine part/],
  ['payment', /\bpay|payment|upi|card|cash|netbanking|gpay|paytm|phonepe|invoice|gst|bill\b/],
  ['price', /price|cost|charge|how much|fee|rate|expensive|cheap|rupees|\brs\b|₹/],
  ['timing', /when (can|will|do|does|is|are)|timing|time slot|slots?\b|today|tomorrow|sunday|saturday|weekend|at night|same day|how soon|how fast|how quickly|available|availability|are you open|open (on|today|tomorrow|at)|working hours|opening hours|24 ?x ?7|24\/7/],
  ['technician', /technician|expert|engineer|mechanic|who (is|will) come|verified|trained|safe|trust/],
  ['area', /area|pincode|pin code|location|city|hyderabad|secunderabad|do you (come|serve|service) (to|in)|\b\d{6}\b/],
  ['booking', /how (do|can|to) (i )?book|booking process|how does (it|this) work|steps/],
  ['capabilities', /what (can|do) you (do|fix|repair|service)|which appliances|services (do )?you (offer|provide)|what services/],
]

/** Topics whose words also turn up in descriptions of a fault. */
const WEAK_TOPICS = new Set<Topic>(['price', 'timing', 'technician', 'area', 'booking'])

const GENERIC_FAULT = /problem|issue|fault|broken|repair|fix|not working|stopped|damage|help/

function fold(message: string): string {
  let text = ` ${message.toLowerCase().replace(/[’']/g, '')} `
  for (const [pattern, replacement] of FOLDS) {
    text = text.replace(pattern, replacement)
  }
  return text.replace(/[?!.,]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function applianceIn(text: string): ApplianceId | undefined {
  return APPLIANCE_PATTERNS.find(([, pattern]) => pattern.test(text))?.[0]
}

function jobIn(text: string): ServiceKey | undefined {
  return JOB_PATTERNS.find(([, pattern]) => pattern.test(text))?.[0]
}

function topicIn(text: string): Topic | undefined {
  return TOPICS.find(([, pattern]) => pattern.test(text))?.[0]
}

function notServicedIn(text: string): string | undefined {
  return NOT_SERVICED.find(([, pattern]) => pattern.test(text))?.[0]
}

/**
 * Whether the message has a word starting with this one. From the start of a
 * word, never the middle: "ice" is a symptom, the end of "service" is not.
 */
function hasWord(text: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`\\b${escaped}`).test(text)
}

/** Issues the message looks like, best first, with their scores. */
function rankIssues(
  text: string,
  issues: readonly CatalogIssue[]
): { issue: CatalogIssue; score: number }[] {
  const ranked: { issue: CatalogIssue; score: number }[] = []
  for (const issue of issues) {
    const label = issue.label.toLowerCase()
    // A tapped quick reply is the label itself: that is the answer outright.
    if (text === label) return [{ issue, score: 100 }]

    const tail = issue.id.slice(issue.applianceId.length + 1)
    let score = 0
    for (const word of SYMPTOM_WORDS[tail] ?? []) {
      if (hasWord(text, word)) score += word.includes(' ') ? 3 : 2
    }
    for (const token of label.split(/[^a-z]+/)) {
      if (token.length > 3 && hasWord(text, token)) score += 1
    }
    if (score > 0) ranked.push({ issue, score })
  }
  return ranked.sort((a, b) => b.score - a.score)
}

// ---------------------------------------------------------------------------
// Building replies
// ---------------------------------------------------------------------------

function serviceHref(service: CatalogService): string {
  return `/services/detail/?a=${service.applianceId}&s=${service.serviceKey}`
}

function bookAction(service: CatalogService): AssistantAction {
  return {
    label: `Book ${service.name} · ${formatPaise(service.visitFee)}`,
    href: serviceHref(service),
    primary: true,
  }
}

function allServicesAction(applianceId: ApplianceId): AssistantAction {
  return {
    label: `See all ${APPLIANCE_NAMES[applianceId]} services`,
    href: `/services/appliance/?a=${applianceId}`,
  }
}

const SUPPORT_ACTION: AssistantAction = { label: 'Talk to support', href: '/support' }
const BOOKINGS_ACTION: AssistantAction = { label: 'Open my bookings', href: '/bookings' }

function duration(minutes: number): string {
  if (minutes < 60) return `${minutes} mins`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  const h = hours === 1 ? '1 hr' : `${hours} hrs`
  return rest === 0 ? h : `${h} ${rest} mins`
}

function applianceList(): string {
  return 'washing machines, ACs, fridges, geysers and microwaves'
}

const APPLIANCE_REPLIES = APPLIANCE_IDS.map((id) => APPLIANCE_NAMES[id])

const WHAT_I_CAN_DO = [
  'My fridge is not cooling',
  'AC service price',
  'Is there a warranty?',
  'How do I pay?',
]

/** The FAQ answer on a service whose question matches, if it has one. */
function faqAnswer(
  services: readonly CatalogService[],
  pattern: RegExp
): string | undefined {
  for (const service of services) {
    for (const faq of service.faqs ?? []) {
      if (pattern.test(faq.q.toLowerCase())) return faq.a
    }
  }
  return undefined
}

async function anyServices(
  source: AssistantSource,
  applianceId: ApplianceId | undefined
): Promise<CatalogService[]> {
  return source.services(applianceId ?? 'washing-machine')
}

async function topicReply(
  topic: Topic,
  text: string,
  applianceId: ApplianceId | undefined,
  source: AssistantSource
): Promise<AssistantReply | undefined> {
  const name = applianceId ? APPLIANCE_NAMES[applianceId] : undefined

  switch (topic) {
    case 'greeting':
      return {
        text: `Hi! I can help with ${applianceList()}: what a fault usually is, what to try first, what the visit costs, and how booking, payment and the warranty work. What is going on?`,
        quickReplies: WHAT_I_CAN_DO,
      }

    case 'thanks':
      return {
        text: 'You are welcome! If anything else comes up with an appliance, just ask.',
        actions: applianceId ? [allServicesAction(applianceId)] : undefined,
      }

    case 'capabilities':
      return {
        text: `We repair, service, install and uninstall ${applianceList()} across Hyderabad. Tell me what your appliance is doing and I will tell you what it usually is and what it costs.`,
        quickReplies: APPLIANCE_REPLIES,
      }

    case 'human': {
      const business = await source.business()
      return {
        issue: 'Talk to our team',
        text: business?.supportPhone
          ? `Our support team is on chat in the app at any hour, or you can call ${business.supportPhone.replace(/^\+91/, '+91 ')}. If it is about a booking, open it first so they can see it.`
          : 'Our support team is on chat in the app at any hour. If it is about a booking, open it first so they can see it.',
        actions: [{ ...SUPPORT_ACTION, primary: true }, BOOKINGS_ACTION],
      }
    }

    case 'status':
      return {
        issue: 'Your technician',
        text: 'Open the booking to see your technician’s name, photo and live status. If they are running late beyond your window, support can chase it straight away.',
        actions: [{ ...BOOKINGS_ACTION, primary: true }, SUPPORT_ACTION],
      }

    case 'cancel': {
      const policy = (await source.business())?.cancellationPolicy
      return {
        issue: 'Cancelling a booking',
        text: policy
          ? `You can cancel from the booking itself. It is free up to ${policy.freeUntilHours} hours before your slot; after that there is a ${formatPaise(policy.feePaise)} fee. Anything you paid comes back to the original method within ${policy.refundDays} working days.`
          : 'You can cancel from the booking itself, and the app shows any fee before you confirm.',
        actions: [{ ...BOOKINGS_ACTION, primary: true }],
      }
    }

    case 'reschedule': {
      const limit = (await source.business())?.rescheduleLimit
      return {
        issue: 'Changing your slot',
        text: limit
          ? `Open the booking and pick a new time — you can move it up to ${limit} times, at no charge.`
          : 'Open the booking and pick a new time.',
        actions: [{ ...BOOKINGS_ACTION, primary: true }],
      }
    }

    case 'warranty': {
      const days = (await source.business())?.defaultWarrantyDays ?? 30
      return {
        issue: 'Service warranty',
        text: `Every completed job carries a ${days}-day service warranty on the work and on the parts we supplied. If the same fault comes back while it is valid, the return visit costs nothing. You will find it on the booking once the job is done.`,
        actions: applianceId ? [allServicesAction(applianceId)] : undefined,
      }
    }

    case 'parts': {
      const services = await anyServices(source, applianceId)
      return {
        issue: 'Spare parts',
        text:
          faqAnswer(services, /spare parts/) ??
          'Spare parts are not part of the visit fee. Anything the job needs is quoted on site, itemised with its labour, and nothing is fitted until you approve it.',
        actions: applianceId ? [allServicesAction(applianceId)] : undefined,
      }
    }

    case 'payment': {
      const business = await source.business()
      return {
        issue: 'Paying for a visit',
        text: `Card, UPI or netbanking in the app${
          business?.allowPayAfterService
            ? ', or pay after the service where that is offered'
            : ''
        }. Every booking ends with a GST invoice you can download from the booking.`,
      }
    }

    case 'price': {
      if (!applianceId) {
        return {
          issue: 'What a visit costs',
          text: 'Visits start at ₹299 and cover the technician coming out and inspecting the appliance. Any repair beyond that is quoted on the spot, and nothing starts until you approve it. Which appliance is it for?',
          quickReplies: APPLIANCE_REPLIES,
        }
      }
      const services = await source.services(applianceId)
      const job = jobIn(text)
      const asked = job ? services.find((s) => s.serviceKey === job) : undefined
      if (asked) return serviceReply(asked, applianceId)
      return {
        issue: `${name} visit fees`,
        text: 'The visit fee covers the technician coming out and inspecting. Any repair beyond it is quoted on the spot, and nothing starts until you approve it.',
        actions: services.map((service) => ({
          label: `${service.name} · ${formatPaise(service.visitFee)}`,
          href: serviceHref(service),
        })),
      }
    }

    case 'timing': {
      const repair = applianceId
        ? (await source.services(applianceId)).find((s) => s.serviceKey === 'repair')
        : undefined
      return {
        issue: 'When we can come',
        text: 'Visits run every day, in two-hour windows from 9 AM to 7 PM, and the earliest free slot is the first one you see when booking — often the same day. Support is available at any hour.',
        actions: applianceId
          ? [...(repair ? [bookAction(repair)] : []), allServicesAction(applianceId)]
          : [{ label: 'See all services', href: '/services' }],
      }
    }

    case 'technician': {
      const services = await anyServices(source, applianceId)
      return {
        issue: 'Who comes to your home',
        text:
          faqAnswer(services, /who is coming/) ??
          'A technician from our own roster. Their name, photo and rating are on the booking before they arrive.',
      }
    }

    case 'area': {
      const areas = await source.areas()
      const pincode = /\b(\d{6})\b/.exec(text)?.[1]
      if (pincode) {
        const found = areas.find((area) => area.pincode === pincode)
        return found
          ? {
              issue: `${found.area}, ${found.city}`,
              text: `Yes — we cover ${found.area} (${pincode}). Pick a service and the earliest slot there is the first one you see.`,
              actions: [{ label: 'See all services', href: '/services', primary: true }],
            }
          : {
              issue: `Pincode ${pincode}`,
              text: `We are not in ${pincode} yet. You can join the waitlist from the location screen and we will tell you when we get there.`,
              actions: [{ label: 'Check another pincode', href: '/location' }],
            }
      }
      const names = areas.map((area) => area.area)
      return {
        issue: 'Where we work',
        text: `We cover ${names.length} areas of Hyderabad right now, including ${names.slice(0, 6).join(', ')} and more. Enter your pincode on the location screen to check yours.`,
        actions: [{ label: 'Check my pincode', href: '/location', primary: true }],
      }
    }

    case 'booking':
      return {
        issue: 'How booking works',
        text: 'Pick the appliance and the service, choose a two-hour slot, and confirm the address. A named technician is assigned, they inspect and quote before touching anything, and you pay only for what you approve.',
        actions: applianceId
          ? [allServicesAction(applianceId)]
          : [{ label: 'See all services', href: '/services', primary: true }],
      }
  }
}

function serviceReply(
  service: CatalogService,
  applianceId: ApplianceId
): AssistantReply {
  return {
    issue: service.name,
    text: `${service.description} The visit fee is ${formatPaise(service.visitFee)}${
      service.durationMinutes
        ? ` and it usually takes about ${duration(service.durationMinutes)}`
        : ''
    }.`,
    actions: [bookAction(service), allServicesAction(applianceId)],
  }
}

/**
 * Answers one message. The context it returns is the one to pass with the
 * next, so "it is making a noise" after "my fridge…" is still about the fridge.
 */
export async function answerWith(
  message: string,
  context: AssistantContext,
  source: AssistantSource
): Promise<{ reply: AssistantReply; context: AssistantContext }> {
  const text = fold(message)
  const named = applianceIn(text)
  const applianceId = named ?? context.applianceId
  const next: AssistantContext = applianceId ? { applianceId } : {}

  // Something we do not repair, and none of our appliances named alongside it.
  const other = named ? undefined : notServicedIn(text)
  if (other) {
    return {
      reply: {
        text: `Sorry, we do not repair ${other}. We specialise in ${applianceList()} — if one of those needs help, tell me what it is doing.`,
        quickReplies: APPLIANCE_REPLIES,
      },
      context: {},
    }
  }

  let topic = topicIn(text)
  // Price is asked alongside a job ("AC installation price"), so the job wins
  // when one is named.
  if (topic === 'price' && named && jobIn(text)) topic = undefined
  // The loose topics share words with fault reports — "not cooling at night",
  // "door will not open", "how much to fix a fridge that leaks". When the
  // message also describes a symptom of the appliance, the symptom is what it
  // is about.
  if (topic && WEAK_TOPICS.has(topic) && applianceId) {
    const symptoms = rankIssues(text, await source.issues(applianceId))
    if ((symptoms[0]?.score ?? 0) >= 2) topic = undefined
  }
  if (topic) {
    const reply = await topicReply(topic, text, applianceId, source)
    if (reply) return { reply, context: topic === 'greeting' ? {} : next }
  }

  if (!applianceId) {
    return {
      reply: GENERIC_FAULT.test(text)
        ? {
            text: `Which appliance is it? We repair ${applianceList()}.`,
            quickReplies: APPLIANCE_REPLIES,
          }
        : {
            text: `I can help with problems, prices and bookings for ${applianceList()}. Try describing what your appliance is doing, or ask me something like these:`,
            quickReplies: WHAT_I_CAN_DO,
          },
      context,
    }
  }

  const name = APPLIANCE_NAMES[applianceId]
  const services = await source.services(applianceId)

  const job = jobIn(text)
  if (job && job !== 'repair') {
    const service = services.find((each) => each.serviceKey === job)
    if (service) return { reply: serviceReply(service, applianceId), context: next }
    return {
      reply: {
        text: `We do not offer that for a ${name}. These are the ${name} services we do:`,
        actions: services.map((each) => ({
          label: `${each.name} · ${formatPaise(each.visitFee)}`,
          href: serviceHref(each),
        })),
      },
      context: next,
    }
  }

  const issues = await source.issues(applianceId)
  const ranked = rankIssues(text, issues)
  const best = ranked[0]
  const repair = services.find((each) => each.serviceKey === 'repair')

  // "Book an AC repair", "fix my fridge": the job is clear even though the
  // fault is not, so the booking comes first and the symptoms are offered to
  // narrow it down.
  if (!best && repair && GENERIC_FAULT.test(text)) {
    return {
      reply: {
        ...serviceReply(repair, applianceId),
        text: `${repair.description} The visit fee is ${formatPaise(repair.visitFee)}. If you tell me what it is doing, I can tell you what it usually is.`,
        quickReplies: issues.slice(0, 7).map((each) => each.label),
      },
      context: next,
    }
  }

  if (!best) {
    return {
      reply: {
        text: named
          ? `What is your ${name} doing? Pick the closest, or describe it in your own words.`
          : `I did not quite catch that. Which of these is closest to what your ${name} is doing?`,
        quickReplies: issues.slice(0, 7).map((each) => each.label),
      },
      context: next,
    }
  }

  const rule = await source.rule(best.issue.id)
  // A second symptom that scored nearly as well is worth naming, so "noise and
  // leaking" does not quietly lose half of what was said.
  const also = ranked[1] && ranked[1].score >= best.score - 1 ? ranked[1].issue : undefined

  return {
    reply: {
      issue: `${name}: ${best.issue.label}`,
      text: `This is what usually causes it${
        also ? ` (it can also point to “${also.label.toLowerCase()}”)` : ''
      }. A technician confirms the cause on the visit and quotes the repair before touching anything.`,
      causes: rule?.possibleCauses,
      tips: rule?.tips.length ? rule.tips : undefined,
      actions: [...(repair ? [bookAction(repair)] : []), allServicesAction(applianceId)],
    },
    context: next,
  }
}

/** Where the conversation starts, and what to tap if typing feels like work. */
export const OPENING: AssistantReply = {
  text: `Hi, I am the ${brand.name} assistant. Ask me about a problem with your ${applianceList()} — or about prices, timings, payment, warranty or your booking.`,
  quickReplies: [
    'My fridge is not cooling',
    'Washing machine is making a loud noise',
    'AC service price',
    'Is there a warranty?',
  ],
}
