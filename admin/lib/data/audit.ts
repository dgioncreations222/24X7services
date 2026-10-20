'use client'

/**
 * The audit log: every accountable change, who made it, and what it was
 * before and after. Actions in lib/data call `audit` as they write, so the
 * log cannot be forgotten by a page. Entries are never edited.
 */
import { write } from '../mock/db'
import { currentAdmin } from './auth'
import { useResource, type Query } from './query'
import type { AuditEntry, Module } from './types'

let seq = 0

export function audit(module: Module, action: string, change: { target?: string; old?: string; new?: string } = {}) {
  const a = currentAdmin()
  const entry: AuditEntry = { id: `AU-${Date.now()}-${seq++}`, at: Date.now(), admin: a?.name ?? 'System', role: a?.role ?? 'System', module, action, ...change }
  write((d) => ({ ...d, audit: [entry, ...d.audit] }))
}

export function useAuditLog(): Query<AuditEntry[]> {
  return useResource((db) => [...db.audit].sort((a, b) => b.at - a.at))
}
