'use client'

import { useState } from 'react'
import { Phone, ShieldAlert, ShieldCheck, UserX } from 'lucide-react'
import { useAction } from '@/components/catalog/parts'
import { Async, Avatar, Button, Chip, Drawer, Empty, SkeletonRows, Tabs, buttonClass } from '@/components/ui'
import { deactivatePartner, reactivatePartner, suspendPartner, useCan, usePartner, type Partner } from '@/lib/data'
import { cn } from '@/lib/cn'
import { KycReview } from './KycReview'
import { PerformancePanel } from './PerformancePanel'
import { ProfilePanel } from './ProfilePanel'
import { ReasonModal } from './ReasonModal'
import { PARTNER_STATUS, presence } from './status'

type Section = 'kyc' | 'profile' | 'performance'

const SUSPEND_REASONS = ['Repeated customer complaints — under review.', 'Asked customers to pay outside the app.', 'Documents found to be invalid after approval.']
const INACTIVE_REASONS = ['Left the network.', 'Took jobs outside the app.', 'Not worked for 60 days.']

const backToDispatch = (n: number) => (n ? ` · ${n} job${n === 1 ? '' : 's'} back to dispatch` : '')

/** One technician: KYC, profile and performance, with suspend / reactivate in the footer. */
export function TechnicianDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const query = usePartner(id)
  if (!id) return null
  return (
    <Async
      query={query}
      loading={
        <Drawer open onClose={onClose} title="Loading…">
          <SkeletonRows rows={3} />
        </Drawer>
      }
      isEmpty={(p) => p === null}
      empty={
        <Drawer open onClose={onClose} title="Technician not found">
          <Empty icon={<ShieldAlert />} title="Not found" body="This technician may have been removed." />
        </Drawer>
      }
    >
      {(p) => p && <Body key={p.id} partner={p} onClose={onClose} />}
    </Async>
  )
}

function Body({ partner: p, onClose }: { partner: Partner; onClose: () => void }) {
  const can = useCan()
  const [section, setSection] = useState<Section>(p.status === 'kyc_pending' || p.status === 'rejected' ? 'kyc' : 'profile')
  const [suspending, setSuspending] = useState(false)
  const [deactivating, setDeactivating] = useState(false)
  const { run, busy } = useAction()
  const s = PARTNER_STATUS[p.status]
  const pr = presence(p)
  const canDecide = can('technicians', 'approve')

  return (
    <>
      <Drawer
        open
        onClose={onClose}
        width="max-w-2xl"
        title={p.name}
        sub={
          <span className="flex flex-wrap items-center gap-2 pt-1">
            <span className="num">{p.id}</span>
            <Chip tone={s.tone}>{s.label}</Chip>
            {p.status === 'active' && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-2">
                <span className={cn('size-2 rounded-full', pr.dot)} /> {pr.label}
              </span>
            )}
          </span>
        }
        footer={
          <>
            {canDecide && (p.status === 'active' || p.status === 'approved') && (
              <Button variant="subtle" size="sm" className="mr-auto text-danger hover:bg-danger-soft" onClick={() => setSuspending(true)}>
                <ShieldAlert /> Suspend
              </Button>
            )}
            {canDecide && (p.status === 'active' || p.status === 'approved' || p.status === 'suspended') && (
              <Button variant="subtle" size="sm" className={cn('text-ink-2', p.status === 'suspended' && 'mr-auto')} onClick={() => setDeactivating(true)}>
                <UserX /> Make inactive
              </Button>
            )}
            {canDecide && (p.status === 'suspended' || p.status === 'inactive') && (
              <Button variant="success" size="sm" className={cn(p.status === 'inactive' && 'mr-auto')} disabled={busy} onClick={() => void run(() => reactivatePartner(p.id), `${p.name} reactivated`)}>
                <ShieldCheck /> Reactivate
              </Button>
            )}
            <a href={`tel:${p.phone.replace(/\s/g, '')}`} className={buttonClass('secondary', 'sm')}>
              <Phone /> Call
            </a>
          </>
        }
      >
        <div className="flex items-center gap-4">
          <Avatar name={p.name} size={56} side="technician" />
          <div className="min-w-0 text-sm">
            <p className="font-bold">
              {p.area}, {p.city} · {p.experienceYears} yrs exp.
            </p>
            {p.status === 'suspended' && p.statusReason && <p className="mt-1 font-semibold text-danger">Suspended: {p.statusReason}</p>}
            {p.status === 'inactive' && p.statusReason && <p className="mt-1 font-semibold text-ink-2">Inactive: {p.statusReason}</p>}
            {p.addedBy && <p className="mt-1 text-xs text-muted">Added by {p.addedBy.name}</p>}
          </div>
        </div>

        <Tabs
          className="-mx-5 mt-5 px-3"
          value={section}
          onChange={setSection}
          options={[
            { value: 'kyc', label: p.status === 'kyc_pending' ? 'KYC · to review' : 'KYC' },
            { value: 'profile', label: 'Profile' },
            { value: 'performance', label: 'Performance' },
          ]}
        />
        {section === 'kyc' && <KycReview partner={p} />}
        {section === 'profile' && <ProfilePanel partner={p} />}
        {section === 'performance' && <PerformancePanel partner={p} />}
      </Drawer>

      {suspending && (
        <ReasonModal
          title={`Suspend ${p.name}?`}
          body="They go offline at once and stop getting jobs. They see this reason in the app."
          confirm="Suspend technician"
          suggestions={SUSPEND_REASONS}
          onSubmit={(r) => suspendPartner(p.id, r)}
          done={(n) => `${p.name} suspended${backToDispatch(Number(n))}`}
          onClose={() => setSuspending(false)}
        />
      )}
      {deactivating && (
        <ReasonModal
          title={`Make ${p.name} inactive?`}
          body="They go offline and stop getting jobs; jobs they have not started go back to dispatch. The account stays — you can reactivate it — and nobody new can be added with their phone, email, PAN, bank or UPI meanwhile."
          confirm="Make inactive"
          suggestions={INACTIVE_REASONS}
          onSubmit={(r) => deactivatePartner(p.id, r)}
          done={(n) => `${p.name} is inactive${backToDispatch(Number(n))}`}
          onClose={() => setDeactivating(false)}
        />
      )}
    </>
  )
}
