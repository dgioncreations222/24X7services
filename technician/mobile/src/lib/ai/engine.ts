import { APPLIANCES, APPLIANCE_LABEL, BRANDS, BRAND_LABEL, PARTS, type Appliance, type Brand } from '../catalog'
import type { Diagnosis } from '../types'
import { ERROR_CODES, FAULTS, type FaultProfile } from './knowledge'
import type { AiAnswer, Intent } from './types'
import { readPixels } from './pixels'

/**
 * The technician assistant's answer engine.
 *
 * It runs on the device against the reference in ./knowledge, so it works with
 * no signal inside a basement and costs nothing per question. It is the one
 * seam to swap for a hosted model later: keep the `answer()` signature and the
 * AiAnswer shape, and every screen keeps working.
 *
 * Rules it keeps: causes are "possible", never confirmed; every repair answer
 * carries a safety line; parts always come with a compatibility warning; and
 * anything outside the four brands and five appliances is declined.
 */

export interface AiContext {
  brand?: Brand
  appliance?: Appliance
  issue?: string
  model?: string
  diagnosis?: Diagnosis
}

export const INTENT_LABEL: Record<Intent, string> = {
  diagnose: 'Diagnose Issue',
  error: 'Error Code',
  troubleshoot: 'Troubleshooting',
  repair: 'Repair Steps',
  parts: 'Required Parts',
  notes: 'Generate Service Notes',
  explain: 'Explain to Customer',
}

/** Thread titles for the history list. */
export const INTENT_TOPIC: Record<Intent, string> = {
  diagnose: 'Diagnosis discussion',
  error: 'Error code lookup',
  troubleshoot: 'Troubleshooting',
  repair: 'Repair procedure',
  parts: 'Parts discussion',
  notes: 'Service notes',
  explain: 'Customer explanation',
}

const OTHER_BRANDS = ['whirlpool', 'godrej', 'haier', 'voltas', 'daikin', 'panasonic', 'ifb', 'bajaj', 'racold', 'a.o. smith', 'ao smith', 'havells', 'v-guard', 'blue star', 'hitachi', 'carrier', 'sony', 'philips', 'kenstar', 'crompton', 'lloyd', 'onida', 'midea', 'electrolux', 'siemens']
const OTHER_APPLIANCES = ['dishwasher', 'chimney', 'water purifier', ' ro ', 'television', ' tv', 'ceiling fan', 'mixer', 'iron', 'laptop', 'computer', 'mobile', 'phone screen', 'inverter battery', 'cooler', 'induction']

const lower = (s?: string) => (s ?? '').toLowerCase()

