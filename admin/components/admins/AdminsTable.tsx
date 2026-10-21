'use client'

import { useState } from 'react'
import { ShieldCheck, ShieldOff, UserPlus } from 'lucide-react'
import { FormError, useAction } from '@/components/catalog/parts'
import { Async, Avatar, Button, Card, Chip, Empty, Field, Modal, Select, TableWrap, inputClass, td, th, tr } from '@/components/ui'
import { inviteAdmin, setAdminDisabled, setAdminRole, useAdminSession, useAdmins, useCan, type AdminAccount, type AdminRole } from '@/lib/data'
import { ADMIN_ROLES } from '@/lib/types'
import { cn } from '@/lib/cn'
import { ago } from '@/lib/format'

const STATUS = { active: { label: 'Active', tone: 'success' }, invited: { label: 'Invited', tone: 'info' }, disabled: { label: 'Disabled', tone: 'neutral' } } as const

/** Who can sign in to the console, with which role. */
export function AdminsTable() {
  const admins = useAdmins()
  const can = useCan()
  const session = useAdminSession()
  const meId = session.status === 'signed_in' ? session.admin.id : ''
  const editable = can('admins', 'edit')
  const [inviting, setInviting] = useState(false)
  const { run, busy, error } = useAction()
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line p-4">
        <p className="text-sm text-muted">A disabled admin is signed out at once. Nobody can change their own role or disable themselves.</p>
        {can('admins', 'create') && (
          <Button onClick={() => setInviting(true)}>
            <UserPlus /> Invite admin
          </Button>
        )}
      </div>
      {error && (
        <div className="px-4 pt-3">
          <FormError error={error} />
        </div>
      )}
      <Async query={admins} empty={<Empty icon={<ShieldCheck />} title="No admins" />}>
        {(rows) => (
          <TableWrap>
            <thead>
              <tr>
                <th className={th}>Admin</th>
                <th className={th}>Role</th>
                <th className={th}>Last active</th>
                <th className={th}>Status</th>
                <th className={cn(th, 'text-right')}>Access</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a: AdminAccount) => {
                const self = a.id === meId
                return (
                  <tr key={a.id} className={cn(tr, a.status === 'disabled' && 'opacity-60')}>
                    <td className={td}>
                      <span className="flex items-center gap-3">
                        <Avatar name={a.name} size={34} />
                        <span>
                          <span className="block font-bold">
                            {a.name}
                            {self && <span className="text-xs font-semibold text-muted"> (you)</span>}
                          </span>
                          <span className="block text-xs text-muted">{a.email}</span>
                        </span>
                      </span>
                    </td>
                    <td className={td}>
                      {editable && !self ? (
                        <Select label={`Role for ${a.name}`} value={a.role} disabled={busy} onChange={(r: AdminRole) => void run(() => setAdminRole(a.id, r), `${a.name} is now ${r}`)} options={ADMIN_ROLES.map((r) => ({ value: r, label: r }))} />
                      ) : (
                        <span className="text-[13px] font-semibold">{a.role}</span>
                      )}
                    </td>
                    <td className={cn(td, 'text-[13px] text-muted')}>{a.lastActiveAt ? ago(new Date(a.lastActiveAt).toISOString()) : '—'}</td>
                    <td className={td}>
                      <Chip tone={STATUS[a.status].tone}>{STATUS[a.status].label}</Chip>
                    </td>
                    <td className={cn(td, 'text-right')}>
                      {editable && !self && (
                        <Button
                          size="sm"
                          variant="subtle"
                          disabled={busy}
                          className={a.status === 'disabled' ? '' : 'text-danger hover:bg-danger-soft'}
                          onClick={() => void run(() => setAdminDisabled(a.id, a.status !== 'disabled'), a.status === 'disabled' ? `${a.name} enabled` : `${a.name} disabled`)}
                        >
                          {a.status === 'disabled' ? <ShieldCheck /> : <ShieldOff />} {a.status === 'disabled' ? 'Enable' : 'Disable'}
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </TableWrap>
        )}
      </Async>
      {inviting && <InviteModal onClose={() => setInviting(false)} />}
    </Card>
  )
}

function InviteModal({ onClose }: { onClose: () => void }) {
  const [f, setF] = useState({ name: '', email: '', role: 'Support Admin' as AdminRole })
  const { run, busy, error } = useAction()
  return (
    <Modal
      open
      onClose={onClose}
      title="Invite an admin"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={busy} onClick={() => void run(() => inviteAdmin(f), `Invite sent to ${f.email}`, onClose)}>
            {busy ? 'Sending…' : 'Send invite'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Full name">
          <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={cn(inputClass, 'h-10')} autoFocus />
        </Field>
        <Field label="Work email" hint="They sign in with Google or this email once they accept.">
          <input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className={cn(inputClass, 'h-10')} />
        </Field>
        <Field label="Role">
          <Select full label="Role" value={f.role} onChange={(r) => setF({ ...f, role: r })} options={ADMIN_ROLES.map((r) => ({ value: r, label: r }))} />
        </Field>
        <FormError error={error} />
      </div>
    </Modal>
  )
}
