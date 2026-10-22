/**
 * Mock accounts and sign-in, kept on the device (lib/storage) so a reload
 * keeps you signed in the way Firebase Auth would. Firebase Auth replaces
 * this file; lib/data/auth.ts keeps its shape.
 *
 * Technicians do not sign themselves up: an admin adds them in the console,
 * with their documents, and they sign in with the email the admin used.
 *
 * - The seeded technician (ravi.naidu@…) is active. Their first email
 *   sign-in sets the password (the invite link's job); after that it must match.
 * - new.partner@gmail.com (also "Continue with Google") was added by an
 *   admin and waits for KYC review, which ends after REVIEW_MS: approved,
 *   unless the dev switch says reject.
 * - Any other email is refused: there is no account for it.
 */
import { kv } from '../storage'
import { TECHNICIAN } from '../seed'
import type { KycDocType, KycDocument, PartnerStatus, Registration } from '../data/types'

// v2: accounts are added by an admin; v1 saves held self-registered applicants.
const KEY = 'partner.auth.v2'
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
  // Checked when they joined; the files themselves stay with the admin.
  documents: Object.fromEntries(
    (['aadhaar', 'pan', 'photo', 'bank'] as const).map((type) => [type, { type, fileUrl: '', status: 'approved', uploadedAt: Date.parse('2019-03-04') }])
  ),
  payout: { accountName: TECHNICIAN.name, accountNumber: '50100234184471', ifsc: 'HDFC0001922' },
}

/** Added by an admin with their documents; waiting for another admin's review. */
const ADDED: Account = {
  email: GOOGLE_DEMO_EMAIL,
  provider: 'google',
  status: 'kyc_pending',
  registration: { name: 'Salman Qureshi', phone: '+919849012345', city: 'Hyderabad', skills: ['ac', 'fridge'], experienceYears: 3 },
  documents: Object.fromEntries(
    (['aadhaar', 'pan', 'photo', 'bank'] as const).map((type) => [type, { type, fileUrl: '', status: 'pending', uploadedAt: Date.now() }])
  ),
  payout: { upiId: 'salman.q@okhdfc' },
  submittedAt: Date.now(),
}

const seededAccounts = (): Record<string, Account> => ({ [SEEDED.email]: SEEDED, [ADDED.email]: { ...ADDED, submittedAt: Date.now() } })

function load(): AuthState {
  try {
    const raw = kv.getItem(KEY)
    if (raw) return JSON.parse(raw) as AuthState
  } catch {
    /* storage unavailable — start signed out */
  }
  return { accounts: seededAccounts(), current: null }
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

/** Back to the seeded accounts, signed out — for the dev screen. */
export function resetMockAuth() {
  writeAuth(() => ({ accounts: seededAccounts(), current: null }))
}

scheduleReviews()
