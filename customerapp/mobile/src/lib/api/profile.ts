import { doc, getDoc } from 'firebase/firestore'
import { COL, userProfileSchema, type UserProfile } from '@app/shared'

import { auth, db } from '@/lib/firebase'

/**
 * The customer's own user document, as the screens read it.
 *
 * Writes to it live elsewhere on purpose: the name in `saveName` (lib/auth),
 * and each preference beside the screen that owns it, so every field a client
 * may touch has exactly one function that touches it.
 */

/**
 * The profile, parsed, or null when the document is missing or does not
 * parse. A failed read still throws, so the screen can draw its error state.
 */
export async function fetchProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db(), COL.users, uid))
  const parsed = userProfileSchema.safeParse(snap.data())
  return parsed.success ? parsed.data : null
}

/**
 * Whether this customer has told us their name before.
 *
 * The auth trigger writes the user document a moment after sign-in, so this
 * can legitimately find nothing at all. Both "no document" and "no name" mean
 * the same thing here, and a read that fails means the same again — asking a
 * returning customer for their name once more is a smaller cost than skipping
 * the question for someone who has never answered it.
 */
export async function currentUserHasName(): Promise<boolean> {
  const uid = auth().currentUser?.uid
  if (!uid) return false
  try {
    const snap = await getDoc(doc(db(), COL.users, uid))
    const name = snap.data()?.name
    return typeof name === 'string' && name.trim().length > 0
  } catch {
    return false
  }
}
