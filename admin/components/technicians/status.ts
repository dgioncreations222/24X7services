import type { KycDocType, KycDocument, Partner, PartnerStatus } from '@/lib/data'
import type { Tone } from '@/lib/status'

export const PARTNER_STATUS: Record<PartnerStatus, { label: string; tone: Tone }> = {
  applied: { label: 'Registering', tone: 'neutral' },
  kyc_pending: { label: 'KYC to review', tone: 'warning' },
  approved: { label: 'Approved · not started', tone: 'info' },
  rejected: { label: 'Rejected', tone: 'danger' },
  active: { label: 'Active', tone: 'success' },
  suspended: { label: 'Suspended', tone: 'danger' },
}

export const DOC_LABEL: Record<KycDocType, string> = {
  aadhaar: 'Aadhaar card',
  pan: 'PAN card',
  photo: 'Photo',
  bank: 'Bank proof',
}

export const DOC_STATUS: Record<KycDocument['status'], { label: string; tone: Tone }> = {
  pending: { label: 'To review', tone: 'warning' },
  approved: { label: 'Approved', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'danger' },
}

/** Online · On a job · Offline — only meaningful for an active technician. */
export function presence(p: Partner): { label: string; dot: string } {
  if (p.status !== 'active') return { label: '—', dot: 'bg-line-strong' }
  if (p.onJob) return { label: 'On a job', dot: 'bg-violet' }
  return p.online ? { label: 'Online', dot: 'bg-success' } : { label: 'Offline', dot: 'bg-faint' }
}
