/** Help: the FAQ and tickets raised with the partner desk. */
import { mockRequest } from '../mock/api'
import { write } from '../mock/db'
import { useResource, type Query } from './query'
import type { Faq, SupportTicket, TicketTopic } from './types'

/** TODO(admin): the admin's Support → FAQ page will own these. */
const FAQ: Faq[] = [
  {
    id: 'pay',
    question: 'How is my earning worked out?',
    answer: 'You keep 80% of each bill, extras included. The other 20% is the platform commission. Earnings shows the cut for every job.',
  },
  {
    id: 'payout',
    question: 'When do I get paid?',
    answer: 'Once a week. Every job the customer has paid for goes into that week’s payout, sent to your bank account after approval.',
  },
  {
    id: 'extra',
    question: 'The job needs a part or extra work',
    answer: 'Open the job and tap Add part. Pick it from the rate card, or use Other for anything not listed. The customer approves it in their app before it joins the bill.',
  },
  {
    id: 'away',
    question: 'The customer is not at home',
    answer: 'Call them from the job screen. If there is no answer after 10 minutes, raise a ticket with “Customer not reachable” and the desk will reschedule.',
  },
  {
    id: 'reject',
    question: 'Can I give back a job I accepted?',
    answer: 'Raise a ticket about that job so dispatch can hand it to someone else. Rejecting a new request is always fine.',
  },
  {
    id: 'safety',
    question: 'Gas leak, shock risk or any danger on site',
    answer: 'Stop work, switch off power or gas, move people away, and raise a “Safety concern” ticket. Do not continue until the desk clears it.',
  },
]

export function useFaqs(): Query<Faq[]> {
  return useResource(() => FAQ)
}

/** Newest first. */
export function useTickets(): Query<SupportTicket[]> {
  return useResource((db) => [...db.tickets].sort((a, b) => b.createdAt - a.createdAt))
}

export class TicketError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TicketError'
  }
}

/** Raise a ticket; resolves with it so the screen can show its number. */
export function raiseTicket(input: { topic: TicketTopic; jobId?: string; details: string }) {
  return mockRequest(() => {
    const details = input.details.trim()
    if (details.length < 10) throw new TicketError('Tell us a little more — at least 10 characters.')
    const ticket: SupportTicket = {
      id: `SUP-${String(Date.now()).slice(-5)}`,
      topic: input.topic,
      jobId: input.jobId,
      details,
      status: 'open',
      createdAt: Date.now(),
    }
    write((db) => ({ ...db, tickets: [ticket, ...db.tickets] }))
    return ticket
  })
}
