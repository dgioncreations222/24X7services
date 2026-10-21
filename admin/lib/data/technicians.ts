'use client'

/**
 * Technicians: the list, one technician, their KYC documents, and what an
 * admin does about them — add a technician with their documents (the only
 * way in: there is no self sign-up), review documents, approve or reject,
 * suspend, make inactive and reactivate. Every decision that the technician
 * will read needs a reason in plain words.
 */
import { useSyncExternalStore } from 'react'
import { mockRequest } from '../mock/api'
import { read, subscribe, write, type MockDb } from '../mock/db'
import { currentAdmin } from './auth'
import { audit } from './audit'
import { bankKeyOf, digits, normalPhone } from '../identity'
import { useResource, type Query } from './query'
import type { AdminBooking, KycDocType, KycDocument, Partner, PartnerStatus, PayoutDestination } from './types'

export class PartnerError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PartnerError'
  }
}

export const KYC_DOC_TYPES: readonly KycDocType[] = ['aadhaar', 'pan', 'photo', 'bank']

export function usePartners(): Query<Partner[]> {
  return useResource((db) => db.partners)
}

/** One technician; `data` is null once loaded if there is no such id. */
export function usePartner(id: string | null | undefined): Query<Partner | null> {
  return useResource((db) => db.partners.find((p) => p.id === id) ?? null)
}

/** Their documents, in the order the review reads them. */
export function useKycDocs(partnerId: string | null | undefined): Query<KycDocument[]> {
  return useResource((db) =>
    db.kycDocs.filter((d) => d.partnerId === partnerId).sort((a, b) => KYC_DOC_TYPES.indexOf(a.type) - KYC_DOC_TYPES.indexOf(b.type))
  )
}

const queueOf = () => read().partners.filter((p) => p.status === 'kyc_pending').length

/** Applications waiting for review, for the sidebar badge. */
export function useKycQueueCount(): number {
  return useSyncExternalStore(subscribe, queueOf, () => 0)
}

/* --------------------------------------------------------------- Actions */

const REASON_MIN = 10

function reason(text: string | undefined, what: string) {
  const r = (text ?? '').trim()
  if (r.length < REASON_MIN) throw new PartnerError(`Say why ${what} — the technician reads this. At least ${REASON_MIN} characters.`)
  return r
}

function partner(db: MockDb, id: string) {
  const p = db.partners.find((x) => x.id === id)
  if (!p) throw new PartnerError('This technician no longer exists.')
  return p
}

function setPartner(id: string, patch: Partial<Partner>) {
  write((d) => ({ ...d, partners: d.partners.map((p) => (p.id === id ? { ...p, ...patch } : p)) }))
}

/** Who is deciding: the name to show and the id to keep. */
function reviewer() {
  const a = currentAdmin()
  return { reviewedBy: a?.name ?? 'Admin', reviewedById: a?.id ?? 'unknown' }
}

/**
 * Hand back the jobs a technician had accepted but not started, so dispatch
 * gives them to someone else. Jobs already under way stay with them.
 */
function releaseJobs(d: MockDb, partnerId: string, why: string): MockDb {
  const now = Date.now()
  const by = currentAdmin()?.name ?? 'Admin'
  return {
    ...d,
    bookings: d.bookings.map(
      (b): AdminBooking =>
        b.technicianId === partnerId && b.status === 'assigned'
          ? { ...b, status: 'confirmed', technicianId: undefined, timeline: [...b.timeline, { status: 'confirmed', at: now, by, note: `Back to dispatch: ${why}` }] }
          : b
    ),
  }
}

/** Unapproved payouts wait while the technician is suspended or inactive. */
function holdPayouts(d: MockDb, partnerId: string, hold: boolean): MockDb {
  const [from, to] = hold ? (['pending', 'on_hold'] as const) : (['on_hold', 'pending'] as const)
  return { ...d, payouts: d.payouts.map((p) => (p.partnerId === partnerId && p.status === from ? { ...p, status: to } : p)) }
}

const openJobsOf = (d: MockDb, partnerId: string) => d.bookings.filter((b) => b.technicianId === partnerId && b.status === 'assigned').length

