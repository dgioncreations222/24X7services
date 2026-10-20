/**
 * Every rule in firestore.rules, tested from both sides: the read or write it
 * is meant to allow, and the one it exists to stop. A rules file that only ever
 * gets its allow cases tested is a rules file nobody has checked.
 *
 * Run with `npm run test:rules` from backend/functions, which starts the emulator
 * around it.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  setLogLevel,
  updateDoc,
} from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

const ALICE = 'user-alice'
const BOB = 'user-bob'
const ADMIN = 'user-admin'

let testEnv: RulesTestEnvironment

beforeAll(async () => {
  // The SDK logs every expected permission denial at error level, which buries
  // the actual test output.
  setLogLevel('error')

  testEnv = await initializeTestEnvironment({
    projectId: 'demo-customer-service',
    firestore: {
      rules: readFileSync(join(__dirname, '..', '..', 'firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  })
})

afterAll(async () => {
  await testEnv?.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()
})

/** Seed a document past the rules, the way a function or the seed would. */
async function asAdminSdk(fn: (db: any) => Promise<void>): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async (ctx: RulesTestContext) => {
    await fn(ctx.firestore())
  })
}

function alice() {
  return testEnv.authenticatedContext(ALICE, { role: 'customer' }).firestore()
}
function bob() {
  return testEnv.authenticatedContext(BOB, { role: 'customer' }).firestore()
}
/** A brand-new account whose role claim has not reached the token yet. */
function aliceNoClaim() {
  return testEnv.authenticatedContext(ALICE).firestore()
}
function admin() {
  return testEnv.authenticatedContext(ADMIN, { role: 'admin' }).firestore()
}
function partner() {
  return testEnv.authenticatedContext('user-partner', { role: 'partner' }).firestore()
}
function guest() {
  return testEnv.unauthenticatedContext().firestore()
}

const ADDRESS = {
  label: 'home',
  flat: '12-3, Flat 401',
  area: 'Kondapur',
  city: 'Hyderabad',
  pincode: '500084',
}

describe('catalog', () => {
  const paths = ['categories/ac', 'services/ac-service', 'services/ac-service/questions/q1',
                 'cities/hyd', 'zones/kondapur', 'config/public']

  it('anyone can read, signed in or not', async () => {
    for (const p of paths) {
      await asAdminSdk((db) => setDoc(doc(db, p), { name: 'x' }))
      await assertSucceeds(getDoc(doc(guest(), p)))
      await assertSucceeds(getDoc(doc(alice(), p)))
    }
  })

  it('nobody can write from a client, not even an admin', async () => {
    for (const p of paths) {
      await assertFails(setDoc(doc(alice(), p), { name: 'x' }))
      await assertFails(setDoc(doc(admin(), p), { name: 'x' }))
    }
  })

  it('config/private is unreadable', async () => {
    await asAdminSdk((db) => setDoc(doc(db, 'config/private'), { commission: 0.2 }))
    await assertFails(getDoc(doc(guest(), 'config/private')))
    await assertFails(getDoc(doc(alice(), 'config/private')))
    await assertFails(getDoc(doc(admin(), 'config/private')))
  })
})

