'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Ban, Phone, SearchX, ShieldCheck } from 'lucide-react'
import { BOOKING_STATUS, rupees, slot } from '@/components/bookings/status'
import { useAction } from '@/components/catalog/parts'
import { ReasonModal } from '@/components/technicians/ReasonModal'
import { Async, Avatar, Button, Chip, Detail, Drawer, Empty, SectionLabel, SkeletonRows, buttonClass } from '@/components/ui'
import { bill, blockCustomer, unblockCustomer, useCan, useCustomer, useCustomerBookings, type CustomerRow } from '@/lib/data'
import { longDate } from '@/lib/format'

const BLOCK_REASONS = ['Repeated no-shows when the technician arrived.', 'Abusive to technicians on calls.', 'Payment disputes raised in bad faith.']

/** One customer: contact, addresses, what they have booked and spent, and block / unblock. */
export function CustomerDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const query = useCustomer(id)
  if (!id) return null
  return (
    <Async
      query={query}
      loading={
        <Drawer open onClose={onClose} title="Loading…">
          <SkeletonRows rows={3} />
        </Drawer>
      }
      isEmpty={(c) => c === null}
      empty={
        <Drawer open onClose={onClose} title="Customer not found">
          <Empty icon={<SearchX />} title="Not found" />
        </Drawer>
      }
    >
      {(c) => c && <Body customer={c} onClose={onClose} />}
    </Async>
  )
}

function Body({ customer: c, onClose }: { customer: CustomerRow; onClose: () => void }) {
  const can = useCan()
  const bookings = useCustomerBookings(c.id)
  const [blocking, setBlocking] = useState(false)
  const { run, busy } = useAction()
  const editable = can('customers', 'edit')
  return (
    <>
      <Drawer
        open
        onClose={onClose}
        width="max-w-2xl"
        title={c.name}
        sub={
          <span className="flex items-center gap-2 pt-1">
            <span className="num">{c.id}</span>
            <Chip tone={c.status === 'active' ? 'success' : 'danger'}>{c.status === 'active' ? 'Active' : 'Blocked'}</Chip>
          </span>
        }
        footer={
          <>
            {editable && c.status === 'active' && (
              <Button variant="subtle" size="sm" className="mr-auto text-danger hover:bg-danger-soft" onClick={() => setBlocking(true)}>
                <Ban /> Block
              </Button>
            )}
            {editable && c.status === 'blocked' && (
              <Button variant="success" size="sm" className="mr-auto" disabled={busy} onClick={() => void run(() => unblockCustomer(c.id), `${c.name} unblocked`)}>
                <ShieldCheck /> Unblock
              </Button>
            )}
            <a href={`tel:${c.phone.replace(/\s/g, '')}`} className={buttonClass('secondary', 'sm')}>
              <Phone /> Call
            </a>
          </>
        }
      >
        {c.status === 'blocked' && c.blockReason && <p className="mb-4 rounded-lg border border-danger/25 bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">Blocked: {c.blockReason}</p>}
        <div className="flex items-center gap-4">
          <Avatar name={c.name} size={56} side="customer" />
          <dl className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
            <Detail label="Bookings">{c.bookings}</Detail>
            <Detail label="Completed">{c.completed}</Detail>
            <Detail label="Spent">{rupees(c.spent)}</Detail>
            <Detail label="Wallet">{rupees(c.walletCredit)}</Detail>
          </dl>
        </div>
        <SectionLabel>Contact</SectionLabel>
        <dl className="grid gap-3 sm:grid-cols-2">
          <Detail label="Mobile">
            <span className="num">{c.phone}</span>
          </Detail>
          <Detail label="Email">{c.email}</Detail>
          <Detail label="Customer since">{longDate(new Date(c.joinedAt).toISOString())}</Detail>
          <Detail label="Referrals">
            {c.referrals} · code <span className="num">{c.referralCode}</span>
          </Detail>
        </dl>
        <SectionLabel>Saved addresses</SectionLabel>
        <ul className="space-y-2">
          {c.addresses.map((a) => (
            <li key={a.label} className="rounded-lg border border-line px-3 py-2 text-sm">
              <span className="font-bold">{a.label}</span> · <span className="text-ink-2">{a.line}</span>
            </li>
          ))}
        </ul>
        <SectionLabel>Bookings</SectionLabel>
        <Async query={bookings} loading={<SkeletonRows rows={2} />} empty={<p className="text-sm text-muted">No bookings yet.</p>}>
          {(list) => (
            <ul className="max-h-[360px] divide-y divide-line overflow-y-auto rounded-card border border-line">
              {list.map((b) => (
                <li key={b.id}>
                  <Link href={`/bookings?id=${b.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-canvas/60">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-bold">
                        <span className="num">{b.displayId}</span> · {b.serviceName}
                      </span>
                      <span className="block text-xs text-muted">
                        {slot(b.slotStart)} · {rupees(bill(b).total)}
                      </span>
                    </span>
                    <Chip tone={BOOKING_STATUS[b.status].tone}>{BOOKING_STATUS[b.status].label}</Chip>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Async>
      </Drawer>
      {blocking && (
        <ReasonModal
          title={`Block ${c.name}?`}
          body="They cannot book until unblocked. Their open bookings stay as they are — cancel them from Bookings if needed. The reason is for admins only."
          confirm="Block customer"
          suggestions={BLOCK_REASONS}
          onSubmit={(r) => blockCustomer(c.id, r)}
          done={`${c.name} blocked`}
          onClose={() => setBlocking(false)}
        />
      )}
    </>
  )
}
