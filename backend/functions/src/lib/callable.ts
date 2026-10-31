import './options'
import { createHash } from 'node:crypto'
import { onCall, HttpsError, type CallableOptions, type CallableRequest } from 'firebase-functions/v2/https'
import { FieldValue, Timestamp, type Transaction } from 'firebase-admin/firestore'
import { z } from 'zod'
import { db } from './admin'
import { getFlags, type FlagName, type Flags } from './flags'
import { log } from './log'
import { isRole, type Role } from './roles'

/**
 * The one way to write a callable function. Every call passes the same eight
 * checks, in this order, before and around the handler:
 *
 *   1. Signed in          no auth token, no call
 *   2. App Check          missing token: logged, or rejected when the
 *                         appCheckEnforce flag is on
 *   3. Input              parsed with the function's zod schema; anything
 *                         else is rejected before it costs a read
 *   4. Permission         role from the token claim; partner and admin are
 *                         re-checked against users/{uid} (role and
 *                         `suspended`, cached for a minute)
 *   5. Rate limit         per user, per function, fixed window
 *   6. Idempotency        a repeated requestId gets the first result back
 *                         instead of running again
 *   7. Transaction        the handler's reads and writes commit together
 *   8. Audit              entries committed in the same transaction
 *
 * Nothing outside Firestore is called from a handler: a transaction handler
 * can run up to five times when documents are contended, and each run would
 * send again. Push, WhatsApp, SMS, Cloud Tasks and money go through an outbox
 * document written in the transaction. The optional `after` hook runs once
 * after the commit, for best-effort work only.
 *
 * A handler only ever sees input that passed all of this. It throws
 * HttpsError for anything the caller should see; any other error is logged
 * and reaches the app as 'internal', so no stack trace or internal detail
 * leaks to a client.
 *
 * Names carry a version (`createBooking_v1`). A change the installed apps
 * would not understand ships as `_v2` beside `_v1`, and `_v1` is removed once
 * no supported app version calls it.
 */

/**
 * One audit entry. Never put a full phone number, address, bank or KYC
 * detail in before/after/meta: store the changed field masked
 * (`+91******3210`) or just its name. The audit log is read by every admin.
 */
export interface AuditDetails {
  /** Defaults to the function's `audit` name, else the function name. */
  action?: string
  /** What was acted on: `bookings/AP261030-K7F2Q`, `users/{uid}`. */
  target?: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  meta?: Record<string, unknown>
}

export interface CallableContext<I> {
  uid: string
  role: Role
  input: I
  flags: Flags
  /** False when the call carried no valid App Check token (monitor mode). */
  appVerified: boolean
  /** Present on idempotent calls. */
  requestId?: string
  /**
   * Adds an audit entry. In a write it commits with the transaction; in a
   * read it is written once the handler has succeeded. Each entry is one
   * billed write, so audit what an admin may need to answer for (a refund,
   * a phone number revealed), not routine reads.
   */
  audit: (details: AuditDetails) => void
}

interface CommonSpec<S extends z.ZodTypeAny> {
  /** Deployed name, with its version: `ping_v1`. Also keys rate limits and replays. */
  name: string
  roles: readonly Role[]
  input: S
  /** Fixed window per user. Costs one read and one write per call, so set it where abuse would cost more. */
  rateLimit?: { max: number; windowSec: number }
  /** The call is refused while this flag is off (the kill-switch turns paid features off). */
  requiresFlag?: FlagName
  /** Writes one audit entry with this action on every successful call, beside any from ctx.audit. */
  audit?: string
  /** Passed to onCall: memory, timeoutSeconds, minInstances, concurrency, ... */
  options?: CallableOptions
}

/** A handler that only reads, or calls something outside Firestore. */
export interface ReadSpec<S extends z.ZodTypeAny, O> extends CommonSpec<S> {
  mode: 'read'
  handler: (ctx: CallableContext<z.infer<S>>) => Promise<O>
}

/** A handler that writes. It runs inside one Firestore transaction. */
export interface WriteSpec<S extends z.ZodTypeAny, O> extends CommonSpec<S> {
  mode: 'write'
  /**
   * The app sends a `requestId` (8-64 of A-Z a-z 0-9 _ -) beside the input
   * and reuses it when it retries. The first result is stored for
   * IDEMPOTENCY_HOURS and returned again for the same id, so a double tap or
   * a retry after a dropped connection never books twice. The result must be
   * a small plain object, since it is stored.
   */
  idempotent?: boolean
  /** Reads and writes Firestore only; no push, message or task from here. */
  handler: (ctx: CallableContext<z.infer<S>>, tx: Transaction) => Promise<O>
  /**
   * Runs once after the transaction commits, and not on an idempotent replay.
   * Best effort: a failure is logged and the call still succeeds, and a
   * crash between commit and here loses it. Only for work whose loss harms
   * nothing (an analytics event, a log line). Push, WhatsApp, SMS, email,
   * Cloud Tasks and anything to do with money never go here: the handler
   * writes an outbox document in its transaction, and a trigger sends it.
   */
  after?: (ctx: CallableContext<z.infer<S>>, result: O) => Promise<void>
}

