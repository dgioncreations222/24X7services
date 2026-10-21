/**
 * Mock sign-in for the console, kept on the device so a reload keeps the
 * admin signed in the way Firebase Auth would. Firebase Auth (with an
 * `admin` custom claim) replaces this file; lib/data/auth.ts keeps its shape.
 *
 * - Every active admin in the seed signs in with any 6+ character password.
 * - "Continue with Google" signs in as the seeded Super Admin.
 * - Partner and customer accounts are known but refused: the console is for
 *   admins only.
 */

const KEY = 'admin.auth.v1'

export const GOOGLE_DEMO_EMAIL = 'aditi.rao@customerservice.example'

/** Accounts that exist on the platform but are not staff. */
export const NON_ADMIN_EMAILS: Record<string, 'partner' | 'customer'> = {
  'ravi.naidu@customerservice.example': 'partner',
  'new.partner@gmail.com': 'partner',
  'priya.reddy@gmail.com': 'customer',
}

export interface StoredSession {
  email: string
  provider: 'google' | 'email'
  at: number
}

let current: StoredSession | null | undefined
const listeners = new Set<() => void>()

/** The saved session, read from the device the first time it is asked for. */
export function readStoredSession(): StoredSession | null {
  if (current === undefined) {
    try {
      const raw = localStorage.getItem(KEY)
      current = raw ? (JSON.parse(raw) as StoredSession) : null
    } catch {
      current = null
    }
  }
  return current
}

export function writeStoredSession(next: StoredSession | null) {
  current = next
  try {
    if (next) localStorage.setItem(KEY, JSON.stringify(next))
    else localStorage.removeItem(KEY)
  } catch {
    /* storage blocked — the session still holds until reload */
  }
  listeners.forEach((l) => l())
}

export function subscribeSession(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
