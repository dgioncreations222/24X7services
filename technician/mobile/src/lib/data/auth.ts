/**
 * Sign-in, registration and KYC. Google or email + password only — there is
 * no OTP anywhere. Backed by lib/mock/auth until Firebase Auth replaces it.
 */
import { useSyncExternalStore } from 'react'
import { mockRequest, mockUpload } from '../mock/api'
import { GOOGLE_DEMO_EMAIL, readAuth, scheduleReviews, subscribeAuth, updateCurrent, writeAuth, type AuthState } from '../mock/auth'
import { useResource, type Query } from './query'
import type { Category, KycDocType, KycDocument, PayoutDetails, Registration, Session } from './types'

/** A sign-in or form problem worth showing under the field, in plain words. */
export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

function sessionOf(s: AuthState): Session {
  const a = s.current ? s.accounts[s.current] : undefined
  if (!a) return { status: 'signed_out' }
  const base = { email: a.email, name: a.registration?.name, provider: a.provider }
  if (!a.registration) return { ...base, status: 'registering' }
  switch (a.status) {
    case 'applied':
      return { ...base, status: 'kyc_required' }
    case 'kyc_pending':
      return { ...base, status: 'kyc_pending' }
    case 'rejected':
      return { ...base, status: 'kyc_rejected', rejectReason: a.rejectReason }
    case 'approved':
      return { ...base, status: 'approved' }
    case 'suspended':
      return { ...base, status: 'suspended' }
    case 'inactive':
      return { ...base, status: 'inactive' }
    default:
      return { ...base, status: 'active' }
  }
}

let cached: { state: AuthState; session: Session } | null = null
function snapshot(): Session {
  const s = readAuth()
  if (cached?.state !== s) cached = { state: s, session: sessionOf(s) }
  return cached.session
}

/**
 * Who is signed in and how far through onboarding. Restored from the device
 * at launch with no network wait, so the splash can route straight away.
 */
export function useSession(): Session {
  return useSyncExternalStore(subscribeAuth, snapshot, snapshot)
}

const NO_ACCOUNT = 'No partner account uses this email. The partner desk adds new technicians — visit or call them to join.'

/** Only accounts an admin created can sign in; the first email sign-in sets the password. */
function signInAs(email: string, password?: string) {
  const existing = readAuth().accounts[email]
  if (!existing) throw new AuthError(NO_ACCOUNT)
  writeAuth((s) => ({
    accounts: { ...s.accounts, [email]: password && !existing.password ? { ...existing, password } : existing },
    current: email,
  }))
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Email + password, for an account the partner desk created. */
export function signInWithEmail(email: string, password: string) {
  const e = email.trim().toLowerCase()
  return mockRequest(() => {
    if (!EMAIL.test(e)) throw new AuthError('Enter a valid email address.')
    if (password.length < 6) throw new AuthError('Password must be at least 6 characters.')
    const known = readAuth().accounts[e]
    if (known?.password && known.password !== password) throw new AuthError('Wrong password. Try again or reset it.')
    signInAs(e, password)
  })
}

/** "Continue with Google". The mock signs in as one demo Google account. */
export function signInWithGoogle() {
  return mockRequest(() => signInAs(GOOGLE_DEMO_EMAIL))
}

/** Sends a reset link (mock: only checks the address is valid). */
export function sendPasswordReset(email: string) {
  return mockRequest(() => {
    if (!EMAIL.test(email.trim())) throw new AuthError('Enter a valid email address.')
  })
}

/** Change the password of an email account; the current one must match. */
export function changePassword(current: string, next: string) {
  return mockRequest(() => {
    const s = readAuth()
    const a = s.current ? s.accounts[s.current] : undefined
    if (!a || a.provider !== 'email') throw new AuthError('This account signs in with Google, so it has no password here.')
    if (a.password && a.password !== current) throw new AuthError('The current password is wrong.')
    if (next.length < 6) throw new AuthError('The new password needs at least 6 characters.')
    if (next === current) throw new AuthError('Pick a password different from the current one.')
    updateCurrent((x) => ({ ...x, password: next }))
  })
}

/** Signs out on this device. Like Firebase Auth's signOut, it needs no network. */
export async function signOut() {
  writeAuth((s) => ({ ...s, current: null }))
}

/* ---------------------------------------------------------- Registration */

const PHONE = /^[6-9]\d{9}$/

export function register(input: Registration) {
  return mockRequest(() => {
    const phone = input.phone.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '')
    if (input.name.trim().length < 2) throw new AuthError('Enter your full name.')
    if (!PHONE.test(phone)) throw new AuthError('Enter a 10-digit mobile number.')
    if (!input.city) throw new AuthError('Pick your city.')
    if (input.skills.length === 0) throw new AuthError('Pick at least one service you do.')
    updateCurrent((a) => ({ ...a, registration: { ...input, name: input.name.trim(), phone: `+91${phone}` }, status: 'applied' }))
  })
}

