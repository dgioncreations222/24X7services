import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { bookingSchema, COL, SUB, userApplianceInputSchema, type Booking } from '@app/shared'

import { db } from '@/lib/firebase'

/**
 * One-shot reads behind the booking flow.
 *
 * Live updates on a booking go through `useBookingLive`; these are for the
 * screens that read a document once and show what was actually written.
 */

/**
 * A booking read back by id, or null when it is missing or no longer matches
 * the schema.
 */
export async function fetchBooking(bookingId: string): Promise<Booking | null> {
  const snap = await getDoc(doc(db(), COL.bookings, bookingId))
  const parsed = bookingSchema.safeParse({ id: snap.id, ...snap.data() })
  return parsed.success ? parsed.data : null
}

/**
 * The parts of a saved appliance the details step offers to reuse: a lighter
 * shape than the full saved appliance in ./appliances.
 */
export interface ReusableAppliance {
  id: string
  type?: string
  modelNumber?: string
  nickname?: string
}

/**
 * The machines this customer has already told us about for this appliance and
 * brand. Rows that fail the schema are skipped rather than failing the step.
 */
export async function fetchSavedAppliances(
  uid: string,
  applianceId: string,
  brandId: string
): Promise<ReusableAppliance[]> {
  const snap = await getDocs(
    query(
      collection(db(), COL.users, uid, SUB.appliances),
      where('applianceId', '==', applianceId),
      where('brandId', '==', brandId)
    )
  )
  const saved: ReusableAppliance[] = []
  for (const doc of snap.docs) {
    const parsed = userApplianceInputSchema.safeParse(doc.data())
    if (!parsed.success) continue
    saved.push({
      id: doc.id,
      type: parsed.data.type,
      modelNumber: parsed.data.modelNumber,
      nickname: parsed.data.nickname,
    })
  }
  return saved
}
