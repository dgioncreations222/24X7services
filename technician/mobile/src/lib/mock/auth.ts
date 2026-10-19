/**
 * Mock accounts and sign-in, kept on the device (lib/storage) so a reload
 * keeps you signed in the way Firebase Auth would. Firebase Auth replaces
 * this file; lib/data/auth.ts keeps its shape.
 *
 * - The seeded technician (ravi.naidu@…) signs in with any 6+ character
 *   password and is already active.
 * - Any other email, or Google, creates a new applicant on first sign-in,
 *   who then registers and uploads KYC.
 * - A submitted KYC is "reviewed" after REVIEW_MS: approved, unless the dev
 *   switch says reject.
 */
import { kv } from '../storage'
import { TECHNICIAN } from '../seed'
import type { KycDocType, KycDocument, PartnerStatus, Registration } from '../data/types'

const KEY = 'partner.auth.v1'
export const REVIEW_MS = 8_000
export const GOOGLE_DEMO_EMAIL = 'new.partner@gmail.com'

export interface Account {
  email: string
  password?: string
  provider: 'google' | 'email'
  status: PartnerStatus
  registration?: Registration
  documents: Partial<Record<KycDocType, KycDocument>>
  payout?: { accountName: string; accountNumber: string; ifsc: string } | { upiId: string }
  submittedAt?: number
  rejectReason?: string
}

export interface AuthState {
  accounts: Record<string, Account>
  current: string | null
}

const SEEDED: Account = {
  email: TECHNICIAN.email,
  provider: 'email',
  status: 'active',
  registration: { name: TECHNICIAN.name, phone: TECHNICIAN.phone, city: 'Hyderabad', skills: ['washer', 'fridge', 'oven', 'ac', 'geyser'], experienceYears: TECHNICIAN.experienceYears },
  documents: {},
}

function load(): AuthState {
  try {
    const raw = kv.getItem(KEY)
    if (raw) return JSON.parse(raw) as AuthState
  } catch {
    /* storage unavailable — start signed out */
  }
  return { accounts: { [SEEDED.email]: SEEDED }, current: null }
}

let state: AuthState = load()
const listeners = new Set<() => void>()
let reviewOutcome: 'approve' | 'reject' = 'approve'

export function readAuth(): AuthState {
  return state
}

export function subscribeAuth(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function writeAuth(next: (s: AuthState) => AuthState) {
  state = next(state)
  try {
    kv.setItem(KEY, JSON.stringify(state))
  } catch {
    /* quota — the session still works until reload */
  }
  listeners.forEach((l) => l())
}

/** Change the signed-in account with `fn`. */
export function updateCurrent(fn: (a: Account) => Account) {
  writeAuth((s) => (s.current && s.accounts[s.current] ? { ...s, accounts: { ...s.accounts, [s.current]: fn(s.accounts[s.current]!) } } : s))
}

/** Dev switch: how the next KYC review ends. */
export function setMockKycOutcome(outcome: 'approve' | 'reject') {
  reviewOutcome = outcome
}

export function getMockKycOutcome() {
  return reviewOutcome
}

/** Decide every review whose time is up, and set a timer for the rest. */
export function scheduleReviews() {
  for (const a of Object.values(state.accounts)) {
    if (a.status !== 'kyc_pending' || !a.submittedAt) continue
    const left = a.submittedAt + REVIEW_MS - Date.now()
    const decide = () =>
      writeAuth((s) => {
        const acc = s.accounts[a.email]
        if (!acc || acc.status !== 'kyc_pending') return s
        const approved = reviewOutcome === 'approve'
        const next: Account = approved
          ? { ...acc, status: 'approved', rejectReason: undefined }
          : { ...acc, status: 'rejected', rejectReason: 'Your PAN photo is blurry. Upload a clear photo where all four corners show.' }
        return { ...s, accounts: { ...s.accounts, [a.email]: next } }
      })
    if (left <= 0) decide()
    else setTimeout(decide, left)
  }
}

/** Back to the seeded technician only, signed out — for the dev screen. */
export function resetMockAuth() {
  writeAuth(() => ({ accounts: { [SEEDED.email]: SEEDED }, current: null }))
}

scheduleReviews()