export type CallableSpec<S extends z.ZodTypeAny, O> = ReadSpec<S, O> | WriteSpec<S, O>

export const IDEMPOTENCY_HOURS = 24
const ACCOUNT_CACHE_MS = 60_000
const MAX_AUDIT_ENTRIES = 20
const NAME = /^[A-Za-z][A-Za-z0-9]*_v[0-9]+$/
const REQUEST_ID = z.string().regex(/^[A-Za-z0-9_-]{8,64}$/)

const APP_CHECK_WARN_MS = 60_000
let lastAppCheckWarnAt = 0

/** Refusals logged as warnings: repeated ones are misuse worth seeing. */
const WARN_CODES = new Set(['permission-denied', 'resource-exhausted'])

/** The request fields the wrapper reads, so tests can build one by hand. */
export type CallRequest = Pick<CallableRequest, 'auth' | 'app' | 'data'>

export function defineCallable<S extends z.ZodTypeAny, O>(spec: CallableSpec<S, O>) {
  if (!NAME.test(spec.name)) throw new Error(`callable name must look like name_v1: ${spec.name}`)
  return onCall(
    // App Check is checked below, so the flag can switch between monitor and
    // enforce without a deploy. Concurrency is the platform default (80),
    // right for these I/O-bound handlers; a CPU-heavy function (PDF, CSV)
    // passes a low concurrency in its options.
    { ...spec.options, enforceAppCheck: false },
    (request) => runCallable(spec, request)
  )
}

export async function runCallable<S extends z.ZodTypeAny, O>(
  spec: CallableSpec<S, O>,
  request: CallRequest
): Promise<O> {
  try {
    return await run(spec, request)
  } catch (err) {
    if (err instanceof HttpsError) {
      if (WARN_CODES.has(err.code)) {
        log.warn(`${spec.name}: ${err.code}`, { fn: spec.name, uid: request.auth?.uid, reason: err.message })
      }
      throw err
    }
    log.error(`${spec.name}: unhandled error`, {
      fn: spec.name,
      uid: request.auth?.uid,
      error: err instanceof Error ? { message: err.message, stack: err.stack } : String(err),
    })
    throw new HttpsError('internal', 'Something went wrong. Please try again.')
  }
}

async function run<S extends z.ZodTypeAny, O>(spec: CallableSpec<S, O>, request: CallRequest): Promise<O> {
  // 1. Signed in
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Please sign in again.')

  // 2. App Check
  const flags = await getFlags()
  const appVerified = request.app !== undefined
  if (!appVerified) {
    if (flags.appCheckEnforce) throw new HttpsError('failed-precondition', 'Please update the app.')
    // Until the apps ship App Check (B10) every call lands here, so one line
    // per call would be a log bill for no information. Once a minute per
    // instance is enough to see that unverified calls are still arriving.
    const now = Date.now()
    if (now - lastAppCheckWarnAt >= APP_CHECK_WARN_MS) {
      lastAppCheckWarnAt = now
      log.warn(`${spec.name}: call without App Check`, { fn: spec.name, uid })
    }
  }
  if (spec.requiresFlag && !flags[spec.requiresFlag]) {
    throw new HttpsError('unavailable', 'This feature is not available right now.')
  }

  // 3. Input. requestId travels beside the input, not inside it, so a strict
  // schema does not have to list it.
  const { requestId: rawRequestId, ...rawInput } = isPlainObject(request.data) ? request.data : {}
  const parsed = spec.input.safeParse(rawInput)
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', 'Some details are missing or wrong.', {
      issues: parsed.error.issues.slice(0, 5).map((i: z.ZodIssue) => ({ path: i.path.join('.'), message: i.message })),
    })
  }
  const input = parsed.data as z.infer<S>

  let requestId: string | undefined
  if (spec.mode === 'write' && spec.idempotent) {
    const id = REQUEST_ID.safeParse(rawRequestId)
    if (!id.success) throw new HttpsError('invalid-argument', 'Missing request id.')
    requestId = id.data
  }

  // 4. Permission
  const claim = request.auth?.token.role
  const role: Role = isRole(claim) ? claim : 'customer'
  if (!spec.roles.includes(role)) throw new HttpsError('permission-denied', 'You cannot do this.')
  if (role !== 'customer') await assertAccountActive(uid, role)

  // 5. Rate limit
  if (spec.rateLimit) await consumeRateLimit(spec.name, uid, spec.rateLimit)

  // Audit entries are collected per attempt: a retried transaction starts
  // with an empty list, so an entry is never written twice.
  let auditEntries: AuditDetails[] = []
  const ctx: CallableContext<z.infer<S>> = {
    uid,
    role,
    input,
    flags,
    appVerified,
    requestId,
    audit: (details) => {
      if (auditEntries.length >= MAX_AUDIT_ENTRIES) throw new Error(`${spec.name}: more than ${MAX_AUDIT_ENTRIES} audit entries`)
      auditEntries.push(details)
    },
  }
  const auditDocs = () => auditRecords(spec, ctx, auditEntries)

  if (spec.mode === 'read') {
    const result = await spec.handler(ctx)
    const docs = auditDocs()
    if (docs.length > 0) {
      const batch = db().batch()
      for (const d of docs) batch.create(db().collection('audit').doc(), d)
      await batch.commit()
    }
    return result
  }

  // 6-8. Idempotency, transaction and audit, all committed together: the
  // stored result exists exactly when the handler's writes do.
  const write = spec
  const outcome = await db().runTransaction(async (tx): Promise<{ result: O; replay: boolean }> => {
    auditEntries = []
    const now = Date.now()
    let replayRef: FirebaseFirestore.DocumentReference | undefined
    let inputHash: string | undefined
    if (requestId) {
      replayRef = db().collection('idempotency').doc(`${write.name}:${uid}:${requestId}`)
      inputHash = hashOf(input)
      const prior = (await tx.get(replayRef)).data()
      // TTL deletes expired records a day or more late, so expiry is decided
      // by expiresAt, never by whether the document still exists.
      if (prior && prior.expiresAt.toMillis() > now) {
        if (prior.inputHash !== inputHash) {
          throw new HttpsError('failed-precondition', 'This request id was already used for a different request.')
        }
        return { result: prior.result as O, replay: true }
      }
    }

    const result = await write.handler(ctx, tx)

    if (replayRef) {
      tx.set(replayRef, {
        fn: write.name,
        uid,
        inputHash,
        result: result ?? null,
        createdAt: FieldValue.serverTimestamp(),
        expiresAt: Timestamp.fromMillis(now + IDEMPOTENCY_HOURS * 3600_000),
      })
    }
    for (const d of auditDocs()) tx.create(db().collection('audit').doc(), d)
    return { result, replay: false }
  })

  if (write.after && !outcome.replay) {
    try {
      await write.after(ctx, outcome.result)
    } catch (err) {
      log.error(`${write.name}: after-commit step failed`, {
        fn: write.name,
        uid,
        requestId,
        error: err instanceof Error ? { message: err.message, stack: err.stack } : String(err),
      })
    }
  }
  return outcome.result
}