/** Approve one document, or reject it with what to fix. */
export function reviewDoc(docId: string, decision: 'approved' | 'rejected', why?: string) {
  return mockRequest(() => {
    const doc = read().kycDocs.find((d) => d.id === docId)
    if (!doc) throw new PartnerError('This document is no longer there.')
    if (partner(read(), doc.partnerId).status !== 'kyc_pending') throw new PartnerError('Documents can only be reviewed while the application is waiting.')
    const rejectReason = decision === 'rejected' ? reason(why, 'this document is rejected') : undefined
    write((d) => ({
      ...d,
      kycDocs: d.kycDocs.map((x) => (x.id === docId ? { ...x, status: decision, rejectReason, ...reviewer(), reviewedAt: Date.now() } : x)),
    }))
    const p = partner(read(), doc.partnerId)
    audit('technicians', decision === 'approved' ? 'Approved document' : 'Rejected document', { target: `${p.name} · ${doc.type}`, new: rejectReason })
  })
}

/** Approve the application: every document must be approved first. */
export function approvePartner(id: string) {
  return mockRequest(() => {
    const db = read()
    const p = partner(db, id)
    if (p.status !== 'kyc_pending') throw new PartnerError('Only a waiting application can be approved.')
    const docs = db.kycDocs.filter((d) => d.partnerId === id)
    const notOk = KYC_DOC_TYPES.filter((t) => docs.find((d) => d.type === t)?.status !== 'approved')
    if (notOk.length) throw new PartnerError(`Approve every document first — ${notOk.length} still ${notOk.length === 1 ? 'needs' : 'need'} a look.`)
    // Maker-checker: whoever added a technician cannot also let them in.
    const me = currentAdmin()
    if (p.addedBy && me && p.addedBy.id === me.id && me.role !== 'Super Admin') throw new PartnerError('You added this technician, so another admin has to approve them.')
    setPartner(id, { status: 'approved', statusReason: undefined })
    audit('technicians', 'Approved technician', { target: p.name, old: 'KYC to review', new: 'Approved' })
  })
}

/**
 * Send the application back. Documents not yet reviewed are marked rejected
 * with the same reason, so the technician knows what to upload again.
 */
export function rejectPartner(id: string, why: string) {
  return mockRequest(() => {
    const p = partner(read(), id)
    if (p.status !== 'kyc_pending') throw new PartnerError('Only a waiting application can be rejected.')
    const r = reason(why, 'the application is rejected')
    const now = Date.now()
    write((d) => ({
      ...d,
      partners: d.partners.map((x) => (x.id === id ? { ...x, status: 'rejected' as PartnerStatus, statusReason: r } : x)),
      kycDocs: d.kycDocs.map((x) => (x.partnerId === id && x.status === 'pending' ? { ...x, status: 'rejected', rejectReason: r, ...reviewer(), reviewedAt: now } : x)),
    }))
    audit('technicians', 'Rejected application', { target: p.name, new: r })
  })
}

/**
 * Stop an active (or approved) technician getting jobs for a while; they go
 * offline at once and jobs they had not started go back to dispatch.
 * Resolves with how many jobs went back.
 */
export function suspendPartner(id: string, why: string) {
  return mockRequest(() => {
    const p = partner(read(), id)
    if (p.status !== 'active' && p.status !== 'approved') throw new PartnerError('Only an active technician can be suspended.')
    const r = reason(why, 'they are suspended')
    const released = openJobsOf(read(), id)
    write((d) => holdPayouts(releaseJobs({ ...d, partners: d.partners.map((x) => (x.id === id ? { ...x, status: 'suspended', statusReason: r, online: false, onJob: false } : x)) }, id, `${p.name} suspended`), id, true))
    audit('technicians', 'Suspended technician', { target: p.name, old: p.status, new: r })
    return released
  })
}

/**
 * Let a technician go. Not a ban: the account stays and can be reactivated,
 * but while they are inactive nobody can be added with their phone, email,
 * PAN, bank account or UPI. Resolves with how many jobs went back to dispatch.
 */
export function deactivatePartner(id: string, why: string) {
  return mockRequest(() => {
    const p = partner(read(), id)
    if (p.status === 'inactive') throw new PartnerError('Already inactive.')
    const r = reason(why, 'they are made inactive')
    const released = openJobsOf(read(), id)
    write((d) => holdPayouts(releaseJobs({ ...d, partners: d.partners.map((x) => (x.id === id ? { ...x, status: 'inactive', statusReason: r, online: false, onJob: false } : x)) }, id, `${p.name} made inactive`), id, true))
    audit('technicians', 'Made technician inactive', { target: p.name, old: p.status, new: r })
    return released
  })
}

