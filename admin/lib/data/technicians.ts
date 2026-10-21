'use client'

/**
 * Technicians: the list, one technician, their KYC documents, and what an
 * admin does about them — review documents, approve or reject an
 * application, suspend and reactivate. Every decision that the technician
 * will read needs a reason in plain words.
 */
import { useSyncExternalStore } from 'react'
import { mockRequest } from '../mock/api'
import { read, subscribe, write, type MockDb } from '../mock/db'
import { currentAdmin } from './auth'
import { useResource, type Query } from './query'
import type { KycDocType, KycDocument, Partner, PartnerStatus } from './types'

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

const reviewer = () => currentAdmin()?.name ?? 'Admin'

/** Approve one document, or reject it with what to fix. */
export function reviewDoc(docId: string, decision: 'approved' | 'rejected', why?: string) {
  return mockRequest(() => {
    const doc = read().kycDocs.find((d) => d.id === docId)
    if (!doc) throw new PartnerError('This document is no longer there.')
    if (partner(read(), doc.partnerId).status !== 'kyc_pending') throw new PartnerError('Documents can only be reviewed while the application is waiting.')
    const rejectReason = decision === 'rejected' ? reason(why, 'this document is rejected') : undefined
    write((d) => ({
      ...d,
      kycDocs: d.kycDocs.map((x) => (x.id === docId ? { ...x, status: decision, rejectReason, reviewedBy: reviewer(), reviewedAt: Date.now() } : x)),
    }))
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
    setPartner(id, { status: 'approved', statusReason: undefined })
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
      kycDocs: d.kycDocs.map((x) => (x.partnerId === id && x.status === 'pending' ? { ...x, status: 'rejected', rejectReason: r, reviewedBy: reviewer(), reviewedAt: now } : x)),
    }))
  })
}

/** Stop an active (or approved) technician getting jobs; they go offline at once. */
export function suspendPartner(id: string, why: string) {
  return mockRequest(() => {
    const p = partner(read(), id)
    if (p.status !== 'active' && p.status !== 'approved') throw new PartnerError('Only an active technician can be suspended.')
    setPartner(id, { status: 'suspended', statusReason: reason(why, 'they are suspended'), online: false, onJob: false })
  })
}

export function reactivatePartner(id: string) {
  return mockRequest(() => {
    if (partner(read(), id).status !== 'suspended') throw new PartnerError('Only a suspended technician can be reactivated.')
    setPartner(id, { status: 'active', statusReason: undefined })
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
