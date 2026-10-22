'use client'

import { BRAND } from '@/lib/brand'
import Link from 'next/link'
import type { Route } from 'next'
import { useState } from 'react'
import { Ban, CalendarClock, Check, MapPin, Phone, RotateCcw, Siren, UserRoundPlus } from 'lucide-react'
import { APPLIANCE_LABEL, BRAND_LABEL, inr } from '@/lib/catalog'
import { cn } from '@/lib/cn'
import { dateTime, telHref, time } from '@/lib/format'
import { candidates } from '@/lib/geo'
import { BOOKING_STATUS, PRESENCE, STEP_LABEL } from '@/lib/status'
import { useStore } from '@/lib/store'
import { BOOKING_FLOW, type Booking, type BookingStatus } from '@/lib/types'
import { ApplianceGlyph } from './glyphs'
import { useToast } from './toast'
import { Avatar, Button, Chip, Detail, Drawer, Field, inputClass, Modal, PriorityTag, Rating, SectionLabel, SideTag, StatusChip, Select } from './ui'

const METHOD: Record<string, string> = { upi: 'UPI', card: 'Card', cash: 'Cash on service', wallet: `${BRAND.name} Wallet` }

/** A booking end to end: who, what, when, who is on it, the money, and every step so far. */
export function BookingDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const store = useStore()
  const toast = useToast()
  const b = store.bookings.find((x) => x.id === id)
  const [assigning, setAssigning] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  if (!b) return null
  const c = store.customer(b.customerId)
  const t = store.technician(b.technicianId)
  const open = !['completed', 'cancelled', 'refunded'].includes(b.status)
  const step = BOOKING_FLOW.indexOf(b.status as (typeof BOOKING_FLOW)[number])
  const next: BookingStatus | undefined = open && step >= 2 && step < BOOKING_FLOW.length - 1 ? BOOKING_FLOW[step + 1] : undefined

  return (
    <>
      <Drawer
        open={!!id}
        onClose={onClose}
        title={
          <span className="flex items-center gap-2">
            {b.id}
            {b.priority === 'emergency' && <Siren className="size-4 text-danger" aria-label="Emergency" />}
          </span>
        }
        sub={
          <span className="flex flex-wrap items-center gap-2 pt-1">
            <StatusChip status={b.status} />
            <PriorityTag priority={b.priority} />
            <span>Booked {dateTime(b.createdAt)}</span>
          </span>
        }
        footer={
          <>
            {open && (
              <Button variant="subtle" size="sm" className="mr-auto text-danger hover:bg-danger-soft" onClick={() => setCancelling(true)}>
                <Ban /> Cancel booking
              </Button>
            )}
            {b.paid && (b.status === 'cancelled' || b.status === 'completed') && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  store.refund(b.id)
                  toast(`Refund of ${inr(b.amount)} issued for ${b.id}`)
                }}
              >
                <RotateCcw /> Refund {inr(b.amount)}
              </Button>
            )}
            {open && b.status !== 'pending_payment' && (
              <Button variant={t ? 'secondary' : 'primary'} size="sm" onClick={() => setAssigning(true)}>
                <UserRoundPlus /> {t ? 'Reassign' : 'Assign technician'}
              </Button>
            )}
            {next && (
              <Button
                size="sm"
                onClick={() => {
                  store.setStatus(b.id, next, 'Updated from the console')
                  toast(`${b.id} → ${BOOKING_STATUS[next].label}`)
                }}
              >
                <Check /> Mark {BOOKING_STATUS[next].label.toLowerCase()}
              </Button>
            )}
          </>
        }
      >
        <div className="flex items-start gap-3 rounded-card border border-line bg-canvas/60 p-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-card text-brand ring-1 ring-line">
            <ApplianceGlyph appliance={b.appliance} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-extrabold">
              {BRAND_LABEL[b.brand]} {APPLIANCE_LABEL[b.appliance]} · {b.service}
            </p>
            <p className="mt-0.5 text-sm font-medium text-ink-2">{b.issue}</p>
            <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-muted">
              <CalendarClock className="size-3.5" aria-hidden /> Slot {dateTime(b.scheduledAt)}
            </p>
          </div>
        </div>

        <SectionLabel action={<SideTag side="customer" label="Customer" />}>Customer</SectionLabel>
        {c && (
          <div className="flex items-center gap-3">
            <Avatar name={c.name} size={40} side="customer" />
            <div className="min-w-0 flex-1">
              <Link href={`/customers/?id=${c.id}` as Route} className="font-bold hover:text-brand hover:underline">
                {c.name}
              </Link>
              <p className="text-xs font-semibold text-muted">
                {c.id} · {c.phone}
              </p>
            </div>
            <a href={telHref(c.phone)} className="grid size-9 place-items-center rounded-lg border border-line text-ink-2 hover:bg-canvas" aria-label={`Call ${c.name}`}>
              <Phone className="size-4" />
            </a>
          </div>
        )}
        <p className="mt-3 flex items-start gap-2 text-sm font-medium text-ink-2">
          <MapPin className="mt-0.5 size-4 shrink-0 text-faint" aria-hidden /> {b.address}
        </p>

        <SectionLabel action={<SideTag side="technician" label="Technician" />}>Technician</SectionLabel>
        {t ? (
          <div className="flex items-center gap-3">
            <Avatar name={t.name} size={40} side="technician" />
            <div className="min-w-0 flex-1">
              <Link href={`/technicians/?id=${t.id}` as Route} className="font-bold hover:text-brand hover:underline">
                {t.name}
              </Link>
              <p className="flex flex-wrap items-center gap-x-2 text-xs font-semibold text-muted">
                {t.id} <Rating value={t.rating} className="text-xs" /> · {t.experienceYears} yrs
              </p>
            </div>
            <Chip tone={PRESENCE[t.presence].tone}>{PRESENCE[t.presence].label}</Chip>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-warning/40 bg-warning-soft px-4 py-3">
            <p className="text-sm font-bold text-warning">{b.status === 'pending_payment' ? 'Assigned once payment clears' : 'No technician yet'}</p>
            {b.status !== 'pending_payment' && open && (
              <Button size="sm" onClick={() => setAssigning(true)}>
                Assign
              </Button>
            )}
          </div>
        )}

        <SectionLabel>Payment</SectionLabel>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-card border border-line p-4">
          <Detail label="Amount">
            <span className="num text-base font-extrabold">{inr(b.amount)}</span>
          </Detail>
          <Detail label="Status">
            {b.status === 'refunded' ? (
              <Chip tone="neutral">Refunded</Chip>
            ) : b.paid ? (
              <Chip tone="success">Paid</Chip>
            ) : (
              <Chip tone="warning">{b.method === 'cash' ? 'Collect on site' : 'Unpaid'}</Chip>
            )}
          </Detail>
          <Detail label="Method">{b.method ? METHOD[b.method] : '—'}</Detail>
          <Detail label="Coupon">{b.coupon ? `${b.coupon} (−${inr(b.discount)})` : '—'}</Detail>
          {b.rating && (
            <Detail label="Customer rating">
              <Rating value={b.rating} />
            </Detail>
          )}
          {b.cancelReason && <Detail label="Cancel reason">{b.cancelReason}</Detail>}
        </dl>

        <SectionLabel>Timeline</SectionLabel>
        <ol className="relative space-y-4 pl-5 before:absolute before:bottom-2 before:left-[5px] before:top-2 before:w-px before:bg-line">
          {b.timeline.map((e, i) => (
            <li key={i} className="relative">
              <span
                className={cn(
                  'absolute -left-5 top-1 size-[11px] rounded-full border-2 border-card ring-1',
                  i === b.timeline.length - 1 ? 'bg-brand ring-brand' : 'bg-line-strong ring-line-strong',
                  (e.status === 'cancelled' || e.status === 'refunded') && 'bg-danger ring-danger'
                )}
              />
              <p className="text-sm font-bold">{STEP_LABEL[e.status]}</p>
              <p className="text-xs font-medium text-muted">
                {dateTime(e.at)}
                {e.note && ` · ${e.note}`}
              </p>
            </li>
          ))}
        </ol>
      </Drawer>

      <AssignModal booking={assigning ? b : null} onClose={() => setAssigning(false)} />

      <CancelModal
        open={cancelling}
        onClose={() => setCancelling(false)}
        onConfirm={(reason) => {
          store.cancel(b.id, reason)
          setCancelling(false)
          toast(`${b.id} cancelled`)
        }}
      />
    </>
  )
}