/** The spec's own entry (if it names one) plus the handler's, as documents. */
function auditRecords<S extends z.ZodTypeAny, O>(
  spec: CallableSpec<S, O>,
  ctx: CallableContext<z.infer<S>>,
  entries: AuditDetails[]
): Record<string, unknown>[] {
  const all = spec.audit && entries.length === 0 ? [{}] : entries
  return all.map((e: AuditDetails) => ({
    action: e.action ?? spec.audit ?? spec.name,
    fn: spec.name,
    by: ctx.uid,
    role: ctx.role,
    requestId: ctx.requestId ?? null,
    target: e.target ?? null,
    before: e.before ?? null,
    after: e.after ?? null,
    meta: e.meta ?? null,
    at: FieldValue.serverTimestamp(),
  }))
}

/**
 * Fixed-window counter in rateLimits/{fn}:{uid}. A window that has passed is
 * restarted rather than deleted, so each user costs one document per
 * function, and the window is judged by its own fields, never by TTL.
 */
async function consumeRateLimit(fn: string, uid: string, limit: { max: number; windowSec: number }) {
  const ref = db().collection('rateLimits').doc(`${fn}:${uid}`)
  const allowed = await db().runTransaction(async (tx) => {
    const now = Date.now()
    const windowMs = limit.windowSec * 1000
    const current = (await tx.get(ref)).data()
    const inWindow = current !== undefined && now - current.windowStart < windowMs
    const count = inWindow ? current.count : 0
    if (count >= limit.max) return false
    const windowStart = inWindow ? current.windowStart : now
    tx.set(ref, {
      windowStart,
      count: count + 1,
      expiresAt: Timestamp.fromMillis(windowStart + windowMs),
    })
    return true
  })
  if (!allowed) throw new HttpsError('resource-exhausted', 'Too many requests. Please wait a minute.')
}

/**
 * A partner or admin token is re-checked against users/{uid}, the source of
 * truth that setRole.ts writes first: the role must still match and the
 * account must not be `suspended`. A token outlives a demotion or a
 * suspension by up to an hour, so without this a suspended technician could
 * keep accepting jobs. Checked once a minute per instance, so it stops them
 * within a minute without a read on every call. Customers are not checked:
 * they are most of the traffic, and the rules decide what they can touch.
 */
const accountChecks = new Map<string, { role: unknown; suspended: boolean; at: number }>()

async function assertAccountActive(uid: string, role: Role): Promise<void> {
  const now = Date.now()
  let account = accountChecks.get(uid)
  if (!account || now - account.at >= ACCOUNT_CACHE_MS) {
    const data = (await db().collection('users').doc(uid).get()).data()
    account = { role: data?.role, suspended: data?.suspended === true, at: now }
    accountChecks.set(uid, account)
  }
  if (account.role !== role) throw new HttpsError('permission-denied', 'You cannot do this.')
  if (account.suspended) throw new HttpsError('permission-denied', 'Your account is suspended. Please contact support.')
}

/** For tests, which promote, demote and suspend the same uid between cases. */
export function clearAccountCache(): void {
  accountChecks.clear()
}

function hashOf(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value) ?? '').digest('hex')
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}
