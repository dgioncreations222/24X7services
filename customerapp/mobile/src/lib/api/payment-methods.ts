import { doc, setDoc } from 'firebase/firestore'
import { COL, DEFAULT_PAYMENT_PREFERENCE, type PaymentPreference } from '@app/shared'

import { db } from '@/lib/firebase'
import { fetchProfile } from '@/lib/api/profile'

/**
 * How a customer would rather pay — a preference on their user document, not
 * a list of saved cards. Card details go from the phone to Razorpay and never
 * touch this app.
 */

/** The stored preference, or the default when none has been stored yet. */
export async function fetchPaymentPreference(uid: string): Promise<PaymentPreference> {
  const profile = await fetchProfile(uid)
  return profile?.paymentPreference ?? DEFAULT_PAYMENT_PREFERENCE
}

/** The write, kept outside the component. */
export async function savePaymentPreference(uid: string, preference: PaymentPreference): Promise<void> {
  await setDoc(doc(db(), COL.users, uid), { paymentPreference: preference, updatedAt: Date.now() }, { merge: true })
}
