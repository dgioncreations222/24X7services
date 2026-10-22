'use client'

/**
 * Running the console itself: support tickets, admin users and what each
 * role may do, and the business settings. Every change is audited.
 */
import { useSyncExternalStore } from 'react'
import { read, subscribe, write } from '../mock/db'
import { ADMIN_ROLES } from '../types'
import { audit } from './audit'
import { currentAdmin } from './auth'
import { guarded } from './permissions'
import { useResource, type Query } from './query'
import type { AdminAccount, AdminRole, BusinessSettings, Module, Perm, RoleMatrix, SupportTicket, TicketPriority, TicketStatus } from './types'

export class SystemError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SystemError'
  }
}
const fail = (m: string): never => {
  throw new SystemError(m)
}
const me = () => currentAdmin()?.name ?? 'Admin'

/* --------------------------------------------------------------- Support */

export function useTickets(): Query<SupportTicket[]> {
  return useResource((db) => [...db.tickets].sort((a, b) => b.createdAt - a.createdAt))
}

const openOf = () => read().tickets.filter((t) => t.status === 'open').length

/** Tickets nobody has picked up, for the sidebar badge. */
export function useOpenTicketCount(): number {
  return useSyncExternalStore(subscribe, openOf, () => 0)
}

export function useTicket(id: string | null | undefined): Query<SupportTicket | null> {
  return useResource((db) => db.tickets.find((t) => t.id === id) ?? null)
}

function ticket(id: string) {
  return read().tickets.find((t) => t.id === id) ?? fail('This ticket no longer exists.')
}
function patchTicket(id: string, fn: (t: SupportTicket) => SupportTicket) {
  write((d) => ({ ...d, tickets: d.tickets.map((t) => (t.id === id ? fn(t) : t)) }))
}

/** Answer the person. An open ticket moves to In progress and is yours if nobody had it. */
export function replyToTicket(id: string, text: string) {
  return guarded([['support', 'edit']], () => {
    const t = ticket(id)
    if (t.status === 'resolved') fail('Reopen the ticket to reply.')
    const body = text.trim()
    if (body.length < 2) fail('Write a reply.')
    patchTicket(id, (x) => ({
      ...x,
      status: 'in_progress',
      assignee: x.assignee ?? me(),
      messages: [...x.messages, { from: 'agent', text: body, at: Date.now(), by: me() }],
    }))
    audit('support', 'Replied to ticket', { target: t.id })
  })
}

export function assignTicket(id: string, adminName: string) {
  return guarded([['support', 'edit']], () => {
    const t = ticket(id)
    patchTicket(id, (x) => ({ ...x, assignee: adminName, messages: [...x.messages, { from: 'system', text: `Assigned to ${adminName}`, at: Date.now(), by: me() }] }))
    audit('support', 'Assigned ticket', { target: t.id, old: t.assignee ?? 'Nobody', new: adminName })
  })
}

export function setTicketStatus(id: string, status: TicketStatus) {
  return guarded([['support', 'edit']], () => {
    const t = ticket(id)
    if (t.status === status) return
    if (status === 'resolved' && !t.messages.some((m) => m.from === 'agent')) fail('Reply to the person before resolving.')
    const text = status === 'resolved' ? `Resolved by ${me()}` : status === 'open' ? `Reopened by ${me()}` : `Picked up by ${me()}`
    patchTicket(id, (x) => ({ ...x, status, messages: [...x.messages, { from: 'system', text, at: Date.now(), by: me() }] }))
    audit('support', status === 'resolved' ? 'Resolved ticket' : 'Changed ticket status', { target: t.id, old: t.status, new: status })
  })
}

export function setTicketPriority(id: string, priority: TicketPriority) {
  return guarded([['support', 'edit']], () => {
    const t = ticket(id)
    patchTicket(id, (x) => ({ ...x, priority }))
    audit('support', 'Changed ticket priority', { target: t.id, old: t.priority, new: priority })
  })
}

/* ----------------------------------------------------------- Admin users */

export function useAdmins(): Query<AdminAccount[]> {
  return useResource((db) => [...db.admins].sort((a, b) => ADMIN_ROLES.indexOf(a.role) - ADMIN_ROLES.indexOf(b.role) || a.name.localeCompare(b.name)))
}

/** Only a Super Admin makes, unmakes or disables a Super Admin — otherwise a role could promote itself. */
function superOnly() {
  if (currentAdmin()?.role !== 'Super Admin') fail('Only a Super Admin can change a Super Admin.')
}

const activeSupers = (admins: AdminAccount[]) => admins.filter((a) => a.role === 'Super Admin' && a.status === 'active')

