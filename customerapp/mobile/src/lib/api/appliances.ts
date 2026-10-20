import { collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, where } from 'firebase/firestore'
import { bookingSchema, COL, SUB, userApplianceInputSchema, type Booking, type UserApplianceInput } from '@app/shared'

import { readAll } from '@/lib/catalog/read'
import { db } from '@/lib/firebase'

/**
 * The appliances a customer has saved to their account, and the bookings made
 * on each. Behind the My appliances screens.
 */

/** A saved appliance, with its document id and when it was last serviced. */
export interface SavedAppliance extends UserApplianceInput {
  id: string
  lastServicedAt?: number
}

/** Every saved appliance on the account; documents that no longer parse are left out. */
export async function fetchMyAppliances(uid: string): Promise<SavedAppliance[]> {
  const snap = await getDocs(collection(db(), COL.users, uid, SUB.appliances))
  const saved: SavedAppliance[] = []
  for (const document of snap.docs) {
    const parsed = userApplianceInputSchema.safeParse(document.data())
    if (!parsed.success) continue
    const lastServicedAt = document.data().lastServicedAt
    saved.push({
      id: document.id,
      ...parsed.data,
      ...(typeof lastServicedAt === 'number' ? { lastServicedAt } : {}),
    })
  }
  return saved
}

/** Removes one saved appliance. */
export async function deleteMyAppliance(uid: string, applianceDocId: string): Promise<void> {
  await deleteDoc(doc(db(), COL.users, uid, SUB.appliances, applianceDocId))
}

/** One saved appliance, or null when it is missing or no longer matches the schema. */
export async function fetchMyAppliance(
  uid: string,
  applianceDocId: string
): Promise<{ appliance: UserApplianceInput; lastServicedAt: number | undefined } | null> {
  const snap = await getDoc(doc(db(), COL.users, uid, SUB.appliances, applianceDocId))
  const parsed = userApplianceInputSchema.safeParse(snap.data())
  if (!snap.exists() || !parsed.success) return null
  const lastServicedAt = snap.data()?.lastServicedAt
  return {
    appliance: parsed.data as UserApplianceInput,
    lastServicedAt: typeof lastServicedAt === 'number' ? lastServicedAt : undefined,
  }
}

/** The last 20 bookings made on one saved appliance, newest first. */
export async function fetchApplianceBookings(uid: string, applianceDocId: string): Promise<Booking[]> {
  return readAll(
    query(
      collection(db(), COL.bookings),
      where('uid', '==', uid),
      where('userApplianceId', '==', applianceDocId),
      orderBy('createdAt', 'desc'),
      limit(20)
    ),
    bookingSchema
  )
}
