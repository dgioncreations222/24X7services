/**
 * The starting catalog for the mock: the five appliance lines as categories,
 * their services with prices from the old console's seed, a few booking
 * questions each, a rate card and the Hyderabad service areas. Member 1's
 * catalog-v2 seed replaces this.
 */
import { AREAS } from '../seed'
import type { Category, Question, RateCardItem, Service, ServiceArea } from '../data/types'

const paise = (rupees: number) => Math.round(rupees * 100)
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

const CATEGORIES: [id: string, name: string, description: string][] = [
  ['ac', 'AC', 'Split and window AC repair, gas refill, deep cleaning, installation and uninstallation.'],
  ['washer', 'Washing Machine', 'Front-load, top-load and semi-automatic repair, drum service and installation.'],
  ['fridge', 'Refrigerator', 'Cooling faults, gas refill, compressor and defrost repair for single and double door.'],
  ['oven', 'Microwave & Oven', 'Microwave, OTG and built-in oven repair — heating, fan, thermostat and PCB.'],
  ['geyser', 'Geyser', 'Storage and instant geyser repair, element and thermostat replacement, installation.'],
]

/** name, price in rupees, minutes */
const SERVICES: Record<string, [string, number, number][]> = {
  ac: [['Repair', 699, 60], ['General service', 699, 45], ['Gas refill', 2899, 90], ['Deep cleaning', 799, 75], ['Installation', 1499, 120], ['Uninstallation', 560, 45]],
  washer: [['Repair', 549, 60], ['General service', 549, 45], ['Deep cleaning', 699, 60], ['Installation', 440, 40], ['Uninstallation', 440, 30]],
  fridge: [['Repair', 649, 60], ['General service', 649, 45], ['Gas refill', 2849, 90], ['Installation', 520, 40]],
  oven: [['Repair', 499, 60], ['General service', 499, 40], ['Installation', 400, 40]],
  geyser: [['Repair', 449, 45], ['General service', 449, 40], ['Installation', 360, 45], ['Uninstallation', 360, 30]],
}

const INCLUDED: Record<string, string[]> = {
  Repair: ['Inspection and diagnosis', 'Labour for the repair', '30-day warranty on the work'],
  'General service': ['Filter and coil cleaning', 'Performance check', 'Report on anything worn'],
  'Gas refill': ['Leak check before refilling', 'Refrigerant top-up', 'Cooling test after'],
  'Deep cleaning': ['Full dismantle and wash', 'Anti-bacterial treatment', 'Reassembly and test'],
  Installation: ['Mounting and connections', 'Demo of the controls', 'Clean-up after'],
  Uninstallation: ['Safe disconnection', 'Packing guidance'],
}

const EXCLUDED: Record<string, string[]> = {
  Repair: ['Spare parts — added from the rate card with your approval'],
  'Gas refill': ['Compressor or coil replacement'],
  Installation: ['Stand, pipes or extra wiring beyond 3 m'],
}

/** label, kind, options, required */
const BRAND_Q: Omit<Question, 'id' | 'serviceId' | 'order'> = {
  label: 'Which brand is it?',
  kind: 'options',
  options: ['Samsung', 'LG', 'Bosch', 'IFB', 'Other'],
  multiple: false,
  required: true,
}

const EXTRA_Q: Record<string, Omit<Question, 'id' | 'serviceId' | 'order'>[]> = {
  ac: [{ label: 'What type of AC?', kind: 'options', options: ['Split', 'Window'], multiple: false, required: true }, { label: 'Capacity', kind: 'number', options: [], multiple: false, unit: 'ton', required: false }],
  washer: [{ label: 'How does it load?', kind: 'options', options: ['Front load', 'Top load', 'Semi-automatic'], multiple: false, required: true }],
  fridge: [{ label: 'How many doors?', kind: 'options', options: ['Single door', 'Double door', 'Side by side'], multiple: false, required: true }],
  oven: [{ label: 'What kind?', kind: 'options', options: ['Microwave', 'OTG', 'Built-in'], multiple: false, required: true }],
  geyser: [{ label: 'Tank size', kind: 'number', options: [], multiple: false, unit: 'litres', required: false }],
}

const PROBLEM_Q: Omit<Question, 'id' | 'serviceId' | 'order'> = {
  label: 'What’s wrong?',
  kind: 'text',
  options: [],
  multiple: false,
  help: 'A line or two — the technician reads this before coming.',
  required: true,
}

const PHOTO_Q: Omit<Question, 'id' | 'serviceId' | 'order'> = {
  label: 'A photo of the model sticker',
  kind: 'photo',
  options: [],
  multiple: false,
  help: 'Helps the technician bring the right part.',
  required: false,
}

const RATE_CARD: Record<string, [string, number][]> = {
  ac: [['Gas top-up (per 100 g)', 900], ['Fan capacitor', 550], ['PCB repair', 1800], ['Copper pipe (per metre)', 650]],
  washer: [['Drain pump', 1450], ['Drive belt', 480], ['Inlet valve', 750], ['Door lock', 1100]],
  fridge: [['Refrigerant recharge', 1800], ['Compressor relay', 650], ['Thermostat', 850], ['Door gasket', 1200]],
  oven: [['Grill element', 1300], ['Magnetron', 2400], ['Turntable motor', 600]],
  geyser: [['Heating element', 1150], ['Thermostat', 700], ['Safety valve', 450]],
}

export function seedCatalog(now = Date.now()) {
  const categories: Category[] = CATEGORIES.map(([id, name, description], order) => ({
    id,
    name,
    description,
    image: `/media/svc-${id}.jpg`,
    order,
    active: true,
  }))

  const services: Service[] = CATEGORIES.flatMap(([cat, catName]) =>
    (SERVICES[cat] ?? []).map(([name, rupees, minutes], order) => ({
      id: `${cat}-${slug(name)}`,
      categoryId: cat,
      name: `${catName} ${name.toLowerCase()}`,
      description: `${name} for your ${catName} by a verified technician.`,
      price: paise(rupees),
      durationMinutes: minutes,
      included: INCLUDED[name] ?? [],
      excluded: EXCLUDED[name] ?? [],
      images: [`/media/svc-${cat}.jpg`],
      faqs: name === 'Repair' ? [{ q: 'Are parts included?', a: 'No. Parts come from the rate card at fixed prices, and you approve each one in the app first.' }] : [],
      order,
      // One hidden service, so the Hidden filter has something to show.
      active: !(cat === 'washer' && name === 'Uninstallation'),
    }))
  )

  const questions: Question[] = services.flatMap((s) => {
    const list = [BRAND_Q, ...(EXTRA_Q[s.categoryId] ?? []), PROBLEM_Q, ...(s.id.endsWith('-repair') ? [PHOTO_Q] : [])]
    return list.map((q, order) => ({ ...q, id: `${s.id}-q${order + 1}`, serviceId: s.id, order }))
  })

  const rateCard: RateCardItem[] = CATEGORIES.flatMap(([cat]) =>
    (RATE_CARD[cat] ?? []).map(([name, rupees], order) => ({
      id: `rc-${cat}-${slug(name)}`,
      categoryId: cat,
      name,
      price: paise(rupees),
      active: true,
      order,
      updatedAt: now - (order + 1) * 86_400_000,
    }))
  )

  const areas: ServiceArea[] = AREAS.map((a, i) => ({ pincode: a.pincode, city: 'Hyderabad', area: a.area, active: i !== 11 }))

  return { categories, services, questions, rateCard, areas }
}
