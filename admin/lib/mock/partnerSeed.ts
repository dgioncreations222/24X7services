/**
 * The technicians for the mock, from the old console's seed reshaped into the
 * shared Partner proposal, with their KYC documents. Applicants have
 * documents waiting for review; one rejected applicant shows a reason.
 */
import { seed } from '../seed'
import type { KycDocType, KycDocument, Partner, PartnerStatus } from '../data/types'
import type { Technician } from '../types'

const DAY = 86_400_000
const DOC_TYPES: KycDocType[] = ['aadhaar', 'pan', 'photo', 'bank']

const STATUS: Record<Technician['kyc'], PartnerStatus> = {
  verified: 'active',
  pending: 'kyc_pending',
  rejected: 'rejected',
  suspended: 'suspended',
}

const REASONS: Partial<Record<PartnerStatus, string>> = {
  rejected: 'PAN card photo is blurred — the number cannot be read. Upload a clearer photo.',
  suspended: 'Three customer complaints about extra charges in one week. Under review by operations.',
}

export function seedPartners(now = Date.now()) {
  const base = seed(now)
  const partners: Partner[] = base.technicians.map((t, i) => {
    const status = STATUS[t.kyc]
    const done30 = base.bookings.filter((b) => b.technicianId === t.id && b.status === 'completed' && now - new Date(b.scheduledAt).getTime() < 30 * DAY)
    const created = new Date(t.joinedAt).getTime()
    return {
      id: t.id,
      name: t.name,
      phone: t.phone,
      email: t.email,
      city: 'Hyderabad',
      area: t.area,
      // The old seed's appliance ids are the catalog's category ids.
      skills: [...t.appliances],
      experienceYears: t.experienceYears,
      status,
      online: status === 'active' && t.presence !== 'offline',
      onJob: status === 'active' && t.presence === 'on_job',
      rating: t.rating,
      ratingCount: t.ratingCount,
      completedJobs: t.completedJobs,
      acceptanceRate: t.acceptanceRate,
      onTimeRate: t.onTimeRate,
      cancelRate: status === 'active' || status === 'suspended' ? (i * 7) % 9 : 0,
      jobs30: done30.length,
      earnings30: Math.round(done30.reduce((s, b) => s + b.amount, 0) * 0.8 * 100),
      payout: { kind: 'bank', accountName: t.name, accountLast4: String(4100 + ((i * 373) % 900)), ifsc: 'HDFC0001922' },
      statusReason: REASONS[status],
      createdAt: created,
      geo: { lat: t.lat, lng: t.lng },
      submittedAt: status === 'kyc_pending' || status === 'rejected' ? now - (i % 4 + 1) * 3 * 3_600_000 : created,
    }
  })

  const kycDocs: KycDocument[] = partners.flatMap((p) =>
    DOC_TYPES.map((type): KycDocument => {
      const reviewed = p.status !== 'kyc_pending'
      const rejected = p.status === 'rejected' && type === 'pan'
      return {
        id: `${p.id}-${type}`,
        partnerId: p.id,
        type,
        fileUrl: `/media/kyc/${type}.svg`,
        status: !reviewed ? 'pending' : rejected ? 'rejected' : 'approved',
        rejectReason: rejected ? 'Photo is blurred — the PAN number cannot be read.' : undefined,
        reviewedBy: reviewed ? 'Vivek Menon' : undefined,
        uploadedAt: p.submittedAt ?? p.createdAt,
        reviewedAt: reviewed ? (p.submittedAt ?? p.createdAt) + DAY : undefined,
      }
    })
  )

  return { partners, kycDocs }
}
