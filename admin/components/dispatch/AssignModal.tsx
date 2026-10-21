'use client'

import { UserRoundX } from 'lucide-react'
import { FormError, useAction } from '@/components/catalog/parts'
import { Async, Avatar, Button, Chip, Empty, Modal, Rating, SkeletonRows } from '@/components/ui'
import { assignTechnician, useCandidates, type AdminBooking } from '@/lib/data'
import { cn } from '@/lib/cn'

/**
 * Pick who takes a booking. Online and free technicians first, nearest
 * first; anyone who already said no to it is listed last and marked.
 */
export function AssignModal({ booking: b, onClose }: { booking: AdminBooking; onClose: () => void }) {
  const candidates = useCandidates(b.id)
  const { run, busy, error } = useAction()
  const reassign = b.status === 'assigned'
  return (
    <Modal open onClose={onClose} title={`${reassign ? 'Reassign' : 'Assign'} ${b.displayId}`}>
      <p className="text-sm text-muted">
        {b.serviceName} · {b.area}
        {b.priority === 'emergency' && <span className="font-bold text-danger"> · Emergency</span>}
      </p>
      <div className="-mx-5 mt-3 max-h-[55dvh] overflow-y-auto border-y border-line">
        <Async query={candidates} loading={<SkeletonRows rows={4} />} empty={<Empty icon={<UserRoundX />} title="Nobody can take this" body="No active technician is approved for this category." />}>
          {(list) => (
            <ul className="divide-y divide-line">
              {list.map((c) => {
                const p = c.partner
                const state = !p.online ? 'Offline' : c.busy ? 'On a job' : 'Free now'
                return (
                  <li key={p.id} className={cn('flex items-center gap-3 px-5 py-3', c.declined && 'opacity-60')}>
                    <Avatar name={p.name} size={36} side="technician" />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm font-bold">
                        {p.name} <Rating value={p.rating} />
                      </p>
                      <p className="text-xs text-muted">
                        <span className="num">{c.distanceKm} km</span> · ~<span className="num">{c.etaMin}</span> min · {p.area}
                        {c.queued > 0 && ` · ${c.queued} queued`}
                      </p>
                    </div>
                    {c.declined ? <Chip tone="danger">Declined</Chip> : <Chip tone={state === 'Free now' ? 'success' : state === 'On a job' ? 'violet' : 'neutral'}>{state}</Chip>}
                    <Button size="sm" variant={state === 'Free now' && !c.declined ? 'primary' : 'secondary'} disabled={busy} onClick={() => void run(() => assignTechnician(b.id, p.id), `${b.displayId} ${reassign ? 'reassigned' : 'assigned'} to ${p.name}`, onClose)}>
                      Assign
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}
        </Async>
      </div>
      <div className="mt-3">
        <FormError error={error} />
      </div>
    </Modal>
  )
}
