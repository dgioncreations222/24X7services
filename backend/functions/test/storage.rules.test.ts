/**
 * storage.rules, tested from both sides like firestore.rules.
 *
 * Run with `npm run test:rules` from backend/functions, which starts the
 * Firestore and Storage emulators around it.
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
import { deleteObject, getBytes, ref, uploadBytes } from 'firebase/storage'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

const ALICE = 'user-alice'
const BOB = 'user-bob'
const AVATAR = `users/${ALICE}/profile/avatar`

const PNG = { contentType: 'image/png' }
const smallImage = () => new Uint8Array(1024)
const bigImage = () => new Uint8Array(2 * 1024 * 1024 + 1)

let testEnv: RulesTestEnvironment

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-customer-service',
    storage: {
      rules: readFileSync(join(__dirname, '..', '..', 'storage.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 9199,
    },
  })
})

afterAll(async () => {
  await testEnv?.cleanup()
})

beforeEach(async () => {
  await testEnv.clearStorage()
})

function storageAs(uid?: string) {
  const ctx = uid ? testEnv.authenticatedContext(uid) : testEnv.unauthenticatedContext()
  return ctx.storage()
}

/** Put a file past the rules, the way an admin tool or function would. */
async function asAdminSdk(path: string, data: Uint8Array, contentType: string): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async (ctx: RulesTestContext) => {
    await uploadBytes(ref(ctx.storage(), path), data, { contentType })
  })
}

describe('catalog images', () => {
  it('anyone can read; nobody can upload from a client', async () => {
    await asAdminSdk('catalog/ac.png', smallImage(), 'image/png')
    await assertSucceeds(getBytes(ref(storageAs(), 'catalog/ac.png')))
    await assertFails(uploadBytes(ref(storageAs(ALICE), 'catalog/x.png'), smallImage(), PNG))
  })
})

describe('users/{uid}/profile/avatar', () => {
  it('owner can upload and read their photo; others cannot', async () => {
    await assertSucceeds(uploadBytes(ref(storageAs(ALICE), AVATAR), smallImage(), PNG))
    await assertSucceeds(getBytes(ref(storageAs(ALICE), AVATAR)))
    await assertFails(getBytes(ref(storageAs(BOB), AVATAR)))
    await assertFails(getBytes(ref(storageAs(), AVATAR)))
    await assertFails(uploadBytes(ref(storageAs(BOB), AVATAR), smallImage(), PNG))
  })

  it('rejects a non-image, a file over 2 MB and any other file name', async () => {
    await assertFails(uploadBytes(ref(storageAs(ALICE), AVATAR), smallImage(), { contentType: 'application/pdf' }))
    await assertFails(uploadBytes(ref(storageAs(ALICE), AVATAR), bigImage(), PNG))
    await assertFails(uploadBytes(ref(storageAs(ALICE), `users/${ALICE}/profile/avatar2`), smallImage(), PNG))
  })

  it('can be replaced, but not deleted by the app', async () => {
    await assertSucceeds(uploadBytes(ref(storageAs(ALICE), AVATAR), smallImage(), PNG))
    await assertSucceeds(uploadBytes(ref(storageAs(ALICE), AVATAR), smallImage(), PNG))
    await assertFails(deleteObject(ref(storageAs(ALICE), AVATAR)))
  })
})