/** Pick a technician for a booking — nearest free one first. */
export function AssignModal({ booking, onClose }: { booking: Booking | null; onClose: () => void }) {
  const store = useStore()
  const toast = useToast()
  const [pick, setPick] = useState<string | null>(null)
  if (!booking) return null
  const list = candidates(booking, store.technicians, store.bookings)
  const chosen = pick ?? list.find((x) => x.tech.presence !== 'offline' && !x.busy)?.tech.id ?? null
  return (
    <Modal
      open
      onClose={() => {
        setPick(null)
        onClose()
      }}
      title={`Assign ${booking.id}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!chosen || chosen === booking.technicianId}
            onClick={() => {
              if (!chosen) return
              store.assign(booking.id, chosen)
              toast(`${booking.id} assigned to ${store.technician(chosen)?.name}`)
              setPick(null)
              onClose()
            }}
          >
            Assign technician
          </Button>
        </>
      }
    >
      <p className="mb-3 text-sm font-medium text-muted">
        {BRAND_LABEL[booking.brand]} {APPLIANCE_LABEL[booking.appliance]} in {booking.area} · slot {time(booking.scheduledAt)}. Showing technicians certified for this brand and appliance, nearest first.
      </p>
      <ul className="-mx-1 max-h-[46dvh] space-y-1.5 overflow-y-auto px-1" role="radiogroup" aria-label="Technicians">
        {list.length === 0 && <li className="py-6 text-center text-sm font-semibold text-muted">No certified technician covers this pair.</li>}
        {list.map(({ tech, distance, eta, load, busy }) => {
          const on = chosen === tech.id
          return (
            <li key={tech.id}>
              <button
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setPick(tech.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                  on ? 'border-brand bg-brand-soft/60 ring-1 ring-brand' : 'border-line hover:border-line-strong',
                  tech.presence === 'offline' && !on && 'opacity-60'
                )}
              >
                <Avatar name={tech.name} size={36} side="technician" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-bold">{tech.name}</span>
                    {tech.id === booking.technicianId && <span className="text-[11px] font-bold text-brand">Current</span>}
                  </span>
                  <span className="flex flex-wrap items-center gap-x-2 text-xs font-semibold text-muted">
                    <Rating value={tech.rating} className="text-xs" /> · {tech.area} · {load} queued
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="num block text-sm font-extrabold">{distance} km</span>
                  <span className={cn('block text-[11px] font-bold', tech.presence === 'offline' ? 'text-faint' : busy ? 'text-violet' : 'text-success')}>
                    {tech.presence === 'offline' ? 'Offline' : busy ? 'On a job' : `~${eta} min`}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </Modal>
  )
}

const REASONS = ['Customer requested', 'Customer not reachable', 'No technician available', 'Duplicate booking', 'Outside service area']

export function CancelModal({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState(REASONS[0]!)
  const [note, setNote] = useState('')
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cancel this booking?"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Keep booking
          </Button>
          <Button variant="danger" onClick={() => onConfirm(note.trim() ? `${reason} — ${note.trim()}` : reason)}>
            Cancel booking
          </Button>
        </>
      }
    >
      <p className="mb-4 text-sm font-medium text-muted">The customer and the technician are both notified. A paid booking can be refunded afterwards.</p>
      <div className="space-y-3">
        <Field label="Reason">
          <Select full label="Reason" value={reason} onChange={setReason} options={REASONS.map((r) => ({ value: r, label: r }))} />
        </Field>
        <Field label="Note (optional)">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={inputClass} />
        </Field>
      </div>
    </Modal>
  )
}
