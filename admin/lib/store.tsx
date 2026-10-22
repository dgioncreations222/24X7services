'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { seed, type Seed } from './seed'
import { controlSeed, type Control } from './control'
import type {
  Activity,
  ActivityKind,
  AdminRole,
  AdminSettings,
  AdminUser,
  AiCallConfig,
  AiChatConfig,
  AuditEntry,
  Catalog,
  MediaItem,
  Module,
  Perm,
  SiteContent,
  Booking,
  BookingStatus,
  Broadcast,
  Coupon,
  Customer,
  KycStatus,
  Payout,
  Review,
  Technician,
  Ticket,
  TicketStatus,
} from './types'

/**
 * The console's state, kept on the device.
 *
 * Like the two apps it oversees, the console has no backend yet: the seeded
 * network lives here and every action — assigning, refunding, approving a
 * technician — is applied to it and saved to localStorage. Storage can be
 * unavailable, so reads and writes are guarded and the console runs from the
 * seed instead.
 */

// v2: the control centre (roles, AI, content, catalogue) joined the state.
// v3: the 'ibm' brand became 'ifb'; older saves hold prices and logos keyed to it.
// v4: one admin (Aditi) for now; older saves still hold the rest of the team.
const KEY = 'admin.state.v4'

/**
 * The admin using the console — who the older pages greet and the audit log
 * names. AppShell points it at the signed-in admin (lib/data's session).
 */
export const ADMIN: { name: string; role: AdminRole; email: string } = { name: 'Aditi Rao', role: 'Super Admin', email: 'aditi.rao@customerservice.example' }

export function actAs(admin: { name: string; role: AdminRole; email: string }) {
  ADMIN.name = admin.name
  ADMIN.role = admin.role
  ADMIN.email = admin.email
}

interface Persisted extends Seed, Control {
  signedIn: boolean
  /** The role the console is being viewed as — Super Admin unless switched for a preview. */
  as: AdminRole
  seededOn: string
  /** Notification ids the admin has opened. */
  seen: string[]
}

function fresh(): Persisted {
  const base = seed()
  return { ...base, ...controlSeed(base), signedIn: true, as: 'Super Admin', seededOn: new Date().toDateString(), seen: [] }
}

/** What an admin configured survives the nightly rebuild of the demo network. */
const KEPT = ['settings', 'roles', 'admins', 'audit', 'aiChat', 'aiCall', 'media', 'content', 'published', 'contentPublishedAt', 'catalog', 'catalogPublished', 'catalogPublishedAt', 'coupons', 'as'] as const

function load(): Persisted {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const saved = JSON.parse(raw) as Persisted
      // The demo month is rebuilt each day so "today" never goes stale; the
      // console's own settings carry over.
      if (saved.seededOn === new Date().toDateString()) return { ...fresh(), ...saved, signedIn: true }
      const next = fresh()
      for (const k of KEPT) if (saved[k] !== undefined) (next as unknown as Record<string, unknown>)[k] = saved[k]
      return next
    }
  } catch {
    /* storage unavailable — run from the seed */
  }
  return fresh()
}

let seq = 1

const KIND_MODULE: Record<ActivityKind, Module> = {
  booking: 'bookings',
  dispatch: 'dispatch',
  payment: 'payments',
  technician: 'technicians',
  customer: 'customers',
  support: 'support',
  system: 'settings',
}