/** Back to work: from suspended or inactive to active, on the same account. */
export function reactivatePartner(id: string) {
  return mockRequest(() => {
    const p = partner(read(), id)
    if (p.status !== 'suspended' && p.status !== 'inactive') throw new PartnerError('Only a suspended or inactive technician can be reactivated.')
    write((d) => holdPayouts({ ...d, partners: d.partners.map((x) => (x.id === id ? { ...x, status: 'active', statusReason: undefined } : x)) }, id, false))
    audit('technicians', 'Reactivated technician', { target: p.name, old: p.status === 'inactive' ? 'Inactive' : 'Suspended', new: 'Active' })
  })
}

/* ------------------------------------------------------ Adding a technician */

export { bankKeyOf, normalPhone }

export interface NewTechnician {
  name: string
  phone: string
  email: string
  city: string
  area: string
  skills: string[]
  experienceYears: number
  aadhaarLast4: string
  pan: string
  payout: { kind: 'bank'; accountName: string; accountNumber: string; ifsc: string } | { kind: 'upi'; upiId: string }
  /** Data URLs (or paths) of the four documents. */
  docs: Record<KycDocType, string | undefined>
  /** The admin checked that the names on Aadhaar, PAN and the bank account are this person's. */
  namesMatch: boolean
  /** The admin compared the person in front of them with the Aadhaar photo. */
  faceChecked: boolean
}

export interface Clash {
  field: 'phone' | 'email' | 'PAN' | 'bank account' | 'UPI'
  partner: Pick<Partner, 'id' | 'name' | 'status'>
}

/**
 * Anyone already on the network with the same phone, email, PAN, bank account
 * or UPI. An inactive technician's details stay here on purpose: someone who
 * was let go cannot come back under another person's documents while their
 * own phone, bank or UPI is the same.
 */
export function findClashes(partners: Partner[], input: Pick<NewTechnician, 'phone' | 'email' | 'pan' | 'payout'>): Clash[] {
  const phone = normalPhone(input.phone)
  const email = input.email.trim().toLowerCase()
  const pan = input.pan.trim().toUpperCase()
  const bank = input.payout.kind === 'bank' && input.payout.ifsc && digits(input.payout.accountNumber) ? bankKeyOf(input.payout.ifsc, input.payout.accountNumber) : ''
  const upi = input.payout.kind === 'upi' ? input.payout.upiId.trim().toLowerCase() : ''
  const out: Clash[] = []
  for (const p of partners) {
    const who = { id: p.id, name: p.name, status: p.status }
    if (phone && normalPhone(p.phone) === phone) out.push({ field: 'phone', partner: who })
    if (email && p.email.toLowerCase() === email) out.push({ field: 'email', partner: who })
    if (pan && p.pan === pan) out.push({ field: 'PAN', partner: who })
    if (bank && p.bankKey === bank) out.push({ field: 'bank account', partner: who })
    if (upi && p.payout?.kind === 'upi' && p.payout.upiId.toLowerCase() === upi) out.push({ field: 'UPI', partner: who })
  }
  return out
}

const PAN = /^[A-Z]{5}[0-9]{4}[A-Z]$/
const IFSC = /^[A-Z]{4}0[A-Z0-9]{6}$/
const UPI = /^[\w.-]{2,}@[a-z]{2,}$/i
const HYDERABAD = { lat: 17.385, lng: 78.4867 }

/**
 * Add a technician from the partner desk, with all four documents. They wait
 * in "KYC to review" for another admin. A clash with someone already on the
 * network stops it; only a Super Admin can save anyway (`override`).
 */
