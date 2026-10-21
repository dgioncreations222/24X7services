'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Ban, MapPin, Phone, ReceiptIndianRupee, SearchX, UserRoundPlus } from 'lucide-react'
import { AssignModal } from '@/components/dispatch/AssignModal'
import { ReasonModal } from '@/components/technicians/ReasonModal'
import { Async, Avatar, Button, Chip, Drawer, Empty, Rating, SectionLabel, SkeletonRows, buttonClass } from '@/components/ui'
import { OPEN_STATUSES, bill, cancelBooking, useBooking, useCan, usePartner, type AdminBooking } from '@/lib/data'
import { BillCard } from './BillCard'
import { RefundModal } from './RefundModal'
import { StatusTimeline } from './StatusTimeline'
import { BOOKING_STATUS, slot } from './status'

const CANCEL_REASONS = ['Customer asked to cancel on the phone.', 'No technician available for the slot.', 'Duplicate booking — the customer booked twice.', 'Area not serviceable after all.']

/** One booking: who, where, when, what happened, the bill — and assign, cancel, refund. */
export function BookingDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const query = useBooking(id)
  if (!id) return null
  return (
    <Async
      query={query}
      loading={
        <Drawer open onClose={onClose} title="Loading…">
          <SkeletonRows rows={3} />
        </Drawer>
      }
      isEmpty={(b) => b === null}
      empty={
        <Drawer open onClose={onClose} title="Booking not found">
          <Empty icon={<SearchX />} title="Not found" body="Check the booking ID." />
        </Drawer>
      }
    >
      {(b) => b && <Body booking={b} onClose={onClose} />}
    </Async>
  )
}

function Body({ booking: b, onClose }: { booking: AdminBooking; onClose: () => void }) {
  const can = useCan()
  const tech = usePartner(b.technicianId)
  const [modal, setModal] = useState<'assign' | 'cancel' | 'refund' | null>(null)
  const s = BOOKING_STATUS[b.status]
  const canAssign = can('bookings', 'assign') && (b.status === 'confirmed' || b.status === 'assigned')
  const canCancel = can('bookings', 'edit') && OPEN_STATUSES.includes(b.status)
  const canRefund = can('payments', 'approve') && (b.status === 'cancelled' || b.status === 'completed') && bill(b).refundable > 0
  const p = tech.data

  return (
    <>
      <Drawer
        open
        onClose={onClose}
        width="max-w-2xl"
        title={`${b.displayId} · ${b.serviceName}`}
        sub={
          <span className="flex flex-wrap items-center gap-2 pt-1">
            <Chip tone={s.tone} live={['en_route', 'in_progress'].includes(b.status)}>
              {s.label}
            </Chip>
            {b.priority === 'emergency' && <Chip tone="danger">Emergency</Chip>}
            {b.dispatch.noTechFound && <Chip tone="danger">No technician found</Chip>}
            <span>{slot(b.slotStart)}</span>
          </span>
        }
        footer={
          <>
            {canCancel && (
              <Button variant="subtle" size="sm" className="mr-auto text-danger hover:bg-danger-soft" onClick={() => setModal('cancel')}>
                <Ban /> Cancel booking
              </Button>
            )}
            {canRefund && (
              <Button variant="secondary" size="sm" className={canCancel ? '' : 'mr-auto'} onClick={() => setModal('refund')}>
                <ReceiptIndianRupee /> Refund
              </Button>
            )}
            {b.customer.phone && (
              <a href={`tel:${b.customer.phone.replace(/\s/g, '')}`} className={buttonClass('secondary', 'sm')}>
                <Phone /> Call customer
              </a>
            )}
            {canAssign && (
              <Button size="sm" onClick={() => setModal('assign')}>
                <UserRoundPlus /> {b.technicianId ? 'Reassign' : 'Assign technician'}
              </Button>
            )}
          </>
        }
      >
        {b.cancellation && (
          <p className="mb-4 rounded-lg border border-danger/25 bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">
            Cancelled by {b.cancellation.by}: {b.cancellation.reason}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <SectionLabel>Customer</SectionLabel>
            <div className="flex items-center gap-3">
              <Avatar name={b.customer.name} size={36} side="customer" />
              <div className="min-w-0 text-sm">
                <Link href={`/customers?id=${b.customer.id}`} className="font-bold hover:text-brand">
                  {b.customer.name}
                </Link>
                <p className="num text-xs text-muted">{b.customer.phone}</p>
              </div>
            </div>
            <p className="mt-2 flex gap-1.5 text-[13px] text-ink-2">
              <MapPin className="mt-0.5 size-3.5 shrink-0 text-faint" aria-hidden />
              {b.address.includes(b.pincode) ? b.address : `${b.address}, ${b.area} ${b.pincode}`}
            </p>
          </div>
          <div>
            <SectionLabel>Technician</SectionLabel>
            {p ? (
              <Link href={`/technicians?id=${p.id}`} className="flex items-center gap-3 rounded-lg hover:bg-canvas">
                <Avatar name={p.name} size={36} side="technician" />
                <span className="min-w-0 text-sm">
                  <span className="block font-bold">{p.name}</span>
                  <Rating value={p.rating} />
                </span>
              </Link>
            ) : (
              <p className="text-sm text-muted">
                {b.dispatch.noTechFound ? `Offered to ${b.dispatch.declinedBy.length} technicians — none took it.` : 'Not assigned yet.'}
              </p>
            )}
          </div>
        </div>

        <SectionLabel>What’s wrong</SectionLabel>
        <p className="text-sm">
          <span className="font-bold">{b.brand}</span> · {b.issue}
        </p>

        <SectionLabel>Status</SectionLabel>
        <StatusTimeline booking={b} />

        <SectionLabel>{b.extras.length ? 'Extras and bill' : 'Bill'}</SectionLabel>
        <BillCard booking={b} />
      </Drawer>

      {modal === 'assign' && <AssignModal booking={b} onClose={() => setModal(null)} />}
      {modal === 'refund' && <RefundModal booking={b} onClose={() => setModal(null)} />}
      {modal === 'cancel' && (
        <ReasonModal
          title={`Cancel ${b.displayId}?`}
          body={`The customer and ${p ? p.name : 'any technician'} are told at once.${bill(b).paid > 0 ? ' It was paid, so the refund opens next.' : ''}`}
          confirm="Cancel booking"
          suggestions={CANCEL_REASONS}
          onSubmit={(r) => cancelBooking(b.id, r)}
          done={`${b.displayId} cancelled`}
          onClose={() => setModal(null)}
          // A paid booking should not be left cancelled with the money kept: go straight to the refund.
          onDone={() => setModal(bill(b).paid > 0 && can('payments', 'approve') ? 'refund' : null)}
        />
      )}
    </>
  )
}