describe('users/{uid}', () => {
  it('owner can read their profile; others and guests cannot', async () => {
    await asAdminSdk((db) => setDoc(doc(db, `users/${ALICE}`), { email: 'a@x.com', role: 'customer' }))
    await assertSucceeds(getDoc(doc(alice(), `users/${ALICE}`)))
    await assertFails(getDoc(doc(bob(), `users/${ALICE}`)))
    await assertFails(getDoc(doc(guest(), `users/${ALICE}`)))
    await assertFails(getDoc(doc(partner(), `users/${ALICE}`)))
  })

  it('admin can read and list users; a customer cannot list', async () => {
    await asAdminSdk((db) => setDoc(doc(db, `users/${ALICE}`), { role: 'customer' }))
    await assertSucceeds(getDoc(doc(admin(), `users/${ALICE}`)))
    await assertSucceeds(getDocs(collection(admin(), 'users')))
    await assertFails(getDocs(collection(alice(), 'users')))
  })

  it('a new account without the role claim yet can still create its profile', async () => {
    await assertSucceeds(setDoc(doc(aliceNoClaim(), `users/${ALICE}`), { name: 'Alice' }))
  })

  it('owner can set display fields', async () => {
    await assertSucceeds(setDoc(doc(alice(), `users/${ALICE}`), {
      name: 'Alice',
      phone: '+919876543210',
      notifications: { push: true, inApp: false },
    }))
  })

  it('owner cannot set role, email or createdAt', async () => {
    await assertFails(setDoc(doc(alice(), `users/${ALICE}`), { role: 'admin' }))
    await assertFails(setDoc(doc(alice(), `users/${ALICE}`), { email: 'fake@x.com' }))
    await assertFails(setDoc(doc(alice(), `users/${ALICE}`), { createdAt: 1 }))
  })

  it('owner cannot promote themselves on update either', async () => {
    await asAdminSdk((db) => setDoc(doc(db, `users/${ALICE}`), { email: 'a@x.com', role: 'customer' }))
    await assertSucceeds(updateDoc(doc(alice(), `users/${ALICE}`), { name: 'Alice' }))
    await assertFails(updateDoc(doc(alice(), `users/${ALICE}`), { role: 'admin' }))
    await assertFails(updateDoc(doc(alice(), `users/${ALICE}`), { email: 'other@x.com' }))
  })

  it('rejects a bad phone, an over-long name and unknown notification keys', async () => {
    await assertFails(setDoc(doc(alice(), `users/${ALICE}`), { phone: '12345' }))
    await assertFails(setDoc(doc(alice(), `users/${ALICE}`), { phone: '+915876543210' }))
    await assertFails(setDoc(doc(alice(), `users/${ALICE}`), { name: 'x'.repeat(81) }))
    await assertFails(setDoc(doc(alice(), `users/${ALICE}`), { notifications: { sms: true } }))
  })

  it('updatedAt must be the server clock, not a value the client picks', async () => {
    await assertSucceeds(setDoc(doc(alice(), `users/${ALICE}`), { name: 'Alice', updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(doc(alice(), `users/${ALICE}`), { updatedAt: new Date('2099-01-01') }))
    await assertFails(updateDoc(doc(alice(), `users/${ALICE}`), { updatedAt: 'yesterday' }))
    await assertSucceeds(updateDoc(doc(alice(), `users/${ALICE}`), { name: 'A', updatedAt: serverTimestamp() }))
  })

  it('nobody can write to another user or delete a profile', async () => {
    await assertFails(setDoc(doc(bob(), `users/${ALICE}`), { name: 'Bob' }))
    await assertFails(setDoc(doc(admin(), `users/${ALICE}`), { name: 'Admin' }))
    await asAdminSdk((db) => setDoc(doc(db, `users/${ALICE}`), { name: 'Alice' }))
    await assertFails(deleteDoc(doc(alice(), `users/${ALICE}`)))
  })
})

describe('users/{uid}/addresses', () => {
  const path = `users/${ALICE}/addresses/a1`

  it('owner can create, read and delete an address', async () => {
    await assertSucceeds(setDoc(doc(alice(), path), ADDRESS))
    await assertSucceeds(getDoc(doc(alice(), path)))
    await assertSucceeds(deleteDoc(doc(alice(), path)))
  })

  it('others cannot read or write it', async () => {
    await asAdminSdk((db) => setDoc(doc(db, path), ADDRESS))
    await assertFails(getDoc(doc(bob(), path)))
    await assertFails(setDoc(doc(bob(), path), ADDRESS))
    await assertFails(getDoc(doc(guest(), path)))
  })

  it('createdAt/updatedAt must be the server clock, and createdAt cannot be moved later', async () => {
    await assertSucceeds(setDoc(doc(alice(), path), {
      ...ADDRESS, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    }))
    await assertSucceeds(updateDoc(doc(alice(), path), { area: 'Gachibowli', updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(doc(alice(), path), { createdAt: serverTimestamp() }))
    await assertFails(setDoc(doc(alice(), `users/${ALICE}/addresses/a2`), {
      ...ADDRESS, createdAt: new Date('2020-01-01'),
    }))
  })

  it('rejects missing fields, extra fields, a bad label and a bad pincode', async () => {
    const { pincode: _omit, ...noPincode } = ADDRESS
    await assertFails(setDoc(doc(alice(), path), noPincode))
    await assertFails(setDoc(doc(alice(), path), { ...ADDRESS, isVerified: true }))
    await assertFails(setDoc(doc(alice(), path), { ...ADDRESS, label: 'villa' }))
    await assertFails(setDoc(doc(alice(), path), { ...ADDRESS, pincode: '050084' }))
  })
})

describe('everything else', () => {
  it('an unnamed collection is closed to everyone', async () => {
    await assertFails(getDoc(doc(admin(), 'bookings/b1')))
    await assertFails(setDoc(doc(alice(), 'bookings/b1'), { status: 'completed' }))
    await assertFails(getDoc(doc(guest(), 'anything/x')))
  })
})
