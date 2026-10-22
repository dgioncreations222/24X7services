'use client'

import { BRAND } from '@/lib/brand'
import Link from 'next/link'
import type { Route } from 'next'
import { useState } from 'react'
import { Ban, Gift, Home, Mail, MapPin, Pencil, Phone, Plus, ShieldCheck, Trash2, Wallet } from 'lucide-react'
import { BookingDrawer } from './BookingDrawer'
import { ApplianceGlyph } from './glyphs'
import { useToast } from './toast'
import { Avatar, Button, Chip, Detail, Drawer, Field, Modal, Rating, SectionLabel, StatusChip, Tabs, buttonClass, inputClass, Select } from './ui'
import { APPLIANCE_LABEL, BRAND_LABEL, inr } from '@/lib/catalog'
import { cn } from '@/lib/cn'
import { ago, dateTime, longDate, telHref } from '@/lib/format'
import { AREAS } from '@/lib/seed'
import { TICKET_STATUS } from '@/lib/status'
import { useStore } from '@/lib/store'
import type { Booking, Customer } from '@/lib/types'

const METHOD: Record<string, string> = { upi: 'UPI', card: 'Card', cash: 'Cash', wallet: 'Wallet' }

type Section = 'profile' | 'bookings' | 'addresses' | 'payments' | 'history' | 'reviews' | 'tickets'

