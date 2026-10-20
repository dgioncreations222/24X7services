'use client'

/**
 * Console sign-in: Google or email + password, and only for admin accounts.
 * Backed by lib/mock/auth until Firebase Auth (with an admin claim) replaces it.
 */
import { useSyncExternalStore } from 'react'
import { mockRequest } from '../mock/api'
import { GOOGLE_DEMO_EMAIL, NON_ADMIN_EMAILS, readStoredSession, subscribeSession, writeStoredSession, type StoredSession } from '../mock/auth'
import { read, subscribe } from '../mock/db'
import type { AdminAccount, AdminSession } from './types'

/** A sign-in problem worth showing on the form, in plain words. */
export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

const LOADING: AdminSession = { status: 'loading' }
const SIGNED_OUT: AdminSession = { status: 'signed_out' }

const findAdmin = (email: string): AdminAccount | undefined => read().admins.find((a) => a.email === email)

let cached: { stored: StoredSession | null; admins: AdminAccount[]; session: AdminSession } | null = null

/** A saved session stays good only while its admin is still active. */
function snapshot(): AdminSession {
  const stored = readStoredSession()
  const admins = read().admins
  if (cached?.stored !== stored || cached.admins !== admins) {
    const admin = stored ? admins.find((a) => a.email === stored.email) : undefined
    const session: AdminSession = stored && admin?.status === 'active' ? { status: 'signed_in', admin, provider: stored.provider } : SIGNED_OUT
    cached = { stored, admins, session }
  }
  return cached.session
}

function subscribeAll(listener: () => void) {
  const a = subscribeSession(listener)
  const b = subscribe(listener)
  return () => {
    a()
    b()
  }
}

/**
 * Who is signed in. `loading` on the server and for the first render in the
 * browser, so the static page and the hydrated one match.
 */
export function useAdminSession(): AdminSession {
  return useSyncExternalStore(subscribeAll, snapshot, () => LOADING)
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function admit(email: string, provider: StoredSession['provider']) {
  const kind = NON_ADMIN_EMAILS[email]
  if (kind) throw new AuthError(`This is a ${kind} account. The console is for admin staff only.`)
  const admin = findAdmin(email)
  if (!admin) throw new AuthError('No admin account uses this email. Ask a Super Admin to invite you.')
  if (admin.status === 'disabled') throw new AuthError('This admin account is disabled. Ask a Super Admin to turn it back on.')
  if (admin.status === 'invited') throw new AuthError('Accept your invite email first, then sign in here.')
  writeStoredSession({ email, provider, at: Date.now() })
  return admin
}

export function signInWithEmail(email: string, password: string) {
  const e = email.trim().toLowerCase()
  return mockRequest(() => {
    if (!EMAIL.test(e)) throw new AuthError('Enter a valid email address.')
    if (password.length < 6) throw new AuthError('Password must be at least 6 characters.')
    return admit(e, 'email')
  })
}

/** "Continue with Google". The mock signs in as one demo Google account. */
export function signInWithGoogle() {
  return mockRequest(() => admit(GOOGLE_DEMO_EMAIL, 'google'))
}

export function signOut() {
  return mockRequest(() => writeStoredSession(null))
}
