/**
 * The callable wrapper and the budget kill-switch, run against the Firestore
 * emulator with the admin SDK, the way they run when deployed.
 *
 * Each check of the wrapper is tested for what it lets through and for what
 * it exists to stop. Run with `npm run test:rules` from backend/functions,
 * which starts the emulator and sets FIRESTORE_EMULATOR_HOST for it.
 */

import { HttpsError } from 'firebase-functions/v2/https'
import { Timestamp } from 'firebase-admin/firestore'
import { z } from 'zod'
import { logger } from 'firebase-functions'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../src/lib/admin'
import { clearAccountCache, runCallable, type CallRequest, type CallableSpec } from '../src/lib/callable'
import { clearFlagCache } from '../src/lib/flags'
import { applyBudgetNotification } from '../src/ops/killSwitch'

const PROJECT = process.env.GCLOUD_PROJECT ?? 'demo-customer-service'
const ALICE = 'user-alice'

beforeEach(async () => {
  const host = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080'
  await fetch(`http://${host}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' })
  clearFlagCache()
  clearAccountCache()
})

afterAll(async () => {
  await db().terminate()
})

function call(opts: { uid?: string; role?: string; app?: boolean; data?: unknown } = {}): CallRequest {
  const uid = 'uid' in opts ? opts.uid : ALICE
  return {
    auth: uid ? ({ uid, token: opts.role ? { role: opts.role } : {} } as any) : undefined,
    app: opts.app === false ? undefined : ({ appId: 'test-app', token: {} } as any),
    data: opts.data ?? {},
  }
}

async function codeOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise
  } catch (err) {
    if (err instanceof HttpsError) return err.code
    throw err
  }
  return 'ok'
}

const echo: CallableSpec<z.ZodObject<{ n: z.ZodNumber }>, { n: number }> = {
  name: 'echo_v1',
  mode: 'read',
  roles: ['customer'],
  input: z.object({ n: z.number().int() }).strict(),
  handler: async ({ input }) => ({ n: input.n }),
}

/** Adds one to counters/c inside the transaction and returns the new value. */
function counterSpec(overrides: Partial<CallableSpec<any, any>> = {}): CallableSpec<any, { value: number }> {
  return {
    name: 'bump_v1',
    mode: 'write',
    roles: ['customer'],
    input: z.object({ by: z.number().int() }).strict(),
    idempotent: true,
    audit: 'counter.bump',
    handler: async ({ input }, tx) => {
      const ref = db().doc('counters/c')
      const value = ((await tx.get(ref)).get('value') ?? 0) + input.by
      tx.set(ref, { value })
      return { value }
    },
    ...overrides,
  } as CallableSpec<any, { value: number }>
}

async function counterValue(): Promise<number | undefined> {
  return (await db().doc('counters/c').get()).get('value')
}

describe('1-3. sign-in, App Check, input', () => {
  it('rejects a call without sign-in', async () => {
    expect(await codeOf(runCallable(echo, call({ uid: undefined, data: { n: 1 } })))).toBe('unauthenticated')
  })

  it('allows a call without App Check while the flag is off, and rejects it once it is on', async () => {
    expect(await runCallable(echo, call({ app: false, data: { n: 1 } }))).toEqual({ n: 1 })
    await db().doc('config/flags').set({ appCheckEnforce: true })
    clearFlagCache()
    expect(await codeOf(runCallable(echo, call({ app: false, data: { n: 1 } })))).toBe('failed-precondition')
    expect(await runCallable(echo, call({ data: { n: 1 } }))).toEqual({ n: 1 })
  })

  it('rejects missing, wrongly typed and extra fields', async () => {
    expect(await codeOf(runCallable(echo, call({ data: {} })))).toBe('invalid-argument')
    expect(await codeOf(runCallable(echo, call({ data: { n: 'one' } })))).toBe('invalid-argument')
    expect(await codeOf(runCallable(echo, call({ data: { n: 1, price: 0 } })))).toBe('invalid-argument')
    expect(await codeOf(runCallable(echo, call({ data: null })))).toBe('invalid-argument')
  })

  it('refuses a call while its feature flag is off', async () => {
    const spec = { ...echo, requiresFlag: 'maps' as const }
    expect(await runCallable(spec, call({ data: { n: 1 } }))).toEqual({ n: 1 })
    await db().doc('config/flags').set({ maps: false })
    clearFlagCache()
    expect(await codeOf(runCallable(spec, call({ data: { n: 1 } })))).toBe('unavailable')
  })
})

describe('4. permission', () => {
  it('treats a missing role claim as customer, and refuses roles the function does not list', async () => {
    expect(await runCallable(echo, call({ data: { n: 1 } }))).toEqual({ n: 1 })
    expect(await codeOf(runCallable(echo, call({ role: 'partner', data: { n: 1 } })))).toBe('permission-denied')
  })

  it('an admin claim needs users/{uid}.role to agree', async () => {
    const adminOnly = { ...echo, roles: ['admin'] as const }
    expect(await codeOf(runCallable(adminOnly, call({ role: 'admin', data: { n: 1 } })))).toBe('permission-denied')
    await db().doc(`users/${ALICE}`).set({ role: 'admin' })
    clearAccountCache()
    expect(await runCallable(adminOnly, call({ role: 'admin', data: { n: 1 } }))).toEqual({ n: 1 })
  })

  it('a partner claim needs users/{uid}.role to agree, so a demoted technician is stopped', async () => {
    const partnerOnly = { ...echo, roles: ['partner'] as const }
    expect(await codeOf(runCallable(partnerOnly, call({ role: 'partner', data: { n: 1 } })))).toBe('permission-denied')
    await db().doc(`users/${ALICE}`).set({ role: 'partner' })
    clearAccountCache()
    expect(await runCallable(partnerOnly, call({ role: 'partner', data: { n: 1 } }))).toEqual({ n: 1 })
    await db().doc(`users/${ALICE}`).set({ role: 'customer' })
    clearAccountCache()
    expect(await codeOf(runCallable(partnerOnly, call({ role: 'partner', data: { n: 1 } })))).toBe('permission-denied')
  })

  it('a suspended partner or admin is refused, even with the right role', async () => {
    const partnerOnly = { ...echo, roles: ['partner'] as const }
    const adminOnly = { ...echo, roles: ['admin'] as const }
    await db().doc(`users/${ALICE}`).set({ role: 'partner', suspended: true })
    expect(await codeOf(runCallable(partnerOnly, call({ role: 'partner', data: { n: 1 } })))).toBe('permission-denied')
    await db().doc('users/user-admin').set({ role: 'admin', suspended: true })
    expect(await codeOf(runCallable(adminOnly, call({ uid: 'user-admin', role: 'admin', data: { n: 1 } })))).toBe('permission-denied')
  })

  it('a suspension reaches a running instance within the cache minute, not on the next read', async () => {
    const partnerOnly = { ...echo, roles: ['partner'] as const }
    await db().doc(`users/${ALICE}`).set({ role: 'partner' })
    expect(await runCallable(partnerOnly, call({ role: 'partner', data: { n: 1 } }))).toEqual({ n: 1 })
    await db().doc(`users/${ALICE}`).update({ suspended: true })
    // Still cached: this is the up-to-a-minute gap the wrapper accepts.
    expect(await runCallable(partnerOnly, call({ role: 'partner', data: { n: 1 } }))).toEqual({ n: 1 })
    clearAccountCache() // what the minute passing does
    expect(await codeOf(runCallable(partnerOnly, call({ role: 'partner', data: { n: 1 } })))).toBe('permission-denied')
  })

  it('customers are not re-checked: no read on their calls', async () => {
    await db().doc(`users/${ALICE}`).set({ role: 'customer', suspended: true })
    expect(await runCallable(echo, call({ role: 'customer', data: { n: 1 } }))).toEqual({ n: 1 })
  })

  it('logs permission-denied and resource-exhausted as warnings, with fn and uid', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {})
    try {
      await codeOf(runCallable(echo, call({ role: 'partner', data: { n: 1 } })))
      const limited = { ...echo, rateLimit: { max: 1, windowSec: 60 } }
      await runCallable(limited, call({ data: { n: 1 } }))
      await codeOf(runCallable(limited, call({ data: { n: 1 } })))
      const logged = warn.mock.calls.map((c) => [c[0], c[1]])
      expect(logged).toContainEqual(['echo_v1: permission-denied', expect.objectContaining({ fn: 'echo_v1', uid: ALICE })])
      expect(logged).toContainEqual(['echo_v1: resource-exhausted', expect.objectContaining({ fn: 'echo_v1', uid: ALICE })])
    } finally {
      warn.mockRestore()
    }
  })
})

describe('5. rate limit', () => {
  it('allows max calls per window, then refuses until the window passes', async () => {
    const spec = { ...echo, rateLimit: { max: 2, windowSec: 1 } }
    const req = call({ data: { n: 1 } })
    await runCallable(spec, req)
    await runCallable(spec, req)
    expect(await codeOf(runCallable(spec, req))).toBe('resource-exhausted')
    // Another user has their own counter.
    expect(await runCallable(spec, call({ uid: 'user-bob', data: { n: 1 } }))).toEqual({ n: 1 })
    await new Promise((r) => setTimeout(r, 1100))
    expect(await runCallable(spec, req)).toEqual({ n: 1 })
  })
})

describe('6-8. idempotency, transaction, audit', () => {
  it('runs once for a repeated requestId and returns the first result again', async () => {
    const req = call({ data: { by: 5, requestId: 'req-00000001' } })
    expect(await runCallable(counterSpec(), req)).toEqual({ value: 5 })
    expect(await runCallable(counterSpec(), req)).toEqual({ value: 5 })
    expect(await counterValue()).toBe(5)
    expect(await runCallable(counterSpec(), call({ data: { by: 5, requestId: 'req-00000002' } }))).toEqual({ value: 10 })
    expect((await db().collection('audit').get()).size).toBe(2)
  })

  it('refuses a reused requestId with different input, and a missing or malformed one', async () => {
    await runCallable(counterSpec(), call({ data: { by: 1, requestId: 'req-00000001' } }))
    expect(await codeOf(runCallable(counterSpec(), call({ data: { by: 2, requestId: 'req-00000001' } })))).toBe('failed-precondition')
    expect(await codeOf(runCallable(counterSpec(), call({ data: { by: 1 } })))).toBe('invalid-argument')
    expect(await codeOf(runCallable(counterSpec(), call({ data: { by: 1, requestId: 'bad id!' } })))).toBe('invalid-argument')
    expect(await counterValue()).toBe(1)
  })

  it('judges expiry by expiresAt, not by whether the record still exists', async () => {
    const req = call({ data: { by: 1, requestId: 'req-00000001' } })
    await runCallable(counterSpec(), req)
    await db().doc(`idempotency/bump_v1:${ALICE}:req-00000001`).update({ expiresAt: Timestamp.fromMillis(Date.now() - 1000) })
    await runCallable(counterSpec(), req)
    expect(await counterValue()).toBe(2)
  })

  it('a handler that throws leaves no write, no stored result and no audit entry', async () => {
    const failing = counterSpec({
      handler: async (_ctx: unknown, tx: FirebaseFirestore.Transaction) => {
        tx.set(db().doc('counters/c'), { value: 99 })
        throw new HttpsError('failed-precondition', 'slot is full')
      },
    })
    const req = call({ data: { by: 1, requestId: 'req-00000001' } })
    expect(await codeOf(runCallable(failing, req))).toBe('failed-precondition')
    expect(await counterValue()).toBeUndefined()
    expect((await db().collection('idempotency').get()).size).toBe(0)
    expect((await db().collection('audit').get()).size).toBe(0)
    // The same requestId can then be used for a real attempt.
    expect(await runCallable(counterSpec(), req)).toEqual({ value: 1 })
  })

  it('an unexpected error reaches the app as internal, without its message', async () => {
    const broken = { ...echo, handler: async () => { throw new Error('db password is hunter2') } }
    try {
      await runCallable(broken, call({ data: { n: 1 } }))
      expect.unreachable()
    } catch (err) {
      expect((err as HttpsError).code).toBe('internal')
      expect((err as HttpsError).message).not.toContain('hunter2')
    }
  })
})

describe('after-commit hook', () => {
  it('runs once after the commit, with the result, and not on a replay', async () => {
    const seen: number[] = []
    const spec = counterSpec({
      after: async (_ctx: unknown, result: { value: number }) => {
        // The write is already committed when this runs.
        expect(await counterValue()).toBe(result.value)
        seen.push(result.value)
      },
    })
    const req = call({ data: { by: 3, requestId: 'req-00000001' } })
    await runCallable(spec, req)
    await runCallable(spec, req)
    expect(seen).toEqual([3])
  })

  it('does not run when the handler fails', async () => {
    let ran = false
    const spec = counterSpec({
      handler: async () => { throw new HttpsError('failed-precondition', 'no') },
      after: async () => { ran = true },
    })
    await codeOf(runCallable(spec, call({ data: { by: 1, requestId: 'req-00000001' } })))
    expect(ran).toBe(false)
  })

  it('a failing after step is logged; the committed call still succeeds', async () => {
    const spec = counterSpec({ after: async () => { throw new Error('push service down') } })
    expect(await runCallable(spec, call({ data: { by: 1, requestId: 'req-00000001' } }))).toEqual({ value: 1 })
    expect(await counterValue()).toBe(1)
  })
})

describe('audit details', () => {
  async function auditDocs() {
    return (await db().collection('audit').get()).docs.map((d) => d.data())
  }

  it('a write handler can record target, before, after and meta, committed with its writes', async () => {
    const spec = counterSpec({
      audit: undefined,
      handler: async ({ input, audit }: any, tx: FirebaseFirestore.Transaction) => {
        tx.set(db().doc('counters/c'), { value: input.by })
        audit({ action: 'counter.set', target: 'counters/c', before: { value: null }, after: { value: input.by }, meta: { reason: 'test' } })
        return { value: input.by }
      },
    })
    await runCallable(spec, call({ data: { by: 7, requestId: 'req-00000001' } }))
    expect(await auditDocs()).toEqual([
      expect.objectContaining({
        action: 'counter.set', fn: 'bump_v1', by: ALICE, role: 'customer', requestId: 'req-00000001',
        target: 'counters/c', before: { value: null }, after: { value: 7 }, meta: { reason: 'test' },
      }),
    ])
  })

  it('a read can write an audit entry (for example a phone number revealed); a read without one writes none', async () => {
    const reveal = {
      ...echo,
      name: 'revealPhone_v1',
      handler: async ({ input, audit }: any) => {
        audit({ action: 'phone.reveal', target: 'bookings/b1', meta: { phone: '+91******3210' } })
        return { n: input.n }
      },
    }
    await runCallable(echo, call({ data: { n: 1 } }))
    expect(await auditDocs()).toHaveLength(0)
    await runCallable(reveal, call({ data: { n: 1 } }))
    expect(await auditDocs()).toEqual([
      expect.objectContaining({ action: 'phone.reveal', fn: 'revealPhone_v1', target: 'bookings/b1', meta: { phone: '+91******3210' } }),
    ])
  })

  it('a read whose handler fails writes no audit entry', async () => {
    const failing = {
      ...echo,
      handler: async ({ audit }: any) => {
        audit({ action: 'phone.reveal' })
        throw new HttpsError('not-found', 'no booking')
      },
    }
    await codeOf(runCallable(failing, call({ data: { n: 1 } })))
    expect(await auditDocs()).toHaveLength(0)
  })
})

describe('budget kill-switch', () => {
  it('does nothing under budget', async () => {
    expect(await applyBudgetNotification({ costAmount: 24_999, budgetAmount: 25_000 })).toBe('under-budget')
    expect((await db().doc('config/flags').get()).exists).toBe(false)
  })

  it('turns the paid features off at the budget, once, and leaves the rest alone', async () => {
    await db().doc('config/flags').set({ onlinePayments: true })
    expect(await applyBudgetNotification({ costAmount: 25_000, budgetAmount: 25_000, currencyCode: 'INR' })).toBe('switched-off')
    const flags = (await db().doc('config/flags').get()).data()
    expect(flags).toMatchObject({ maps: false, tracking: false, whatsapp: false, sms: false, onlinePayments: true, updatedBy: 'kill-switch' })
    expect(await applyBudgetNotification({ costAmount: 26_000, budgetAmount: 25_000 })).toBe('already-off')
    expect((await db().collection('audit').get()).size).toBe(1)
  })

  it('ignores a message without amounts', async () => {
    expect(await applyBudgetNotification({ budgetDisplayName: 'x' })).toBe('bad-message')
  })
})