/** One customer: profile, where they live, every booking and rupee, and what they told us. */
export function CustomerDrawer({ c, bookings, spend, onClose }: { c?: Customer; bookings: Booking[]; spend: number; onClose: () => void }) {
  const store = useStore()
  const toast = useToast()
  const [section, setSection] = useState<Section>('profile')
  const [booking, setBooking] = useState<string | null>(null)
  const [credit, setCredit] = useState(false)
  const [amount, setAmount] = useState(200)
  const [suspending, setSuspending] = useState(false)
  const [editing, setEditing] = useState(false)
  const [address, setAddress] = useState<number | 'new' | null>(null)
  const canEdit = store.can('customers', 'edit')
  if (!c) return null

  const rated = bookings.filter((b) => b.rating)
  const tickets = store.tickets.filter((t) => t.side === 'customer' && t.personId === c.id)
  const reviews = store.reviews.filter((r) => r.customerId === c.id)
  const payments = bookings.filter((b) => b.paid || b.status === 'refunded')
  const history = bookings.filter((b) => b.status === 'completed')
  const suspended = c.status === 'blocked'

  const removeAddress = (i: number) => {
    const a = c.addresses[i]!
    const next = c.addresses.filter((_, k) => k !== i)
    store.updateCustomer(c.id, { addresses: next, address: next[0]?.line ?? '' }, { action: 'Removed address', target: c.name, old: `${a.label}: ${a.line}` })
    toast(`${a.label} address removed`)
  }

  return (
    <>
      <Drawer
        open
        onClose={onClose}
        width="max-w-2xl"
        title={c.name}
        sub={
          <span className="flex flex-wrap items-center gap-2 pt-1">
            <span className="num">{c.id}</span>
            <Chip tone={suspended ? 'danger' : 'success'}>{suspended ? 'Suspended' : 'Active'}</Chip>
            <span>Joined {longDate(c.joinedAt)}</span>
          </span>
        }
        footer={
          <>
            {canEdit && (
              <Button variant="subtle" size="sm" className={cn('mr-auto', suspended ? 'text-success hover:bg-success-soft' : 'text-danger hover:bg-danger-soft')} onClick={() => setSuspending(true)}>
                {suspended ? <ShieldCheck /> : <Ban />} {suspended ? 'Activate' : 'Suspend'}
              </Button>
            )}
            {canEdit && (
              <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
                <Pencil /> Edit
              </Button>
            )}
            <a href={telHref(c.phone)} className={buttonClass('secondary', 'sm')}>
              <Phone /> Call
            </a>
            {canEdit && (
              <Button size="sm" onClick={() => setCredit(true)}>
                <Gift /> Add credit
              </Button>
            )}
          </>
        }
      >
        <div className="flex items-center gap-4">
          <Avatar name={c.name} size={56} side="customer" />
          <div className="min-w-0 space-y-1 text-sm font-semibold text-ink-2">
            <p className="num flex items-center gap-2">
              <Phone className="size-4 text-faint" aria-hidden /> {c.phone}
            </p>
            <p className="flex items-center gap-2 truncate">
              <Mail className="size-4 shrink-0 text-faint" aria-hidden /> {c.email}
            </p>
            <p className="flex items-center gap-2 truncate text-xs text-muted">
              <MapPin className="size-4 shrink-0 text-faint" aria-hidden /> {c.area}
            </p>
          </div>
        </div>

        <Tabs
          className="-mx-5 mt-5 px-3"
          value={section}
          onChange={setSection}
          options={[
            { value: 'profile', label: 'Profile' },
            { value: 'bookings', label: 'Bookings', count: bookings.length },
            { value: 'addresses', label: 'Addresses', count: c.addresses.length },
            { value: 'payments', label: 'Payments', count: payments.length },
            { value: 'history', label: 'Service history', count: history.length },
            { value: 'reviews', label: 'Reviews', count: reviews.length },
            { value: 'tickets', label: 'Tickets', count: tickets.length },
          ]}
        />

        {section === 'profile' && (
          <>
            <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ['Bookings', String(bookings.length)],
                ['Lifetime spend', inr(spend)],
                ['Avg rating given', rated.length ? (rated.reduce((s, b) => s + b.rating!, 0) / rated.length).toFixed(1) + '★' : '—'],
                ['Cancellations', String(bookings.filter((b) => b.status === 'cancelled' || b.status === 'refunded').length)],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg border border-line p-3">
                  <dt className="text-[11px] font-bold uppercase tracking-[0.06em] text-faint">{k}</dt>
                  <dd className="num mt-0.5 text-base font-extrabold">{v}</dd>
                </div>
              ))}
            </dl>
            <SectionLabel>Wallet & referrals</SectionLabel>
            <dl className="grid grid-cols-3 gap-4 rounded-card border border-line p-4">
              <Detail label="Wallet credit">
                <span className="num flex items-center gap-1.5">
                  <Wallet className="size-4 text-faint" aria-hidden /> {inr(c.walletCredit)}
                </span>
              </Detail>
              <Detail label="Referral code">
                <span className="font-mono text-[13px]">{c.referralCode}</span>
              </Detail>
              <Detail label="Friends referred">{c.referrals}</Detail>
            </dl>
            <SectionLabel>Primary address</SectionLabel>
            <p className="flex items-start gap-2 text-sm font-medium text-ink-2">
              <Home className="mt-0.5 size-4 shrink-0 text-faint" aria-hidden /> {c.address || '—'}
            </p>
          </>
        )}

        {section === 'bookings' && (
          <>
            <SectionLabel>All bookings · {bookings.length}</SectionLabel>
            <BookingList list={bookings} onOpen={setBooking} empty="No bookings yet." />
          </>
        )}

        {section === 'addresses' && (
          <>
            <SectionLabel
              action={
                canEdit ? (
                  <Button size="xs" variant="secondary" onClick={() => setAddress('new')}>
                    <Plus /> Add address
                  </Button>
                ) : undefined
              }
            >
              Saved addresses
            </SectionLabel>
            {c.addresses.length === 0 ? (
              <p className="text-sm font-medium text-muted">No saved addresses.</p>
            ) : (
              <ul className="space-y-2">
                {c.addresses.map((a, i) => (
                  <li key={`${a.label}-${i}`} className="flex items-start gap-3 rounded-lg border border-line px-3 py-2.5">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-cust" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-[13px] font-bold">
                        {a.label}
                        {i === 0 && <span className="rounded bg-cust-soft px-1.5 text-[10px] font-extrabold uppercase tracking-wider text-cust">Primary</span>}
                      </span>
                      <span className="block text-[13px] font-medium text-ink-2">{a.line}</span>
                    </span>
                    {canEdit && (
                      <span className="flex shrink-0 gap-1">
                        <Button size="xs" variant="subtle" aria-label={`Edit ${a.label} address`} onClick={() => setAddress(i)}>
                          <Pencil />
                        </Button>
                        <Button size="xs" variant="subtle" className="text-danger" aria-label={`Remove ${a.label} address`} onClick={() => removeAddress(i)}>
                          <Trash2 />
                        </Button>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {section === 'payments' && (
          <>
            <SectionLabel>Payments · {inr(payments.filter((b) => b.status !== 'refunded').reduce((s, b) => s + b.amount, 0))} paid</SectionLabel>
            {payments.length === 0 ? (
              <p className="text-sm font-medium text-muted">No payments yet.</p>
            ) : (
              <ul className="divide-y divide-line rounded-card border border-line">
                {payments.map((b) => (
                  <li key={b.id}>
                    <button type="button" onClick={() => setBooking(b.id)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-[13px] hover:bg-canvas/60">
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold">TXN-{b.id.replace('BK-', '')}</span>
                        <span className="block text-xs text-muted">
                          {b.id} · {dateTime(b.scheduledAt)} · {b.method ? METHOD[b.method] : '—'}
                          {b.coupon && ` · ${b.coupon}`}
                        </span>
                      </span>
                      <span className={cn('num font-extrabold', b.status === 'refunded' && 'text-muted line-through')}>{inr(b.amount)}</span>
                      <Chip tone={b.status === 'refunded' ? 'neutral' : 'success'}>{b.status === 'refunded' ? 'Refunded' : 'Paid'}</Chip>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {section === 'history' && (
          <>
            <SectionLabel>Completed services · {history.length}</SectionLabel>
            {history.length === 0 ? (
              <p className="text-sm font-medium text-muted">No completed services yet.</p>
            ) : (
              <ul className="divide-y divide-line rounded-card border border-line">
                {history.map((b) => {
                  const t = store.technician(b.technicianId)
                  return (
                    <li key={b.id}>
                      <button type="button" onClick={() => setBooking(b.id)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-canvas/60">
                        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
                          <ApplianceGlyph appliance={b.appliance} className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-bold">
                            {BRAND_LABEL[b.brand]} {APPLIANCE_LABEL[b.appliance]} · {b.service}
                          </span>
                          <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
                            {t && <Avatar name={t.name} size={16} side="technician" />}
                            {t?.name ?? '—'} · {dateTime(b.scheduledAt)}
                          </span>
                        </span>
                        {b.rating ? <Rating value={b.rating} /> : <span className="text-xs text-faint">Not rated</span>}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </>
        )}

        {section === 'reviews' && (
          <>
            <SectionLabel>Reviews written · {reviews.length}</SectionLabel>
            {reviews.length === 0 ? (
              <p className="text-sm font-medium text-muted">No reviews yet.</p>
            ) : (
              <ul className="space-y-2">
                {reviews.map((r) => (
                  <li key={r.id} className="rounded-lg border border-line px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <Rating value={r.rating} />
                      <span className="text-xs font-medium text-faint">
                        for {store.technician(r.technicianId)?.name} · {ago(r.at)}
                      </span>
                    </div>
                    {r.text && <p className="mt-1 text-[13px] font-medium text-ink-2">{r.text}</p>}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {section === 'tickets' && (
          <>
            <SectionLabel>Support tickets · {tickets.length}</SectionLabel>
            {tickets.length === 0 ? (
              <p className="text-sm font-medium text-muted">No tickets raised.</p>
            ) : (
              <ul className="space-y-2">
                {tickets.map((t) => (
                  <li key={t.id}>
                    <Link href={`/support/?id=${t.id}` as Route} className="flex items-center gap-3 rounded-lg border border-line px-3 py-2.5 hover:bg-canvas/60">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-bold">{t.subject}</span>
                        <span className="block text-xs font-medium text-muted">
                          {t.id} · {ago(t.createdAt)}
                        </span>
                      </span>
                      <Chip tone={TICKET_STATUS[t.status].tone}>{TICKET_STATUS[t.status].label}</Chip>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Drawer>

      <BookingDrawer id={booking} onClose={() => setBooking(null)} />
      {editing && <EditModal c={c} onClose={() => setEditing(false)} />}
      {address !== null && <AddressModal c={c} index={address} onClose={() => setAddress(null)} />}

      <Modal
        open={credit}
        onClose={() => setCredit(false)}
        title={`Add wallet credit for ${c.name}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCredit(false)}>
              Cancel
            </Button>
            <Button
              disabled={amount <= 0}
              onClick={() => {
                store.addWalletCredit(c.id, amount)
                toast(`${inr(amount)} credit added for ${c.name}`)
                setCredit(false)
              }}
            >
              Add {inr(amount)}
            </Button>
          </>
        }
      >
        <p className="mb-3 text-sm font-medium text-muted">Credit lands in the customer’s {BRAND.name} Wallet and applies to their next booking.</p>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Amount">
          {[100, 200, 500].map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={amount === v}
              onClick={() => setAmount(v)}
              className={cn('num h-12 rounded-lg border text-base font-extrabold transition-colors', amount === v ? 'border-brand bg-brand-soft text-brand ring-1 ring-brand' : 'border-line-strong hover:border-ink-2')}
            >
              {inr(v)}
            </button>
          ))}
        </div>
      </Modal>

      <Modal
        open={suspending}
        onClose={() => setSuspending(false)}
        title={suspended ? `Activate ${c.name}?` : `Suspend ${c.name}?`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSuspending(false)}>
              Cancel
            </Button>
            <Button
              variant={suspended ? 'success' : 'danger'}
              onClick={() => {
                store.setCustomerStatus(c.id, suspended ? 'active' : 'blocked')
                toast(`${c.name} ${suspended ? 'activated' : 'suspended'}`)
                setSuspending(false)
              }}
            >
              {suspended ? 'Activate' : 'Suspend customer'}
            </Button>
          </>
        }
      >
        <p className="text-sm font-medium text-muted">
          {suspended
            ? 'They will be able to sign in and book services again.'
            : 'They will not be able to place new bookings. Open bookings stay as they are until you cancel them.'}
        </p>
      </Modal>
    </>
  )
}

function BookingList({ list, onOpen, empty }: { list: Booking[]; onOpen: (id: string) => void; empty: string }) {
  if (list.length === 0) return <p className="text-sm font-medium text-muted">{empty}</p>
  return (
    <ul className="max-h-[460px] divide-y divide-line overflow-y-auto rounded-card border border-line">
      {list.map((b) => (
        <li key={b.id}>
          <button type="button" onClick={() => onOpen(b.id)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-canvas/60">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
              <ApplianceGlyph appliance={b.appliance} className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-bold">
                {BRAND_LABEL[b.brand]} {APPLIANCE_LABEL[b.appliance]} · {b.service}
              </span>
              <span className="block text-xs font-medium text-muted">
                {b.id} · {dateTime(b.scheduledAt)}
              </span>
            </span>
            <span className="num hidden text-[13px] font-bold sm:block">{inr(b.amount)}</span>
            <StatusChip status={b.status} />
          </button>
        </li>
      ))}
    </ul>
  )
}

function EditModal({ c, onClose }: { c: Customer; onClose: () => void }) {
  const store = useStore()
  const toast = useToast()
  const [f, setF] = useState({ name: c.name, phone: c.phone, email: c.email, area: c.area })
  const valid = f.name.trim().length > 1 && f.phone.replace(/\D/g, '').length >= 10 && /\S+@\S+\.\S+/.test(f.email)
  const save = () => {
    const changed = (Object.keys(f) as (keyof typeof f)[]).filter((k) => c[k] !== f[k].trim())
    if (!changed.length) return onClose()
    store.updateCustomer(
      c.id,
      { name: f.name.trim(), phone: f.phone.trim(), email: f.email.trim(), area: f.area },
      { action: 'Edited customer profile', target: c.name, old: changed.map((k) => `${k}: ${c[k]}`).join('; '), new: changed.map((k) => `${k}: ${f[k].trim()}`).join('; ') }
    )
    toast(`${f.name.trim()}’s profile updated`)
    onClose()
  }
  return (
    <Modal
      open
      onClose={onClose}
      title={`Edit ${c.name}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!valid} onClick={save}>
            Save changes
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Full name" className="sm:col-span-2">
          <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Mobile">
          <input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} inputMode="tel" className={inputClass} />
        </Field>
        <Field label="Area">
          <Select full label="Area" value={f.area} onChange={(v) => setF({ ...f, area: v })} options={AREAS.map((a) => ({ value: a.area, label: a.area }))} />
        </Field>
        <Field label="Email" className="sm:col-span-2">
          <input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} type="email" className={inputClass} />
        </Field>
      </div>
    </Modal>
  )
}

function AddressModal({ c, index, onClose }: { c: Customer; index: number | 'new'; onClose: () => void }) {
  const store = useStore()
  const toast = useToast()
  const current = index === 'new' ? undefined : c.addresses[index]
  const [label, setLabel] = useState(current?.label ?? 'Home')
  const [line, setLine] = useState(current?.line ?? '')
  const [primary, setPrimary] = useState(index === 0)
  const valid = label.trim().length > 0 && line.trim().length > 8
  const save = () => {
    const entry = { label: label.trim(), line: line.trim() }
    let next = index === 'new' ? [...c.addresses, entry] : c.addresses.map((a, i) => (i === index ? entry : a))
    if (primary) {
      const at = index === 'new' ? next.length - 1 : index
      next = [next[at]!, ...next.filter((_, i) => i !== at)]
    }
    store.updateCustomer(
      c.id,
      { addresses: next, address: next[0]!.line },
      index === 'new'
        ? { action: 'Added address', target: c.name, new: `${entry.label}: ${entry.line}` }
        : { action: 'Edited address', target: c.name, old: `${current!.label}: ${current!.line}`, new: `${entry.label}: ${entry.line}` }
    )
    toast(index === 'new' ? 'Address added' : 'Address updated')
    onClose()
  }
  return (
    <Modal
      open
      onClose={onClose}
      title={index === 'new' ? 'Add address' : 'Edit address'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!valid} onClick={save}>
            Save address
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Label">
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Home, Office, Parents…" className={inputClass} />
        </Field>
        <Field label="Full address">
          <textarea value={line} onChange={(e) => setLine(e.target.value)} rows={3} className={inputClass} />
        </Field>
        <label className="flex items-center gap-2 text-sm font-semibold text-ink-2">
          <input type="checkbox" checked={primary} onChange={(e) => setPrimary(e.target.checked)} className="size-4 accent-[var(--color-brand)]" />
          Use as primary address for bookings
        </label>
      </div>
    </Modal>
  )
}