interface Store extends Persisted {
  ready: boolean
  signIn: () => void
  signOut: () => void
  customer: (id: string) => Customer | undefined
  technician: (id?: string) => Technician | undefined
  /** Assign or reassign a booking; moves an unassigned booking to Assigned. */
  assign: (bookingId: string, techId: string) => void
  setStatus: (bookingId: string, status: BookingStatus, note?: string) => void
  cancel: (bookingId: string, reason: string) => void
  refund: (bookingId: string) => void
  reschedule: (bookingId: string, iso: string) => void
  setCustomerStatus: (id: string, status: Customer['status']) => void
  addWalletCredit: (id: string, amount: number) => void
  setKyc: (id: string, kyc: KycStatus) => void
  setDoc: (id: string, doc: keyof Technician['docs'], on: boolean) => void
  settleCash: (id: string) => void
  payOut: (ids: string[]) => void
  replyTicket: (id: string, text: string) => void
  setTicketStatus: (id: string, status: TicketStatus) => void
  assignTicket: (id: string, who: string) => void
  setReviewStatus: (id: string, status: Review['status']) => void
  saveCoupon: (c: Coupon) => void
  toggleCoupon: (code: string) => void
  sendBroadcast: (b: Omit<Broadcast, 'id' | 'at' | 'reach'>) => void
  updateSettings: (patch: Partial<AdminSettings> | ((s: AdminSettings) => Partial<AdminSettings>)) => void
  markSeen: (ids: string[]) => void
  resetDemo: () => void

  /* ---- Control centre ---- */
  /** Whether the current role may do `perm` in `module`. */
  can: (module: Module, perm?: Perm) => boolean
  /** Preview the console as another role (demo). */
  viewAs: (role: AdminRole) => void
  /** Record an accountable change. Every store action below already calls it. */
  record: (e: Omit<AuditEntry, 'id' | 'at' | 'admin' | 'role'>) => void
  updateTechnician: (id: string, patch: Partial<Technician>, note?: Change) => void
  updateCustomer: (id: string, patch: Partial<Customer>, note?: Change) => void
  deleteCoupon: (code: string) => void
  updateAiChat: (patch: Partial<AiChatConfig>, note?: Change) => void
  updateAiCall: (patch: Partial<AiCallConfig>, note?: Change) => void
  /** Edit the customer-app content draft; nothing reaches customers until publishContent. */
  updateContent: (fn: (c: SiteContent) => SiteContent, note: Change) => void
  publishContent: () => void
  discardContent: () => void
  addMedia: (item: Omit<MediaItem, 'id' | 'uploadedAt' | 'uploadedBy'>) => MediaItem
  replaceMedia: (id: string, patch: Partial<Pick<MediaItem, 'url' | 'size' | 'width' | 'height' | 'name' | 'alt' | 'category'>>) => void
  deleteMedia: (id: string) => void
  /** Edit the catalogue draft (services, brands, prices); publishCatalog makes it live. */
  updateCatalog: (fn: (c: Catalog) => Catalog, note: Change) => void
  publishCatalog: () => void
  discardCatalog: () => void
  saveAdmin: (u: AdminUser) => void
  removeAdmin: (id: string) => void
  setRolePerms: (role: AdminRole, module: Module, perms: Perm[]) => void
}

/** How a change reads in the audit log. */
export interface Change {
  action: string
  target?: string
  old?: string
  new?: string
}