export function detectIntent(text: string): Intent | undefined {
  const t = lower(text)
  if (/\b(error|code|showing|display(s|ing)?)\b/.test(t)) return 'error'
  if (/\bpart(s)?\b|spare|replace what|which part/.test(t)) return 'parts'
  if (/service note|job note|write (the )?notes|summary for the job/.test(t)) return 'notes'
  if (/explain|customer|simple words|tell the (customer|owner)/.test(t)) return 'explain'
  if (/repair step|how (do i|to) (fix|repair|replace)|procedure/.test(t)) return 'repair'
  if (/troubleshoot|check first|what should i check|steps to check|test/.test(t)) return 'troubleshoot'
  if (/why|cause|diagnos|reason|what('s| is) wrong/.test(t)) return 'diagnose'
  return undefined
}

export function detectScope(text: string): { brand?: Brand; appliance?: Appliance } {
  const t = lower(text)
  const brand = BRANDS.find((b) => t.includes(b) || t.includes(lower(BRAND_LABEL[b])))
  const words: Record<Appliance, string[]> = {
    washer: ['washing', 'washer', 'washing machine'],
    fridge: ['fridge', 'refrigerator', 'freezer'],
    oven: ['oven', 'otg'],
    ac: [' ac', 'air conditioner', 'split', 'window ac'],
    geyser: ['geyser', 'water heater', 'boiler'],
  }
  const appliance = APPLIANCES.find((a) => words[a].some((w) => ` ${t}`.includes(w)))
  return { brand, appliance }
}

/** Anything naming a brand or appliance this network does not service. */
function outOfScope(text: string): string | undefined {
  const t = ` ${lower(text)} `
  const b = OTHER_BRANDS.find((x) => t.includes(x))
  if (b) return `${b.replace(/\b\w/g, (c) => c.toUpperCase())} appliances`
  const a = OTHER_APPLIANCES.find((x) => t.includes(x))
  if (a) return a.trim()
  return undefined
}

/** The fault profile that best fits the issue and the question. */
export function matchFault(ctx: AiContext, text = ''): FaultProfile | undefined {
  if (!ctx.appliance) return undefined
  const hay = ` ${lower([ctx.diagnosis?.problem, ctx.diagnosis?.category, text, ctx.issue].join(' '))} `
  let best: { f: FaultProfile; score: number } | undefined
  for (const f of FAULTS) {
    if (f.appliance !== ctx.appliance) continue
    let score = 0
    for (const k of f.keywords) if (hay.includes(k.length <= 3 ? ` ${k} ` : k)) score += k.length <= 3 ? 1 : 2
    if (ctx.diagnosis?.category === f.category) score += 3
    if (score > (best?.score ?? 0)) best = { f, score }
  }
  return best?.f
}

function codesFor(ctx: AiContext) {
  return (ctx.brand && ctx.appliance && ERROR_CODES[ctx.brand]?.[ctx.appliance]) || undefined
}

function findCode(ctx: AiContext, text: string): string | undefined {
  const codes = codesFor(ctx)
  if (!codes) return undefined
  const t = ` ${text.toUpperCase().replace(/[^A-Z0-9 ]/g, ' ')} `
  return Object.keys(codes).find((c) => t.includes(` ${c} `) || t.replace(/\s+/g, '').includes(c.replace(/\s+/g, '')) && c.length >= 3)
}

const name = (ctx: AiContext) =>
  [ctx.brand && BRAND_LABEL[ctx.brand], ctx.appliance && APPLIANCE_LABEL[ctx.appliance]].filter(Boolean).join(' ') || 'the appliance'

const VERIFY_MODEL = 'Verify the appliance model and part compatibility before replacement.'
const NOT_CONFIRMED = 'These are possible causes based on the reported symptoms — confirm with your own checks before deciding on a repair.'

export function greeting(ctx: AiContext): AiAnswer {
  if (!ctx.appliance) {
    return {
      lead: "Hi! I'm your technical assistant for Samsung, LG, Bosch and IFB washing machines, refrigerators, ovens, ACs and geysers. Which appliance are you working on?",
      sections: [],
      suggestions: APPLIANCES.map((a) => APPLIANCE_LABEL[a]),
    }
  }
  return {
    lead: `Hi! I'm assisting with this ${name(ctx)} service. What would you like to check?`,
    sections: [],
  }
}

/** Answer a quick action or a typed question. */
export function answer(ctx: AiContext, input: { text?: string; intent?: Intent }): AiAnswer {
  const text = input.text?.trim() ?? ''
  const scope = outOfScope(text)
  if (scope) {
    return {
      lead: `I can only help with Samsung, LG, Bosch and IFB washing machines, refrigerators, ovens, ACs and geysers — ${scope} are outside what this network services.`,
      sections: [],
      caution: 'For anything outside this scope, contact the partner support desk.',
    }
  }

  if (!ctx.appliance) {
    return { lead: 'Which appliance is this about? Pick one so I can give model-appropriate guidance.', sections: [], suggestions: APPLIANCES.map((a) => APPLIANCE_LABEL[a]) }
  }

  const intent = input.intent ?? detectIntent(text) ?? (findCode(ctx, text) ? 'error' : undefined)
  const fault = matchFault(ctx, text)

  if (intent === 'error') return errorAnswer(ctx, text)
  if (!fault) return unknownFault(ctx)

  switch (intent) {
    case 'troubleshoot':
      return {
        lead: `Troubleshooting for ${name(ctx)} — ${fault.title.toLowerCase()}. Work top to bottom; stop when you find the fault.`,
        sections: [{ heading: 'Recommended checks', items: fault.checks, ordered: true }],
        safety: fault.safety,
        caution: 'Values quoted are typical — confirm against the model’s service manual.',
        suggestions: ['Repair steps', 'Required parts'],
      }
    case 'repair':
      return {
        lead: `Repair procedure once the fault is confirmed (${fault.title.toLowerCase()}).`,
        sections: [{ heading: 'Repair steps', items: fault.repair, ordered: true }],
        safety: fault.safety,
        caution: 'Only proceed after your checks confirm the cause. Quote the customer before replacing parts.',
        suggestions: ['Required parts', 'Generate service notes'],
      }
    case 'parts':
      return partsAnswer(ctx, fault)
    case 'notes':
      return notesAnswer(ctx, fault)
    case 'explain':
      return explainAnswer(ctx, fault)
    default:
      return {
        lead: `For a ${name(ctx)} with “${text && !input.intent ? text : ctx.issue ?? fault.title}”, the most likely area is ${fault.category.toLowerCase()}.`,
        sections: [
          { heading: 'Possible causes', items: fault.causes, ordered: true },
          { heading: 'What to check first', items: fault.checks.slice(0, 3), ordered: true },
        ],
        safety: fault.safety,
        caution: NOT_CONFIRMED,
        suggestions: ['Troubleshooting steps', 'Required parts', 'Explain to customer'],
      }
  }
}

function errorAnswer(ctx: AiContext, text: string): AiAnswer {
  const codes = codesFor(ctx)
  const code = findCode(ctx, text)
  if (code && codes) {
    const entry = codes[code]!
    const fault = FAULTS.find((f) => f.id === entry.fault)
    return {
      lead: `${BRAND_LABEL[ctx.brand!]} ${APPLIANCE_LABEL[ctx.appliance!].toLowerCase()} code ${code}: ${entry.meaning}.`,
      sections: fault
        ? [
            { heading: 'Common causes', items: fault.causes, ordered: true },
            { heading: 'Check first', items: fault.checks.slice(0, 3), ordered: true },
          ]
        : [],
      safety: fault?.safety,
      caution: `Code meanings vary between model series${ctx.model ? ` — confirm for ${ctx.model}` : ''} using the service manual or the model’s rating plate.`,
      suggestions: ['Troubleshooting steps', 'Required parts'],
    }
  }
  if (!codes) {
    return {
      lead: `I don’t have a verified error-code reference for ${name(ctx)}s, so I won’t guess what a code means.`,
      sections: [{ heading: 'What you can do', items: ['Note the exact code and when it appears (start, fill, heat, spin).', 'Check the code list on the model’s service manual or the sticker inside the panel.', 'Describe the symptom here and I’ll suggest checks from it.'], ordered: true }],
    }
  }
  const asked = text.toUpperCase().match(/\b([A-Z]{0,3}\s?\d{1,3}[A-Z]?|[A-Z]{2})\b/)?.[0]
  return {
    lead: asked && /\d/.test(asked) ? `Code “${asked}” isn’t in my ${name(ctx)} reference. Which code is showing?` : 'Which code is showing on the display?',
    sections: [],
    caution: asked && /\d/.test(asked) ? 'I won’t guess an unlisted code — check the service manual for that model.' : undefined,
    suggestions: Object.keys(codes),
  }
}

function partsAnswer(ctx: AiContext, fault: FaultProfile): AiAnswer {
  const catalog = ctx.appliance ? PARTS[ctx.appliance] : []
  const parts = fault.parts
    .map((p) => {
      const c = catalog.find((x) => x.sku === p.sku)
      return c ? { name: c.name, sku: c.sku, inVan: c.inVan, likely: p.likely } : undefined
    })
    .filter((p): p is NonNullable<typeof p> => !!p)
  return {
    lead: `Possible parts for ${name(ctx)} — ${fault.title.toLowerCase()}${ctx.diagnosis ? ', based on your recorded diagnosis' : ', based on the reported issue'}.`,
    sections: fault.otherParts?.length ? [{ heading: 'Other possibilities', items: fault.otherParts }] : [],
    parts,
    caution: `${VERIFY_MODEL}${ctx.model ? ` Model on file: ${ctx.model}.` : ' No model on file — read it from the rating plate.'}`,
    suggestions: ['Repair steps', 'Generate service notes'],
  }
}

function notesAnswer(ctx: AiContext, fault: FaultProfile): AiAnswer {
  const d = ctx.diagnosis
  return {
    lead: d ? 'Service notes drafted from your recorded diagnosis. Edit anything, then save it to the job.' : 'Draft notes from the reported issue — no diagnosis is recorded yet, so confirm each line before saving.',
    sections: [],
    notes: {
      diagnosis: d ? `${d.problem} (${d.category.toLowerCase()}).` : fault.notes.diagnosis,
      action: d?.repair ? d.repair.replace(/\.?$/, '.') : fault.notes.action,
      recommendation: fault.notes.recommendation,
    },
  }
}

function explainAnswer(ctx: AiContext, fault: FaultProfile): AiAnswer {
  const d = ctx.diagnosis
  return {
    lead: 'Here’s a simple way to explain it to the customer.',
    sections: [],
    customer: {
      technical: d ? `${d.problem}. ${d.repair}` : `${fault.title}: ${fault.causes[0]}.`,
      simple: fault.customer,
    },
    caution: d ? undefined : 'Drafted from the reported issue — adjust it once you confirm the actual fault.',
  }
}

function unknownFault(ctx: AiContext): AiAnswer {
  const options = FAULTS.filter((f) => f.appliance === ctx.appliance).map((f) => f.title)
  return {
    lead: `I couldn’t match that to a known ${name(ctx)} fault. Which of these is closest?`,
    sections: [],
    suggestions: options,
  }
}

/**
 * What can honestly be said about a photo without a vision model: whether it
 * is sharp and bright enough to be useful. Component identification is left
 * to the technician rather than guessed.
 */
export async function inspectImage(url: string): Promise<AiAnswer> {
  const px = await readPixels(url, 160)
  if (!px) return imageUnclear('The photo could not be read on this device.')
  const { width: w, height: h, data } = px
  const lum = new Float32Array(w * h)
  let sum = 0
  for (let i = 0; i < w * h; i++) {
    lum[i] = 0.299 * data[i * 4]! + 0.587 * data[i * 4 + 1]! + 0.114 * data[i * 4 + 2]!
    sum += lum[i]!
  }
  const mean = sum / (w * h)
  // Edge energy: how much neighbouring pixels differ. Low means blur.
  let edges = 0
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x
      edges += Math.abs(4 * lum[i]! - lum[i - 1]! - lum[i + 1]! - lum[i - w]! - lum[i + w]!)
    }
  const sharp = edges / ((w - 2) * (h - 2))
  if (mean < 35) return imageUnclear('The photo is too dark.')
  if (mean > 235) return imageUnclear('The photo is overexposed.')
  if (sharp < 6) return imageUnclear('The photo is blurred.')
  return {
    lead: `Photo received (${px.sourceWidth}×${px.sourceHeight}). It is clear enough to keep as job evidence.`,
    sections: [
      {
        heading: 'Observations',
        items: [`Brightness ${mean > 170 ? 'high' : mean > 80 ? 'good' : 'low'} · focus ${sharp > 14 ? 'sharp' : 'acceptable'}.`, 'I can’t identify components or read text from photos on this device, so I won’t guess what the part is.'],
      },
      { heading: 'Tell me what it shows', items: ['Type the error code or model number you can see.', 'Or describe the part and its condition (burnt, cracked, corroded).'] },
    ],
    caution: 'Automatic component recognition needs the connected AI vision service.',
  }
}

function imageUnclear(why: string): AiAnswer {
  return {
    lead: 'Image quality is insufficient to identify the component confidently.',
    sections: [{ heading: 'Why', items: [why] }, { heading: 'Retake tips', items: ['Use the flash or a torch on the panel.', 'Hold steady 20–30 cm away and tap to focus.', 'Fill the frame with the label or part.'] }],
  }
}
