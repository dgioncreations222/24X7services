import { APPLIANCE_LABEL, BRAND_LABEL } from '../catalog'
import { dayLabel, time } from '../format'
import { STATUS } from '../status'
import type { Job } from '../types'
import type { CallLine, CallPurpose, CallRecord, CallResult, CallScenario } from './types'

/**
 * The AI call agent's conversation plans.
 *
 * There is no telephony line in this build, so a call is played out from a
 * plan and the customer's side is simulated from the chosen scenario. The
 * rules are the ones a real line must keep: the agent says it is automated in
 * its first sentence, never gives an ETA the system does not have, never
 * confirms a new slot, price or refund, and hands anything sensitive to a
 * person.
 */

export const PURPOSE_LABEL: Record<CallPurpose, string> = {
  confirm: 'Appointment confirmation',
  eta: 'Technician ETA update',
  details: 'Location & availability check',
  reschedule: 'Rescheduling request',
  status: 'Service status update',
  followup: 'Service follow-up',
}

export const PURPOSE_HINT: Record<CallPurpose, string> = {
  confirm: 'Confirms appliance, issue, time and address',
  eta: 'Shares the live arrival estimate',
  details: 'Checks the address and that someone is home',
  reschedule: 'Collects a preferred new date and time',
  status: 'Tells the customer where the job stands',
  followup: 'Checks the repair is holding after the visit',
}

export const SCENARIO_LABEL: Record<CallScenario, string> = {
  cooperative: 'Customer confirms',
  reschedule: 'Customer asks to reschedule',
  escalate: 'Customer raises a complaint',
  unresolved: 'Issue came back',
}

/** Which purposes make sense for a job right now, and why the rest don't. */
export function purposeAvailability(job: Job): Record<CallPurpose, string | null> {
  const open = !['closed', 'cancelled', 'rejected', 'request'].includes(job.status)
  const beforeArrival = ['assigned', 'accepted', 'on_the_way'].includes(job.status)
  const done = job.status === 'closed' || job.status === 'confirmation'
  return {
    confirm: beforeArrival ? null : 'Only before the technician arrives',
    eta: job.status === 'on_the_way' ? null : 'No live ETA — start the drive (On The Way) first',
    details: beforeArrival ? null : 'Only before the technician arrives',
    reschedule: beforeArrival ? null : 'Only before the visit',
    status: open ? null : 'Only while the job is open',
    followup: done ? null : 'After the job is completed',
  }
}

export function scenariosFor(purpose: CallPurpose): CallScenario[] {
  return purpose === 'followup' ? ['cooperative', 'unresolved', 'escalate'] : ['cooperative', 'reschedule', 'escalate']
}

export interface CallPlan {
  lines: CallLine[]
  result: CallResult
  summary: CallRecord['summary']
}

function tomorrow(): string {
  const d = new Date(Date.now() + 86_400_000)
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })
}

