import { db } from './admin'

/**
 * Feature flags: switches for the features that cost money per use, plus the
 * App Check switch. They live in one document, config/flags, which every app
 * may read and only the backend writes (see firestore.rules).
 *
 * A missing document or a missing field means the default below, so the
 * flags never have to be seeded for the app to work, and a flag added later
 * does not need a migration.
 */
export const FLAG_DEFAULTS = {
  /** Address search, map pins and route ETAs. The largest variable cost. */
  maps: true,
  /** Live technician location during a job. */
  tracking: true,
  /** WhatsApp messages (paid per message). */
  whatsapp: true,
  /** SMS fallback (paid per message). */
  sms: true,
  /** Online UPI payment. Off until a payment gateway is chosen. */
  onlinePayments: false,
  /**
   * Reject calls that carry no valid App Check token. Off means monitor mode:
   * such calls are logged and allowed. Kept as a flag so it can be dropped
   * back to monitor mode in an emergency without a deploy.
   */
  appCheckEnforce: false,
}

export type FlagName = keyof typeof FLAG_DEFAULTS
export type Flags = typeof FLAG_DEFAULTS

/** The flags the budget kill-switch turns off. */
export const KILLABLE_FLAGS: readonly FlagName[] = ['maps', 'tracking', 'whatsapp', 'sms']

export const FLAGS_DOC = 'config/flags'

/**
 * The flags are read on every callable (App Check) and change rarely, so one
 * read per instance per minute is enough. A change, including a kill-switch,
 * reaches every instance within CACHE_MS.
 */
const CACHE_MS = 60_000
let cached: { flags: Flags; at: number } | undefined

export async function getFlags(now = Date.now()): Promise<Flags> {
  if (cached && now - cached.at < CACHE_MS) return cached.flags
  const snap = await db().doc(FLAGS_DOC).get()
  const flags = mergeFlags(snap.data())
  cached = { flags, at: now }
  return flags
}

/** Overlays the stored values on the defaults, ignoring anything not boolean. */
export function mergeFlags(stored: Record<string, unknown> | undefined): Flags {
  const flags = { ...FLAG_DEFAULTS }
  for (const name of Object.keys(FLAG_DEFAULTS) as FlagName[]) {
    const value = stored?.[name]
    if (typeof value === 'boolean') flags[name] = value
  }
  return flags
}

/** For tests, which change the document between cases. */
export function clearFlagCache(): void {
  cached = undefined
}