/** TODO(catalog-v2): read from Member 1's categories. */
const CATEGORIES: Category[] = [
  { id: 'ac', name: 'AC' },
  { id: 'washer', name: 'Washing Machine' },
  { id: 'fridge', name: 'Refrigerator' },
  { id: 'geyser', name: 'Geyser' },
  { id: 'oven', name: 'Microwave / Oven' },
]
const CITIES = ['Hyderabad', 'Bengaluru', 'Chennai', 'Pune', 'Mumbai', 'Delhi NCR']

export function useCategories(): Query<Category[]> {
  return useResource(() => CATEGORIES)
}

export function useCities(): Query<string[]> {
  return useResource(() => CITIES)
}

/* ------------------------------------------------------------------ KYC */

export interface KycState {
  documents: Partial<Record<KycDocType, KycDocument>>
  payout?: PayoutDetails
  rejectReason?: string
}

/** The signed-in applicant's documents so far. */
export function useKyc(): KycState {
  const s = useSyncExternalStore(subscribeAuth, readAuth, readAuth)
  const a = s.current ? s.accounts[s.current] : undefined
  return { documents: a?.documents ?? {}, payout: a?.payout, rejectReason: a?.rejectReason }
}

/** Upload one KYC photo; `onProgress` gets 0–1. Replaces an earlier one of the same type. */
export async function uploadKycDocument(type: KycDocType, fileUrl: string, onProgress?: (fraction: number) => void) {
  await mockUpload(onProgress)
  const doc: KycDocument = { type, fileUrl, status: 'uploaded', uploadedAt: Date.now() }
  updateCurrent((a) => ({ ...a, documents: { ...a.documents, [type]: doc } }))
  return doc
}

const IFSC = /^[A-Z]{4}0[A-Z0-9]{6}$/
const UPI = /^[\w.-]{2,}@[a-z]{2,}$/i
export const REQUIRED_DOCS: readonly KycDocType[] = ['aadhaar', 'pan', 'photo']

/** Send documents and payout details for review. */
export function submitKyc(payout: PayoutDetails) {
  return mockRequest(() => {
    const docs = readAuth().current ? readAuth().accounts[readAuth().current!]!.documents : {}
    const missing = REQUIRED_DOCS.filter((d) => !docs[d])
    if (missing.length) throw new AuthError('Upload every document first.')
    if ('upiId' in payout) {
      if (!UPI.test(payout.upiId.trim())) throw new AuthError('Enter a UPI ID like name@okhdfc.')
    } else {
      if (payout.accountName.trim().length < 2) throw new AuthError('Enter the account holder’s name.')
      if (!/^\d{9,18}$/.test(payout.accountNumber)) throw new AuthError('Account number should be 9 to 18 digits.')
      if (!IFSC.test(payout.ifsc.toUpperCase())) throw new AuthError('IFSC looks like HDFC0001234.')
    }
    updateCurrent((a) => ({
      ...a,
      payout,
      status: 'kyc_pending',
      submittedAt: Date.now(),
      rejectReason: undefined,
      documents: Object.fromEntries(Object.entries(a.documents).map(([k, d]) => [k, { ...d, status: 'pending' }])),
    }))
    scheduleReviews()
  })
}

/** After approval: the first step into the app (Approved → Active). */
export function startWorking() {
  return mockRequest(() => updateCurrent((a) => ({ ...a, status: 'active' })))
}