export function planCall(job: Job, purpose: CallPurpose, scenario: CallScenario, etaMin?: number): CallPlan {
  const first = job.customer.name.split(' ')[0]
  const applianceLower = `${BRAND_LABEL[job.brand]} ${APPLIANCE_LABEL[job.appliance].toLowerCase()}`
  const slot = `${dayLabel(job.scheduledAt).toLowerCase()} at around ${time(job.scheduledAt)}`
  const issue = job.issue.replace(/\.$/, '').toLowerCase()
  const ai = (text: string): CallLine => ({ speaker: 'ai', text })
  const cu = (text: string): CallLine => ({ speaker: 'customer', text })

  const intro = ai(`Hello, this is the automated service assistant from Customer Service, calling about your ${applianceLower} service. Am I speaking with ${job.customer.name}?`)
  const lines: CallLine[] = [intro, cu(`Yes, this is ${first}.`)]

  const escalate = (reason: string, customerLine: string): CallPlan => {
    lines.push(
      cu(customerLine),
      ai(`I understand, and I’m sorry about that. As an automated assistant I can’t resolve ${reason}, so I’m flagging this for a person on our support team. Someone will call you back shortly.`),
      cu('Okay, please make sure someone calls.'),
      ai('I’ve marked it as urgent. Thank you for your patience, and goodbye.')
    )
    return {
      lines,
      result: 'escalated',
      summary: { result: 'Human assistance required — customer raised a concern the assistant cannot resolve.', escalation: reason[0]!.toUpperCase() + reason.slice(1), followUp: true },
    }
  }

  const reschedule = (lead: string): CallPlan => {
    const date = tomorrow()
    lines.push(
      cu(lead),
      ai('No problem. Which date would suit you instead?'),
      cu('Tomorrow would be better.'),
      ai('And what time of day?'),
      cu('Between 11 and 1, if possible.'),
      ai('May I note a reason for the change?'),
      cu('I have to be at work today.'),
      ai(`Thank you. I’ve recorded a request for ${date}, between 11 AM and 1 PM. I can’t confirm the new slot myself — the team will check availability and confirm it with you by message.`),
      cu('That’s fine, thanks.'),
      ai('Thank you for letting us know. Goodbye.')
    )
    return {
      lines,
      result: 'reschedule_requested',
      summary: { result: 'Rescheduling requested — new slot not yet confirmed.', reschedule: { date, time: '11:00 AM – 1:00 PM', reason: 'Customer unavailable today (work)' }, followUp: true },
    }
  }

  switch (purpose) {
    case 'confirm': {
      lines.push(ai(`Thank you. Can I confirm the service is for your ${applianceLower}, reported as “${issue}”?`), cu('Yes, that’s right.'))
      lines.push(ai(`Your technician is scheduled to arrive ${slot}. Is that still convenient for you?`))
      if (scenario === 'reschedule') return reschedule('Actually, today won’t work for me.')
      if (scenario === 'escalate') return escalate('a complaint about a previous visit', 'Before that — the last technician charged me for a part that never worked. I want that sorted.')
      lines.push(
        cu('Yes, that works.'),
        ai(`And the address is ${job.customer.address}${job.customer.landmark ? `, near ${job.customer.landmark}` : ''}. Is that correct, and will someone be home?`),
        cu('Yes. Please call before you arrive, the gate stays locked.'),
        ai('Noted — the technician will call before arriving. Thank you, and have a good day.')
      )
      return { lines, result: 'confirmed', summary: { result: 'Customer confirmed the appointment, appliance, issue and address.', request: 'Call before arrival — gate stays locked.', followUp: false } }
    }
    case 'eta': {
      const eta = etaMin ? `${etaMin} minute${etaMin === 1 ? '' : 's'}` : undefined
      if (!eta) {
        lines.push(ai('Your technician hasn’t started the drive yet, so I don’t have an arrival time to share. You’ll get a message as soon as they are on the way.'), cu('Okay, thanks.'), ai('Thank you. Goodbye.'))
        return { lines, result: 'informed', summary: { result: 'No live ETA available — customer told they will be notified.', followUp: false } }
      }
      lines.push(ai(`Your technician is on the way and is expected to arrive in approximately ${eta}. Will you be available?`))
      if (scenario === 'reschedule') return reschedule('Oh — I had to step out. Can we do another day?')
      if (scenario === 'escalate') return escalate('a safety concern at the appliance', 'There’s a burning smell coming from it right now.')
      lines.push(cu('Yes, I’m home.'), ai('Great. Is there anything the technician should know before arriving?'), cu('Please call when you reach the lane.'), ai('I’ll pass that on. Thank you, goodbye.'))
      return { lines, result: 'confirmed', summary: { result: 'Customer is home and expecting the technician.', eta, request: 'Call on reaching the lane.', followUp: false } }
    }
    case 'details': {
      lines.push(ai(`I’m checking the visit details. Is the address still ${job.customer.address}?`))
      if (scenario === 'reschedule') return reschedule('The address is right, but I won’t be home today.')
      if (scenario === 'escalate') return escalate('a pricing dispute', 'Yes, but I was quoted a different price on the phone. I’m not paying more than that.')
      lines.push(cu('Yes, same address.'), ai(`And will someone be home ${slot}?`), cu('Yes, my mother will be there.'), ai('Thank you. I’ve noted that. Goodbye.'))
      return { lines, result: 'confirmed', summary: { result: 'Address confirmed; someone will be home.', request: 'Customer’s mother will receive the technician.', followUp: false } }
    }
    case 'reschedule': {
      lines.push(ai('I’m calling because a change to your appointment time was requested.'))
      if (scenario === 'escalate') return escalate('a cancellation that needs approval', 'I want to cancel the whole service and get my booking fee back.')
      return reschedule('Yes, I can’t make the current time.')
    }
    case 'status': {
      const stage = STATUS[job.status].label.toLowerCase()
      lines.push(ai(`I’m updating you on your service. The job is currently at the “${stage}” stage.`))
      if (scenario === 'escalate') return escalate('a question about the repair cost', 'Why is it taking so long? And how much is this going to cost?')
      if (scenario === 'reschedule') return reschedule('Can the rest be done another day?')
      lines.push(cu('Okay, thanks for the update.'), ai('You’ll get a message when the work is complete. Goodbye.'))
      return { lines, result: 'informed', summary: { result: `Customer informed the job is at “${stage}”.`, followUp: false } }
    }
    case 'followup': {
      lines.push(ai(`I’m following up on the recent service of your ${applianceLower}. Was the service completed successfully?`))
      if (scenario === 'escalate') return escalate('a refund request', 'It was completed, but I want a refund — I was overcharged.')
      if (scenario === 'unresolved') {
        lines.push(
          cu('It was, but the same problem started again yesterday.'),
          ai('I’m sorry to hear that. Is the appliance working at all right now?'),
          cu('Partly. It still isn’t working properly.'),
          ai('Thank you. I’ve recorded that the issue is not resolved and requested a follow-up visit. The team will contact you to arrange it.'),
          cu('Please do.'),
          ai('Thank you for telling us. Goodbye.')
        )
        return { lines, result: 'follow_up', summary: { result: 'Issue reported as recurring after service.', satisfaction: 'Not satisfied', resolved: false, followUp: true, request: 'Follow-up visit needed.' } }
      }
      lines.push(
        cu('Yes, it was.'),
        ai('Is the appliance working as expected?'),
        cu('Yes, working fine now.'),
        ai('Do you have any concerns regarding the service?'),
        cu('No, the technician was very good.'),
        ai('Thank you for your feedback. Goodbye.')
      )
      return { lines, result: 'resolved', summary: { result: 'Customer confirmed the repair is working.', satisfaction: 'Satisfied', resolved: true, followUp: false } }
    }
  }
}

export const RESULT_LABEL: Record<CallResult, string> = {
  confirmed: 'Confirmed',
  reschedule_requested: 'Rescheduling requested',
  escalated: 'Human assistance required',
  informed: 'Customer informed',
  resolved: 'Resolved',
  follow_up: 'Follow-up required',
}
