'use client'

import { useState } from 'react'
import { Check, Maximize2, ShieldCheck, X } from 'lucide-react'
import { FormError, useAction } from '@/components/catalog/parts'
import { Async, Button, Chip, Modal, SectionLabel, SkeletonRows } from '@/components/ui'
import { approvePartner, isOwnAddition, rejectPartner, reviewDoc, useAdminSession, useCan, useKycDocs, type KycDocument, type Partner } from '@/lib/data'
import { dateTime } from '@/lib/format'
import { DOC_LABEL, DOC_STATUS } from './status'
import { ReasonModal } from './ReasonModal'

const DOC_REASONS = ['Photo is blurred — the text cannot be read.', 'Name does not match the application.', 'Document is cut off at the edges.', 'This is not the right document.']
const APP_REASONS = ['Documents could not be verified. Please upload clear photos again.', 'Name on the documents does not match the registration.', 'We are not onboarding technicians in your area yet.']

/**
 * The KYC review: each document beside its status, approve or reject it (with
 * what to fix), then approve or send back the whole application.
 */
export function KycReview({ partner: p }: { partner: Partner }) {
  const docs = useKycDocs(p.id)
  const can = useCan()
  const reviewing = p.status === 'kyc_pending' && can('technicians', 'approve')
  const session = useAdminSession()
  const me = session.status === 'signed_in' ? session.admin : null
  // Maker-checker: the admin who added them reviews nothing (a Super Admin may).
  const selfAdded = isOwnAddition(p, me)
  const [rejecting, setRejecting] = useState<KycDocument | 'application' | null>(null)
  const [viewing, setViewing] = useState<KycDocument | null>(null)
  const { run, busy, error } = useAction()

  return (
    <Async query={docs} loading={<SkeletonRows rows={2} />}>
      {(list) => {
        const open = list.filter((d) => d.status !== 'approved').length
        return (
          <>
            {p.status === 'rejected' && p.statusReason && (
              <p className="mb-4 rounded-lg border border-danger/25 bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">Sent back: {p.statusReason}</p>
            )}
            <SectionLabel>Documents{p.submittedAt ? ` · sent ${dateTime(new Date(p.submittedAt).toISOString())}` : ''}</SectionLabel>
            <ul className="grid gap-3 sm:grid-cols-2">
              {list.map((d) => (
                <li key={d.id} className="overflow-hidden rounded-card border border-line">
                  <button type="button" onClick={() => setViewing(d)} className="group relative block w-full bg-canvas" aria-label={`Open ${DOC_LABEL[d.type]} full size`}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- static export */}
                    <img src={d.fileUrl} alt={DOC_LABEL[d.type]} className="h-36 w-full object-contain p-2" />
                    <Maximize2 className="absolute right-2 top-2 size-4 text-muted opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                  </button>
                  <div className="space-y-2 border-t border-line p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold">{DOC_LABEL[d.type]}</p>
                      <Chip tone={DOC_STATUS[d.status].tone}>{DOC_STATUS[d.status].label}</Chip>
                    </div>
                    {d.rejectReason && <p className="text-xs font-semibold text-danger">{d.rejectReason}</p>}
                    {d.reviewedBy && d.status !== 'pending' && <p className="text-[11px] text-muted">by {d.reviewedBy}</p>}
                    {reviewing && !selfAdded && d.status !== 'approved' && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="success" disabled={busy} onClick={() => void run(() => reviewDoc(d.id, 'approved'), `${DOC_LABEL[d.type]} approved`)}>
                          <Check /> Approve
                        </Button>
                        <Button size="sm" variant="secondary" disabled={busy} onClick={() => setRejecting(d)}>
                          <X /> Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {reviewing && (
              <div className="mt-5 flex flex-wrap items-center gap-2 rounded-card border border-line bg-canvas/60 p-4">
                <p className="mr-auto text-sm font-semibold text-ink-2">
                  {selfAdded ? 'You added this technician, so another admin approves them.' : open ? `${open} document${open === 1 ? '' : 's'} still to approve.` : 'Every document is approved.'}
                </p>
                <Button variant="secondary" className="text-danger" disabled={busy || selfAdded} onClick={() => setRejecting('application')}>
                  Reject application
                </Button>
                <Button variant="success" disabled={busy || open > 0 || selfAdded} onClick={() => void run(() => approvePartner(p.id), `${p.name} approved`)}>
                  <ShieldCheck /> Approve technician
                </Button>
                <div className="w-full">
                  <FormError error={error} />
                </div>
              </div>
            )}

            {rejecting === 'application' && (
              <ReasonModal
                title={`Reject ${p.name}’s application?`}
                body="They see this reason in the app and can upload their documents again."
                confirm="Reject application"
                suggestions={APP_REASONS}
                onSubmit={(r) => rejectPartner(p.id, r)}
                done={`${p.name}’s application sent back`}
                onClose={() => setRejecting(null)}
              />
            )}
            {rejecting && rejecting !== 'application' && (
              <ReasonModal
                title={`Reject the ${DOC_LABEL[rejecting.type]}?`}
                body="Tell the technician what to fix. They upload this document again."
                confirm="Reject document"
                suggestions={DOC_REASONS}
                onSubmit={(r) => reviewDoc(rejecting.id, 'rejected', r)}
                done={`${DOC_LABEL[rejecting.type]} rejected`}
                onClose={() => setRejecting(null)}
              />
            )}
            <Modal open={viewing !== null} onClose={() => setViewing(null)} title={viewing ? DOC_LABEL[viewing.type] : ''}>
              {/* eslint-disable-next-line @next/next/no-img-element -- static export */}
              {viewing && <img src={viewing.fileUrl} alt={DOC_LABEL[viewing.type]} className="w-full rounded-lg" />}
            </Modal>
          </>
        )
      }}
    </Async>
  )
}
