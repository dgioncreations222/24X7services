import { doc, getDoc } from 'firebase/firestore'
import { addressSchema, COL, SUB, type Address, type AddressInput } from '@app/shared'

import { db } from '@/lib/firebase'
import { saveAddress } from './addresses'

/**
 * The address book, as the booking flow reads and writes it. The full list is
 * `fetchAddresses` in `./addresses`; these are the reads and the write that
 * only booking needs.
 *
 * The rules allow a customer to write their own addresses, so these are plain
 * client reads and writes. Each row is parsed on the way in; one that has
 * drifted from the schema is dropped rather than rendered half-filled.
 */

/**
 * Writes a new address to the book and resolves with its id, so the booking can
 * carry it straight on. Editing an existing address lives in `./addresses`.
 */
export function addAddress(uid: string, input: AddressInput): Promise<string> {
  return saveAddress(uid, input)
}

/** One saved address by id, or null when it is missing or does not parse. */
export async function fetchSavedAddress(uid: string, addressId: string): Promise<Address | null> {
  const snap = await getDoc(doc(db(), COL.users, uid, SUB.addresses, addressId))
  const parsed = addressSchema.safeParse({ id: snap.id, ...snap.data() })
  return parsed.success ? parsed.data : null
}

/**
 * The pincode of a saved address, which is what slot and technician
 * availability are asked against. Undefined when signed out or when the address
 * cannot be read.
 */
export async function pincodeOfSavedAddress(uid: string | undefined, addressId: string): Promise<string | undefined> {
  if (!uid) return undefined
  const address = await fetchSavedAddress(uid, addressId)
  return address ? address.pincode : undefined
}
