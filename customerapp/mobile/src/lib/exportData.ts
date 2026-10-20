
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore'
import { Platform } from 'react-native'
import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { COL, SUB } from '@app/shared'
import { db } from './firebase'

/**
 * Everything this app holds about one customer, in one file they can keep.
 *
 * It is assembled on the customer's own device out of reads they are already
 * allowed to make — the rules grant an owner their profile, addresses, saved
 * appliances, bookings, invoices, warranties, reviews, notifications, wallet
 * ledger, plans, membership, gift cards and referral record, and grant nobody
 * anything else. So there is no export job, no email with a link in it, and
 * nothing sitting in a bucket waiting to be found: the customer presses a
 * button and the file is in their downloads.
 *
 * What is deliberately not in it: anything about anyone else. A booking's
 * technician appears as the name and rating the customer was shown, which is
 * what they already saw, and never as a phone number or an employee record.
 *
 * It is a plain JSON file rather than a PDF because this is a copy of records,
 * not a report — a customer moving to another service, or checking what we
 * have, wants the fields.
 */

/** One owner-readable collection, fetched and flattened. */
async function rows(
  path: string,
  uid: string,
  order?: string
): Promise<Record<string, unknown>[]> {
  try {
    const base = collection(db(), path)
    const snap = await getDocs(
      order
        ? query(base, where('uid', '==', uid), orderBy(order, 'desc'), limit(100))
        : query(base, where('uid', '==', uid), limit(100))
    )
    return snap.docs.map((document) => ({ id: document.id, ...document.data() }))
  } catch {
    // One collection that will not read must not cost the customer the rest of
    // the file. The key is present and empty, which is visible.
    return []
  }
}

async function subRows(
  uid: string,
  sub: string
): Promise<Record<string, unknown>[]> {
  try {
    const snap = await getDocs(collection(db(), COL.users, uid, sub))
    return snap.docs.map((document) => ({ id: document.id, ...document.data() }))
  } catch {
    return []
  }
}

async function one(path: string, id: string): Promise<unknown> {
  try {
    const snap = await getDoc(doc(db(), path, id))
    return snap.exists() ? snap.data() : null
  } catch {
    return null
  }
}

export interface ExportedData {
  exportedAt: string
  account: unknown
  addresses: unknown[]
  appliances: unknown[]
  bookings: unknown[]
  invoices: unknown[]
  warranties: unknown[]
  reviews: unknown[]
  notifications: unknown[]
  wallet: { balance: unknown; entries: unknown[] }
  plans: unknown[]
  membership: unknown
  giftCards: unknown[]
  referral: unknown
}

export async function collectMyData(uid: string): Promise<ExportedData> {
  const [
    account,
    addresses,
    appliances,
    bookings,
    invoices,
    warranties,
    reviews,
    notifications,
    balance,
    ledger,
    plans,
    membership,
    giftCards,
    referral,
  ] = await Promise.all([
    one(COL.users, uid),
    subRows(uid, SUB.addresses),
    subRows(uid, SUB.appliances),
    rows(COL.bookings, uid, 'createdAt'),
    rows(COL.invoices, uid, 'issuedAt'),
    rows(COL.warranties, uid, 'expiresAt'),
    rows(COL.reviews, uid, 'createdAt'),
    (async () => {
      try {
        const snap = await getDocs(
          query(
            collection(db(), COL.notifications, uid, SUB.items),
            orderBy('createdAt', 'desc'),
            limit(100)
          )
        )
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      } catch {
        return []
      }
    })(),
    one(COL.wallets, uid),
    (async () => {
      try {
        const snap = await getDocs(
          query(
            collection(db(), COL.wallets, uid, SUB.ledger),
            orderBy('createdAt', 'desc'),
            limit(100)
          )
        )
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      } catch {
        return []
      }
    })(),
    rows(COL.userPlans, uid, 'expiresAt'),
    one(COL.memberships, uid),
    (async () => {
      try {
        const snap = await getDocs(
          query(
            collection(db(), COL.giftCards),
            where('purchasedBy', '==', uid),
            limit(100)
          )
        )
        return snap.docs.map((d) => d.data())
      } catch {
        return []
      }
    })(),
    one(COL.referrals, uid),
  ])

  return {
    exportedAt: new Date().toISOString(),
    account,
    addresses,
    appliances,
    bookings,
    invoices,
    warranties,
    reviews,
    notifications,
    wallet: { balance, entries: ledger },
    plans,
    membership,
    giftCards,
    referral,
  }
}

/**
 * Hand the file over.
 *
 * On a phone there is no downloads folder to drop a file into, so the file is
 * written to the app's cache under the name the customer will recognise a
 * month later, and the system share sheet takes it from there — Save to Files,
 * Drive, mail it to themselves. The web build keeps the browser download.
 *
 * The signature stays fire-and-forget like the web's: a customer closing the
 * share sheet is not an error, and a failed write has nothing useful to say.
 */
export function downloadJson(data: unknown, filename: string): void {
  const text = JSON.stringify(data, null, 2)

  if (Platform.OS === 'web') {
    const blob = new Blob([text], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 0)
    return
  }

  void (async () => {
    try {
      const file = new File(Paths.cache, filename)
      file.create({ overwrite: true })
      file.write(text)
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/json',
          UTI: 'public.json',
          dialogTitle: filename,
        })
      }
    } catch {
      // Nothing to recover: the sheet was closed or the cache would not take it.
    }
  })()
}
