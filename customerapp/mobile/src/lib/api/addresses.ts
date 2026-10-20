import { collection, deleteDoc, doc, setDoc } from 'firebase/firestore'
import { addressSchema, COL, SUB, type Address, type AddressInput } from '@app/shared'

import { readAll } from '@/lib/catalog/read'
import { db } from '@/lib/firebase'

/**
 * The address book under a customer's user document.
 *
 * Deleting one does not touch any booking it was used for. A booking copies its
 * address at the moment it is created, precisely so that tidying up here cannot
 * rewrite where a past job happened.
 */

/** Every saved address that parses; one that does not is left out, not fatal. */
export async function fetchAddresses(uid: string): Promise<Address[]> {
  return readAll(collection(db(), COL.users, uid, SUB.addresses), addressSchema)
}

/**
 * Saves an address: over the one with `id` when given, as a new document
 * otherwise. Only a new one is stamped with `createdAt`.
 */
export async function saveAddress(uid: string, input: AddressInput, id?: string): Promise<string> {
  const ref = id
    ? doc(db(), COL.users, uid, SUB.addresses, id)
    : doc(collection(db(), COL.users, uid, SUB.addresses))
  await setDoc(ref, { ...input, updatedAt: Date.now(), ...(id ? {} : { createdAt: Date.now() }) }, { merge: true })
  return ref.id
}

/** Removes one saved address. */
export async function deleteAddress(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(db(), COL.users, uid, SUB.addresses, id))
}
