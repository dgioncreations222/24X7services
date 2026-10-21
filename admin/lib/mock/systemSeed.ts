/**
 * Support tickets, the audit log, roles and business settings for the mock,
 * from the old console's seed.
 */
import { DEFAULT_ROLES, controlSeed } from '../control'
import { seed } from '../seed'
import type { AuditEntry, BusinessSettings, RoleMatrix, SupportTicket } from '../data/types'

const ms = (iso: string) => new Date(iso).getTime()

export function seedSystem(now = Date.now()) {
  const base = seed(now)
  const control = controlSeed(base, now)
  const person = (side: 'customer' | 'technician', id: string) =>
    (side === 'customer' ? base.customers.find((c) => c.id === id)?.name : base.technicians.find((t) => t.id === id)?.name) ?? id

  const tickets: SupportTicket[] = base.tickets.map((t) => ({
    id: t.id,
    side: t.side,
    personId: t.personId,
    personName: person(t.side, t.personId),
    subject: t.subject,
    category: t.category,
    priority: t.priority,
    status: t.status,
    createdAt: ms(t.createdAt),
    bookingId: t.bookingId,
    assignee: t.assignee,
    messages: t.messages.map((m) => ({ from: m.from, text: m.text, at: ms(m.at), by: m.from === 'agent' ? t.assignee : undefined })),
  }))

  const audit: AuditEntry[] = control.audit.map((a) => ({ ...a, at: ms(a.at) }))
  const roles: RoleMatrix = structuredClone(DEFAULT_ROLES)
  const settings: BusinessSettings = {
    commissionPct: base.settings.commissionPct,
    gstPct: base.settings.gstPct,
    emergencySurcharge: base.settings.emergencySurcharge * 100,
    freeCancelHours: 4,
    cancellationFee: 9900,
    offerTimeoutSec: 30,
    autoAssign: base.settings.autoAssign,
    emergencySlaMin: base.settings.emergencySlaMin,
    supportPhone: '+91 40 6824 1000',
  }
  const adminExtras = Object.fromEntries(control.admins.map((a) => [a.id, { phone: a.phone, lastActiveAt: ms(a.lastActive), createdAt: ms(a.createdAt) }]))
  return { tickets, audit, roles, settings, adminExtras }
}
