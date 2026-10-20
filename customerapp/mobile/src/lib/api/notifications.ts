import { collection, doc, limit, orderBy, query, setDoc, updateDoc } from 'firebase/firestore'
import {
  COL,
  DEFAULT_NOTIFICATION_PREFS,
  notificationSchema,
  SUB,
  type AppNotification,
  type NotificationPrefs,
} from '@app/shared'

import { readAll } from '@/lib/catalog/read'
import { db } from '@/lib/firebase'
import { fetchProfile } from '@/lib/api/profile'

/**
 * What we have sent a customer, and what they have said we may send.
 *
 * Marking one as read is the only thing a client may write to the inbox, and
 * the rules say so field by field — `readAt` and nothing else. A notification
 * is a record of what we told someone and when; a client that could edit the
 * text could rewrite that.
 */

/** The latest hundred, newest first. One that does not parse is left out. */
export async function fetchNotifications(uid: string): Promise<AppNotification[]> {
  return readAll(
    query(
      collection(db(), COL.notifications, uid, SUB.items),
      orderBy('at', 'desc'),
      limit(100)
    ),
    notificationSchema
  )
}

/** Stamps one notification as read, now. */
export async function markNotificationRead(uid: string, id: string): Promise<void> {
  await updateDoc(doc(db(), COL.notifications, uid, SUB.items, id), { readAt: Date.now() })
}

/** The stored preferences, or the defaults when none have been stored yet. */
export async function fetchNotificationPrefs(uid: string): Promise<NotificationPrefs> {
  const profile = await fetchProfile(uid)
  return profile?.notifications ?? DEFAULT_NOTIFICATION_PREFS
}

/**
 * The write, kept outside the component — `Date.now` in a render is a bug
 * waiting for a re-render, even when it only ever runs from a tap.
 */
export async function saveNotificationPrefs(uid: string, prefs: NotificationPrefs): Promise<void> {
  await setDoc(doc(db(), COL.users, uid), { notifications: prefs, updatedAt: Date.now() }, { merge: true })
}
