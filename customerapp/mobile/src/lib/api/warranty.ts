import { collection, doc, getDoc, limit, orderBy, query, where } from 'firebase/firestore'
import { COL, warrantySchema, type Warranty } from '@app/shared'

import { readAll } from '@/lib/catalog/read'
import { db } from '@/lib/firebase'

/** A warranty by id, or null when it is missing or does not parse. */
export async function fetchWarranty(warrantyId: string): Promise<Warranty | null> {
  const snap = await getDoc(doc(db(), COL.warranties, warrantyId))
  const parsed = warrantySchema.safeParse({ id: snap.id, ...snap.data() })
  return parsed.success ? parsed.data : null
}

/**
 * Up to a hundred of this customer's warranties, soonest to expire first.
 * Rows that fail the schema are dropped and the rest are kept.
 */
export async function fetchMyWarranties(uid: string): Promise<Warranty[]> {
  return readAll(
    query(
      collection(db(), COL.warranties),
      where('uid', '==', uid),
      orderBy('expiresAt', 'asc'),
      limit(100)
    ),
    warrantySchema
  )
}
