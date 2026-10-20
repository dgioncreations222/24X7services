'use client'

import { useState } from 'react'
import { Lock } from 'lucide-react'
import { FormError, useAction } from '@/components/catalog/parts'
import { Async, Card, Segmented, th } from '@/components/ui'
import { setRolePermission, useCan, useRoles, type AdminRole, type Module, type Perm } from '@/lib/data'
import { ADMIN_ROLES, MODULES, PERMS } from '@/lib/types'
import { cn } from '@/lib/cn'

const MODULE_LABEL: Record<Module, string> = {
  dashboard: 'Dashboard',
  dispatch: 'Live dispatch',
  bookings: 'Bookings',
  support: 'Support tickets',
  customers: 'Customers',
  reviews: 'Reviews',
  promotions: 'Coupons & Plus',
  technicians: 'Technicians',
  payouts: 'Payouts',
  payments: 'Payments',
  catalog: 'Catalog',
  reports: 'Reports',
  ai: 'AI (unused)',
  content: 'Content & banners',
  admins: 'Admin users',
  audit: 'Audit log',
  settings: 'Settings',
}

/** What each role may do in each part of the console. Super Admin always has everything. */
export function RoleMatrix() {
  const roles = useRoles()
  const can = useCan()
  const [role, setRole] = useState<AdminRole>('Operations Admin')
  const { run, busy, error } = useAction()
  const locked = role === 'Super Admin' || !can('admins', 'edit')
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
        <Segmented value={role} onChange={setRole} options={ADMIN_ROLES.map((r) => ({ value: r, label: r.replace(' Admin', '') }))} />
        {role === 'Super Admin' && (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-muted">
            <Lock className="size-3.5" /> Fixed: every permission
          </span>
        )}
      </div>
      {error && (
        <div className="px-4 pt-3">
          <FormError error={error} />
        </div>
      )}
      <Async query={roles}>
        {(matrix) => (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr>
                  <th className={th}>Module</th>
                  {PERMS.map((p) => (
                    <th key={p} className={cn(th, 'text-center')}>
                      {p}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MODULES.filter((m) => m !== 'ai').map((m) => {
                  const perms = matrix[role]?.[m] ?? []
                  return (
                    <tr key={m} className="border-b border-line">
                      <td className={cn('px-5 py-2.5 font-semibold', !perms.length && 'text-muted')}>{MODULE_LABEL[m]}</td>
                      {PERMS.map((p: Perm) => (
                        <td key={p} className="py-2.5 text-center">
                          <input
                            type="checkbox"
                            className="size-4 cursor-pointer accent-brand disabled:cursor-not-allowed"
                            aria-label={`${role}: ${p} ${MODULE_LABEL[m]}`}
                            checked={perms.includes(p)}
                            disabled={locked || busy}
                            onChange={(e) => void run(() => setRolePermission(role, m, p, e.target.checked))}
                          />
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Async>
      <p className="border-t border-line px-5 py-3 text-xs text-muted">Turning off “view” removes the module from the role’s menu. Any other permission brings “view” with it. Every change is in the audit log.</p>
    </Card>
  )
}