export function inviteAdmin(input: { name: string; email: string; role: AdminRole }) {
  return guarded([['admins', 'create']], () => {
    const name = input.name.trim()
    const email = input.email.trim().toLowerCase()
    if (name.length < 2) fail('Enter their full name.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('Enter a valid email address.')
    if (read().admins.some((a) => a.email === email)) fail('Someone with this email is already an admin.')
    if (input.role === 'Super Admin') superOnly()
    const admin: AdminAccount = { id: `ADM-${Date.now().toString(36).toUpperCase()}`, name, email, role: input.role, status: 'invited', createdAt: Date.now() }
    write((d) => ({ ...d, admins: [...d.admins, admin] }))
    audit('admins', 'Invited admin', { target: name, new: input.role })
    return admin
  })
}

export function setAdminRole(id: string, role: AdminRole) {
  return guarded([['admins', 'edit']], () => {
    const db = read()
    const a = db.admins.find((x) => x.id === id) ?? fail('This admin no longer exists.')
    if (a.id === currentAdmin()?.id) fail('You cannot change your own role. Ask another Super Admin.')
    if (a.role === 'Super Admin' || role === 'Super Admin') superOnly()
    if (a.role === 'Super Admin' && role !== 'Super Admin' && activeSupers(db.admins).length <= 1) fail('Keep at least one active Super Admin.')
    write((d) => ({ ...d, admins: d.admins.map((x) => (x.id === id ? { ...x, role } : x)) }))
    audit('admins', 'Changed role', { target: a.name, old: a.role, new: role })
  })
}

/** Disable or re-enable an admin; a disabled admin is signed out at once. */
export function setAdminDisabled(id: string, disabled: boolean) {
  return guarded([['admins', 'edit']], () => {
    const db = read()
    const a = db.admins.find((x) => x.id === id) ?? fail('This admin no longer exists.')
    if (a.id === currentAdmin()?.id) fail('You cannot disable yourself.')
    if (a.role === 'Super Admin') superOnly()
    if (disabled && a.role === 'Super Admin' && a.status === 'active' && activeSupers(db.admins).length <= 1) fail('Keep at least one active Super Admin.')
    const status = disabled ? 'disabled' : a.status === 'disabled' ? 'active' : a.status
    write((d) => ({ ...d, admins: d.admins.map((x) => (x.id === id ? { ...x, status } : x)) }))
    audit('admins', disabled ? 'Disabled admin' : 'Enabled admin', { target: a.name, old: a.status, new: status })
  })
}

/* ------------------------------------------------------------------ Roles */

export function useRoles(): Query<RoleMatrix> {
  return useResource((db) => db.roles)
}

/** Turn one permission on or off for a role in a module. Super Admin is fixed. */
export function setRolePermission(role: AdminRole, module: Module, perm: Perm, on: boolean) {
  return guarded('super', () => {
    if (role === 'Super Admin') fail('Super Admin always has every permission.')
    const current = read().roles[role][module] ?? []
    let next = on ? [...new Set([...current, perm])] : current.filter((p) => p !== perm)
    // Without view the other permissions mean nothing; with anything, view comes along.
    if (!on && perm === 'view') next = []
    if (on && perm !== 'view' && !next.includes('view')) next = ['view', ...next]
    write((d) => ({ ...d, roles: { ...d.roles, [role]: { ...d.roles[role], [module]: next } } }))
    audit('admins', on ? 'Granted permission' : 'Removed permission', { target: `${role} · ${module}`, old: current.join(', ') || 'none', new: next.join(', ') || 'none' })
  })
}

/* --------------------------------------------------------------- Settings */

export function useSettings(): Query<BusinessSettings> {
  return useResource((db) => db.settings)
}

const LABEL: Record<keyof BusinessSettings, string> = {
  commissionPct: 'Commission %',
  gstPct: 'GST %',
  emergencySurcharge: 'Emergency surcharge',
  freeCancelHours: 'Free cancellation (hours)',
  cancellationFee: 'Cancellation fee',
  offerTimeoutSec: 'Offer timeout (s)',
  autoAssign: 'Auto-assign',
  emergencySlaMin: 'Emergency SLA (min)',
  supportPhone: 'Support phone',
}

export function saveSettings(next: BusinessSettings) {
  return guarded([['settings', 'edit']], () => {
    if (next.commissionPct < 0 || next.commissionPct > 50) fail('Commission must be 0–50%.')
    if (next.gstPct < 0 || next.gstPct > 28) fail('GST must be 0–28%.')
    if (next.offerTimeoutSec < 10 || next.offerTimeoutSec > 120) fail('Give technicians 10–120 seconds to answer an offer.')
    if (next.emergencySlaMin < 10 || next.emergencySlaMin > 240) fail('Emergency SLA must be 10–240 minutes.')
    if (next.freeCancelHours < 0 || next.freeCancelHours > 72) fail('Free cancellation window is 0–72 hours.')
    if (next.emergencySurcharge < 0 || next.cancellationFee < 0) fail('Charges cannot be negative.')
    if (!/^\+?[\d\s-]{10,16}$/.test(next.supportPhone.trim())) fail('Enter the support phone number in full.')
    const before = read().settings
    const changed = (Object.keys(LABEL) as (keyof BusinessSettings)[]).filter((k) => before[k] !== next[k])
    if (!changed.length) return 0
    write((d) => ({ ...d, settings: { ...next, supportPhone: next.supportPhone.trim() } }))
    for (const k of changed) audit('settings', `Changed ${LABEL[k]}`, { old: String(before[k]), new: String(next[k]) })
    return changed.length
  })
}