export function addTechnician(input: NewTechnician, override = false) {
  return mockRequest(() => {
    const db = read()
    const me = currentAdmin()
    if (!me) throw new PartnerError('Sign in again to add a technician.')
    const name = input.name.trim()
    const email = input.email.trim().toLowerCase()
    const phone = normalPhone(input.phone)
    const pan = input.pan.trim().toUpperCase()
    if (name.length < 3) throw new PartnerError('Enter their full name, as on the Aadhaar.')
    if (!phone || !/^\+91[6-9]/.test(phone)) throw new PartnerError('Enter a 10-digit Indian mobile number.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new PartnerError('Enter the email they will sign in with.')
    if (!input.city.trim() || !input.area.trim()) throw new PartnerError('Enter their city and base area.')
    if (!input.skills.length) throw new PartnerError('Pick at least one category they work in.')
    if (!/^\d{4}$/.test(input.aadhaarLast4)) throw new PartnerError('Enter the last 4 digits of the Aadhaar — never the full number.')
    if (!PAN.test(pan)) throw new PartnerError('PAN looks like ABCDE1234F.')
    let payout: PayoutDestination
    let bankKey: string | undefined
    if (input.payout.kind === 'bank') {
      const { accountName, accountNumber, ifsc } = input.payout
      if (accountName.trim().length < 3) throw new PartnerError('Enter the bank account holder’s name.')
      if (!/^\d{9,18}$/.test(digits(accountNumber))) throw new PartnerError('Account number should be 9 to 18 digits.')
      if (!IFSC.test(ifsc.toUpperCase())) throw new PartnerError('IFSC looks like HDFC0001234.')
      payout = { kind: 'bank', accountName: accountName.trim(), accountLast4: digits(accountNumber).slice(-4), ifsc: ifsc.toUpperCase() }
      bankKey = bankKeyOf(ifsc, accountNumber)
    } else {
      if (!UPI.test(input.payout.upiId.trim())) throw new PartnerError('UPI ID looks like name@okhdfc.')
      payout = { kind: 'upi', upiId: input.payout.upiId.trim().toLowerCase() }
    }
    const missing = KYC_DOC_TYPES.filter((t) => !input.docs[t])
    if (missing.length) throw new PartnerError(`Upload all four documents — ${missing.length} missing.`)
    if (!input.namesMatch) throw new PartnerError('Check that the names on Aadhaar, PAN and the bank account are the same person, and tick the box.')
    if (!input.faceChecked) throw new PartnerError('Match their face with the Aadhaar photo, and tick the box.')

    const clashes = findClashes(db.partners, { ...input, phone, email, pan })
    if (clashes.length && !(override && me.role === 'Super Admin')) {
      const c = clashes[0]!
      const away = c.partner.status === 'inactive' || c.partner.status === 'suspended'
      throw new PartnerError(
        `This ${c.field} already belongs to ${c.partner.name} (${c.partner.status}).${away ? ' Reactivate their account instead of adding a new one.' : ''}${me.role === 'Super Admin' ? '' : ' Only a Super Admin can save anyway.'}`
      )
    }

    let n = db.partners.length + 1
    while (db.partners.some((p) => p.id === `TCH-HYD-${String(n).padStart(4, '0')}`)) n++
    const id = `TCH-HYD-${String(n).padStart(4, '0')}`
    const now = Date.now()
    const added: Partner = {
      id,
      name,
      phone,
      email,
      city: input.city.trim(),
      area: input.area.trim(),
      skills: input.skills,
      experienceYears: input.experienceYears,
      status: 'kyc_pending',
      online: false,
      onJob: false,
      rating: 0,
      ratingCount: 0,
      completedJobs: 0,
      acceptanceRate: 0,
      onTimeRate: 0,
      cancelRate: 0,
      jobs30: 0,
      earnings30: 0,
      payout,
      createdAt: now,
      submittedAt: now,
      geo: HYDERABAD,
      aadhaarLast4: input.aadhaarLast4,
      pan,
      bankKey,
      addedBy: { id: me.id, name: me.name },
    }
    const docs: KycDocument[] = KYC_DOC_TYPES.map((type) => ({ id: `${id}-${type}`, partnerId: id, type, fileUrl: input.docs[type]!, status: 'pending', uploadedAt: now }))
    write((d) => ({ ...d, partners: [added, ...d.partners], kycDocs: [...docs, ...d.kycDocs] }))
    audit('technicians', clashes.length ? 'Added technician (clash overridden)' : 'Added technician', {
      target: `${name} · ${id}`,
      new: clashes.map((c) => `${c.field} of ${c.partner.name}`).join(', ') || undefined,
    })
    // TODO(backend): a Cloud Function creates their sign-in account with the
    // partner claim and emails a set-password link; documents go to Storage
    // under partners/{id}/kyc/, never into the Firestore document.
    return added
  })
}

/** Which categories they may take jobs in. At least one. */
export function setPartnerSkills(id: string, skills: string[]) {
  return mockRequest(() => {
    if (!skills.length) throw new PartnerError('A technician needs at least one category.')
    const known = new Set(read().categories.map((c) => c.id))
    setPartner(partner(read(), id).id, { skills: skills.filter((s) => known.has(s)) })
  })
}
