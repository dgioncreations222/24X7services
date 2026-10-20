import { collection, doc, getDoc, limit, orderBy, query, where } from 'firebase/firestore'
import { getDownloadURL, ref } from 'firebase/storage'
import { COL, invoiceSchema, type Invoice } from '@app/shared'

import { readAll } from '@/lib/catalog/read'
import { db, storage } from '@/lib/firebase'

/** An invoice by id, or null when it is missing or does not parse. */
export async function fetchInvoice(invoiceId: string): Promise<Invoice | null> {
  const snap = await getDoc(doc(db(), COL.invoices, invoiceId))
  const parsed = invoiceSchema.safeParse({ id: snap.id, ...snap.data() })
  return parsed.success ? parsed.data : null
}

/**
 * The last hundred invoices issued to this customer, newest first. Rows that
 * fail the schema are dropped and the rest are kept.
 */
export async function fetchMyInvoices(uid: string): Promise<Invoice[]> {
  return readAll(
    query(
      collection(db(), COL.invoices),
      where('uid', '==', uid),
      orderBy('issuedAt', 'desc'),
      limit(100)
    ),
    invoiceSchema
  )
}

/**
 * A short-lived download URL for an invoice PDF in Storage. Fetched on demand
 * rather than stored on the invoice, because a token written into a document
 * outlives what it was for.
 */
export function invoicePdfUrl(path: string): Promise<string> {
  return getDownloadURL(ref(storage(), path))
}
