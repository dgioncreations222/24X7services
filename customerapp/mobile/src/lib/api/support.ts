import { collection, doc, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import {
  COL,
  SUB,
  supportMessageSchema,
  supportTicketSchema,
  type SupportMessage,
  type SupportTicket,
} from '@app/shared'

import { parseRows, readAll } from '@/lib/catalog/read'
import { db } from '@/lib/firebase'

/**
 * A customer's conversations with us.
 *
 * Read-only from here. Every message is written by the server, including the
 * customer's own — the rules refuse client writes to the thread entirely — so
 * sending goes through the `sendSupportMessage` callable, not this module.
 */

/**
 * The customer's tickets, most recently answered first, capped at a hundred.
 * Ordered by last message rather than by when it was opened, because a thread
 * somebody replied to an hour ago is the one being looked for.
 */
export async function fetchTickets(uid: string): Promise<SupportTicket[]> {
  return readAll(
    query(
      collection(db(), COL.supportTickets),
      where('uid', '==', uid),
      orderBy('lastMessageAt', 'desc'),
      limit(100)
    ),
    supportTicketSchema
  )
}

/**
 * Watches one ticket. `onTicket` gets null when the document is missing or
 * does not parse. Returns the unsubscribe.
 */
export function subscribeTicket(
  ticketId: string,
  onTicket: (ticket: SupportTicket | null) => void,
  onError: () => void
): () => void {
  return onSnapshot(
    doc(db(), COL.supportTickets, ticketId),
    (snap) => {
      const parsed = supportTicketSchema.safeParse({
        id: snap.id,
        ...snap.data(),
      })
      onTicket(!snap.exists() || !parsed.success ? null : parsed.data)
    },
    () => onError()
  )
}

/**
 * Watches a ticket's thread, oldest first. A message that does not parse is
 * left out. Returns the unsubscribe.
 */
export function subscribeTicketMessages(
  ticketId: string,
  onMessages: (messages: SupportMessage[]) => void,
  onError: () => void
): () => void {
  return onSnapshot(
    query(collection(db(), COL.supportTickets, ticketId, SUB.messages), orderBy('at', 'asc')),
    (snap) => {
      onMessages(parseRows(snap.docs, supportMessageSchema))
    },
    () => onError()
  )
}