const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Persisted>(fresh)
  const [ready, setReady] = useState(false)
  const loaded = useRef(false)

  useEffect(() => {
    // Read storage only after mount: the static HTML is built on a machine
    // with a different clock, so rendering the seed there would never match.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(load())
    loaded.current = true
    setReady(true)
  }, [])

  useEffect(() => {
    if (!loaded.current) return
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* quota — the session still works */
    }
  }, [state])

  const writeAudit = useCallback((module: Module, c: Change) => {
    setState((s) => {
      const e: AuditEntry = { id: `AU-L${Date.now()}-${seq++}`, at: new Date().toISOString(), admin: ADMIN.name, role: s.as, module, ...c }
      return { ...s, audit: [e, ...s.audit].slice(0, 1000) }
    })
  }, [])

  /** The activity feed line plus its audit entry. */
  const log = useCallback(
    (kind: ActivityKind, text: string, audit?: Change & { module?: Module }) => {
      const a: Activity = { id: `AC-L${Date.now()}-${seq++}`, kind, text, at: new Date().toISOString(), actor: ADMIN.name }
      setState((s) => ({ ...s, activity: [a, ...s.activity].slice(0, 200) }))
      const { module = KIND_MODULE[kind], ...change } = audit ?? { action: text }
      writeAudit(module, change)
    },
    [writeAudit]
  )

  const patchBooking = useCallback((id: string, fn: (b: Booking) => Booking) => {
    setState((s) => ({ ...s, bookings: s.bookings.map((b) => (b.id === id ? fn(b) : b)) }))
  }, [])

  const value = useMemo<Store>(() => {
    const now = () => new Date().toISOString()
    const tech = (id?: string) => state.technicians.find((t) => t.id === id)
    return {
      ...state,
      ready,
      signIn: () => setState((s) => ({ ...s, signedIn: true })),
      signOut: () => setState((s) => ({ ...s, signedIn: false })),
      customer: (id) => state.customers.find((c) => c.id === id),
      technician: tech,
      assign: (bookingId, techId) => {
        const b = state.bookings.find((x) => x.id === bookingId)
        patchBooking(bookingId, (x) => {
          const first = x.status === 'confirmed' || x.status === 'pending_payment'
          return {
            ...x,
            technicianId: techId,
            status: first ? 'assigned' : x.status,
            timeline: [...x.timeline, { status: 'assigned', at: now(), note: first ? undefined : `Reassigned to ${tech(techId)?.name}` }],
          }
        })
        log('dispatch', `${bookingId} ${b?.technicianId ? 'reassigned' : 'assigned'} to ${tech(techId)?.name}`, {
          module: 'bookings',
          action: b?.technicianId ? 'Reassigned technician' : 'Assigned technician',
          target: bookingId,
          old: tech(b?.technicianId)?.name ?? 'Unassigned',
          new: tech(techId)?.name,
        })
      },
      setStatus: (bookingId, status, note) => {
        patchBooking(bookingId, (x) => ({
          ...x,
          status,
          paid: status === 'completed' ? true : x.paid,
          timeline: [...x.timeline, { status, at: now(), note }],
        }))
        log('booking', `${bookingId} marked ${status.replace('_', ' ')}`, {
          action: 'Changed booking status',
          target: bookingId,
          old: state.bookings.find((x) => x.id === bookingId)?.status.replace('_', ' '),
          new: status.replace('_', ' '),
        })
      },
      cancel: (bookingId, reason) => {
        patchBooking(bookingId, (x) => ({ ...x, status: 'cancelled', cancelReason: reason, timeline: [...x.timeline, { status: 'cancelled', at: now(), note: reason }] }))
        log('booking', `${bookingId} cancelled — ${reason}`, { action: 'Cancelled booking', target: bookingId, new: reason })
      },
      refund: (bookingId) => {
        const b = state.bookings.find((x) => x.id === bookingId)
        patchBooking(bookingId, (x) => ({
          ...x,
          status: 'refunded',
          timeline: [...x.timeline, ...(x.status !== 'cancelled' ? [{ status: 'cancelled' as const, at: now() }] : []), { status: 'refunded', at: now() }],
        }))
        log('payment', `Refund of ₹${b?.amount.toLocaleString('en-IN')} issued for ${bookingId}`, {
          action: 'Issued refund',
          target: bookingId,
          old: '—',
          new: `₹${b?.amount.toLocaleString('en-IN')}`,
        })
      },
      reschedule: (bookingId, iso) => {
        patchBooking(bookingId, (x) => ({ ...x, scheduledAt: iso }))
        log('booking', `${bookingId} rescheduled`)
      },
      setCustomerStatus: (id, status) => {
        setState((s) => ({ ...s, customers: s.customers.map((c) => (c.id === id ? { ...c, status } : c)) }))
        log('customer', `${state.customers.find((c) => c.id === id)?.name} ${status === 'blocked' ? 'blocked' : 'unblocked'}`, {
          action: status === 'blocked' ? 'Suspended customer' : 'Activated customer',
          target: state.customers.find((c) => c.id === id)?.name,
          old: status === 'blocked' ? 'Active' : 'Suspended',
          new: status === 'blocked' ? 'Suspended' : 'Active',
        })
      },
      addWalletCredit: (id, amount) => {
        setState((s) => ({ ...s, customers: s.customers.map((c) => (c.id === id ? { ...c, walletCredit: c.walletCredit + amount } : c)) }))
        log('customer', `₹${amount} wallet credit added for ${state.customers.find((c) => c.id === id)?.name}`)
      },
      setKyc: (id, kyc) => {
        setState((s) => ({
          ...s,
          technicians: s.technicians.map((t) => (t.id === id ? { ...t, kyc, presence: kyc === 'verified' ? t.presence : 'offline' } : t)),
        }))
        const verb: Record<KycStatus, string> = { verified: 'approved', rejected: 'rejected', suspended: 'suspended', pending: 'moved back to review' }
        log('technician', `${tech(id)?.name} ${verb[kyc]}`, { action: `Technician ${verb[kyc]}`, target: tech(id)?.name, old: tech(id)?.kyc, new: kyc })
      },
      setDoc: (id, doc, on) =>
        setState((s) => ({ ...s, technicians: s.technicians.map((t) => (t.id === id ? { ...t, docs: { ...t.docs, [doc]: on } } : t)) })),
      settleCash: (id) => {
        const t = tech(id)
        setState((s) => ({ ...s, technicians: s.technicians.map((x) => (x.id === id ? { ...x, cashInHand: 0 } : x)) }))
        log('payment', `Cash deposit of ₹${t?.cashInHand.toLocaleString('en-IN')} recorded for ${t?.name}`, {
          module: 'payouts',
          action: 'Recorded cash deposit',
          target: t?.name,
          old: `₹${t?.cashInHand.toLocaleString('en-IN')}`,
          new: '₹0',
        })
      },
      payOut: (ids) => {
        const list = state.payouts.filter((p) => ids.includes(p.id) && p.status !== 'paid')
        setState((s) => ({ ...s, payouts: s.payouts.map((p): Payout => (ids.includes(p.id) ? { ...p, status: 'paid', at: now() } : p)) }))
        const total = list.reduce((sum, p) => sum + p.gross - p.commission, 0)
        log('payment', `${list.length} payout${list.length === 1 ? '' : 's'} released · ₹${total.toLocaleString('en-IN')}`, {
          module: 'payouts',
          action: 'Released payouts',
          target: `${list.length} payout${list.length === 1 ? '' : 's'}`,
          new: `₹${total.toLocaleString('en-IN')}`,
        })
      },
      replyTicket: (id, text) => {
        setState((s) => ({
          ...s,
          tickets: s.tickets.map(
            (t): Ticket =>
              t.id === id
                ? { ...t, status: t.status === 'open' ? 'in_progress' : t.status, assignee: t.assignee ?? ADMIN.name, messages: [...t.messages, { from: 'agent', text, at: now() }] }
                : t
          ),
        }))
        log('support', `Replied on ${id}`)
      },
      setTicketStatus: (id, status) => {
        setState((s) => ({
          ...s,
          tickets: s.tickets.map((t) =>
            t.id === id
              ? { ...t, status, messages: status === 'resolved' ? [...t.messages, { from: 'system' as const, text: `Marked resolved by ${ADMIN.name}`, at: now() }] : t.messages }
              : t
          ),
        }))
        log('support', `${id} ${status === 'resolved' ? 'resolved' : 'reopened'}`)
      },
      assignTicket: (id, who) => {
        setState((s) => ({ ...s, tickets: s.tickets.map((t) => (t.id === id ? { ...t, assignee: who } : t)) }))
        log('support', `${id} assigned to ${who}`)
      },
      setReviewStatus: (id, status) => {
        setState((s) => ({ ...s, reviews: s.reviews.map((r) => (r.id === id ? { ...r, status } : r)) }))
        log('customer', `Review ${id} ${status}`, { module: 'reviews', action: 'Changed review status', target: id, old: state.reviews.find((r) => r.id === id)?.status, new: status })
      },
      saveCoupon: (c) => {
        const exists = state.coupons.some((x) => x.code === c.code)
        setState((s) => ({ ...s, coupons: exists ? s.coupons.map((x) => (x.code === c.code ? c : x)) : [c, ...s.coupons] }))
        log('system', `Coupon ${c.code} ${exists ? 'updated' : 'created'}`, {
          module: 'promotions',
          action: exists ? 'Edited offer' : 'Created offer',
          target: c.code,
          new: `${c.kind === 'percent' ? `${c.value}%` : `₹${c.value}`} off`,
        })
      },
      toggleCoupon: (code) => {
        const c = state.coupons.find((x) => x.code === code)
        setState((s) => ({ ...s, coupons: s.coupons.map((x) => (x.code === code ? { ...x, active: !x.active } : x)) }))
        log('system', `Coupon ${code} ${c?.active ? 'paused' : 'activated'}`, {
          module: 'promotions',
          action: c?.active ? 'Paused offer' : 'Activated offer',
          target: code,
          old: c?.active ? 'Active' : 'Paused',
          new: c?.active ? 'Paused' : 'Active',
        })
      },
      sendBroadcast: (b) => {
        const reach =
          b.audience === 'customers'
            ? state.customers.filter((c) => c.status === 'active').length
            : b.audience === 'technicians'
              ? state.technicians.filter((t) => t.kyc === 'verified').length
              : state.customers.filter((c) => c.status === 'active').length + state.technicians.filter((t) => t.kyc === 'verified').length
        setState((s) => ({ ...s, broadcasts: [{ ...b, id: `BC-${42 + s.broadcasts.length}`, at: now(), reach }, ...s.broadcasts] }))
        log('system', `Push sent to ${b.audience}: “${b.title}”`, { module: 'promotions', action: 'Sent push notification', target: b.audience, new: b.title })
      },
      updateSettings: (patch) => {
        setState((s) => ({ ...s, settings: { ...s.settings, ...(typeof patch === 'function' ? patch(s.settings) : patch) } }))
      },
      markSeen: (ids) => setState((s) => ({ ...s, seen: [...new Set([...s.seen, ...ids])] })),
      resetDemo: () => setState(fresh()),

      can: (module, perm = 'view') => !!state.roles[state.as]?.[module]?.includes(perm),
      viewAs: (role) => setState((s) => ({ ...s, as: role })),
      record: ({ module, ...change }) => writeAudit(module, change),
      updateTechnician: (id, patch, note) => {
        setState((s) => ({ ...s, technicians: s.technicians.map((t) => (t.id === id ? { ...t, ...patch } : t)) }))
        writeAudit('technicians', note ?? { action: 'Edited technician', target: tech(id)?.name })
      },
      updateCustomer: (id, patch, note) => {
        setState((s) => ({ ...s, customers: s.customers.map((c) => (c.id === id ? { ...c, ...patch } : c)) }))
        writeAudit('customers', note ?? { action: 'Edited customer', target: state.customers.find((c) => c.id === id)?.name })
      },
      deleteCoupon: (code) => {
        setState((s) => ({ ...s, coupons: s.coupons.filter((c) => c.code !== code) }))
        writeAudit('promotions', { action: 'Deleted offer', target: code })
      },
      updateAiChat: (patch, note) => {
        setState((s) => ({ ...s, aiChat: { ...s.aiChat, ...patch } }))
        writeAudit('ai', note ?? { action: 'Updated AI chat agent', target: Object.keys(patch).join(', ') })
      },
      updateAiCall: (patch, note) => {
        setState((s) => ({ ...s, aiCall: { ...s.aiCall, ...patch } }))
        writeAudit('ai', note ?? { action: 'Updated AI call agent', target: Object.keys(patch).join(', ') })
      },
      updateContent: (fn, note) => {
        setState((s) => ({ ...s, content: fn(structuredClone(s.content)) }))
        writeAudit('content', note)
      },
      publishContent: () => {
        setState((s) => ({ ...s, published: structuredClone(s.content), contentPublishedAt: now() }))
        writeAudit('content', { action: 'Published content', target: 'Customer app', old: 'Draft', new: 'Live' })
      },
      discardContent: () => {
        setState((s) => ({ ...s, content: structuredClone(s.published) }))
        writeAudit('content', { action: 'Discarded content draft' })
      },
      addMedia: (item) => {
        const m: MediaItem = { ...item, id: `MD-${Date.now().toString(36).toUpperCase()}${seq++}`, uploadedAt: now(), uploadedBy: ADMIN.name }
        setState((s) => ({ ...s, media: [m, ...s.media] }))
        writeAudit('content', { action: 'Uploaded media', target: m.name, new: m.category })
        return m
      },
      replaceMedia: (id, patch) => {
        const before = state.media.find((m) => m.id === id)
        setState((s) => ({ ...s, media: s.media.map((m) => (m.id === id ? { ...m, ...patch, uploadedAt: patch.url ? now() : m.uploadedAt } : m)) }))
        writeAudit('content', {
          action: patch.url ? 'Replaced media file' : 'Edited media details',
          target: before?.name,
          old: patch.url ? before?.name : undefined,
          new: patch.name ?? (patch.url ? 'new file' : undefined),
        })
      },
      deleteMedia: (id) => {
        const before = state.media.find((m) => m.id === id)
        setState((s) => ({ ...s, media: s.media.filter((m) => m.id !== id) }))
        writeAudit('content', { action: 'Deleted media', target: before?.name })
      },
      updateCatalog: (fn, note) => {
        setState((s) => ({ ...s, catalog: fn(structuredClone(s.catalog)) }))
        writeAudit('catalog', note)
      },
      publishCatalog: () => {
        setState((s) => ({ ...s, catalogPublished: structuredClone(s.catalog), catalogPublishedAt: now() }))
        writeAudit('catalog', { action: 'Published catalogue', target: 'Services & Pricing', old: 'Draft', new: 'Live' })
      },
      discardCatalog: () => {
        setState((s) => ({ ...s, catalog: structuredClone(s.catalogPublished) }))
        writeAudit('catalog', { action: 'Discarded catalogue draft' })
      },
      saveAdmin: (u) => {
        const before = state.admins.find((a) => a.id === u.id)
        setState((s) => ({ ...s, admins: before ? s.admins.map((a) => (a.id === u.id ? u : a)) : [...s.admins, u] }))
        writeAudit(
          'admins',
          !before
            ? { action: 'Invited admin', target: u.name, new: u.role }
            : before.role !== u.role
              ? { action: 'Changed role', target: u.name, old: before.role, new: u.role }
              : before.status !== u.status
                ? { action: u.status === 'disabled' ? 'Disabled admin' : 'Enabled admin', target: u.name, old: before.status, new: u.status }
                : { action: 'Edited admin', target: u.name }
        )
      },
      removeAdmin: (id) => {
        const before = state.admins.find((a) => a.id === id)
        setState((s) => ({ ...s, admins: s.admins.filter((a) => a.id !== id) }))
        writeAudit('admins', { action: 'Removed admin', target: before?.name, old: before?.role })
      },
      setRolePerms: (role, module, perms) => {
        const before = state.roles[role]?.[module] ?? []
        setState((s) => ({ ...s, roles: { ...s.roles, [role]: { ...s.roles[role], [module]: perms } } }))
        writeAudit('admins', { action: 'Changed permissions', target: `${role} · ${module}`, old: before.join(', ') || 'none', new: perms.join(', ') || 'none' })
      },
    }
  }, [state, ready, patchBooking, log, writeAudit])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore(): Store {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore outside StoreProvider')
  return s
}

/** Re-render on a clock, for "min ago" labels. */
export function useTick(ms = 30_000): number {
  const [t, setT] = useState(() => Date.now())
  useEffect(() => {
    const i = setInterval(() => setT(Date.now()), ms)
    return () => clearInterval(i)
  }, [ms])
  return t
}
