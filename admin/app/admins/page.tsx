'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Eye, Lock, MoreHorizontal, RotateCcw, Trash2, UserPlus, UserRoundCheck, UserRoundX, Users } from 'lucide-react'
import { useToast } from '@/components/toast'
import {
  Avatar,
  Button,
  Card,
  CardHeader,
  Chip,
  Field,
  Modal,
  Page,
  PageHeader,
  SearchInput,
  Select,
  StatCard,
  TableWrap,
  Tabs,
  Toggle,
  inputClass,
  td,
  th,
  tr,
} from '@/components/ui'
import { cn } from '@/lib/cn'
import { DEFAULT_ROLES, MODULE_LABEL, ROLE_NOTE } from '@/lib/control'
import { ago, matches } from '@/lib/format'
import type { Tone } from '@/lib/status'
import { ADMIN, useStore } from '@/lib/store'
import { ADMIN_ROLES, MODULES, PERMS, type AdminRole, type AdminUser, type Module, type Perm } from '@/lib/types'

const ROLE_TONE: Record<AdminRole, Tone> = {
  'Super Admin': 'danger',
  'Operations Admin': 'brand',
  'Finance Admin': 'success',
  'Content Admin': 'violet',
  'Support Admin': 'info',
}

const STATUS_TONE: Record<AdminUser['status'], Tone> = { active: 'success', invited: 'warning', disabled: 'neutral' }
const STATUS_LABEL: Record<AdminUser['status'], string> = { active: 'Active', invited: 'Invited', disabled: 'Disabled' }

const PERM_LABEL: Record<Perm, string> = {
  view: 'View',
  create: 'Create',
  edit: 'Edit',
  delete: 'Delete',
  approve: 'Approve',
  publish: 'Publish',
  assign: 'Assign',
  export: 'Export',
}

/** Audit logs can be read and exported, never changed — by anyone. */
const AUDIT_PERMS: Perm[] = ['view', 'export']

/** Who works in the console, and what each role is allowed to touch. */
export default function AdminsPage() {
  const store = useStore()
  const [tab, setTab] = useState<'users' | 'roles'>('users')
  const [inviting, setInviting] = useState(false)
  const canEdit = store.can('admins', 'edit')

  return (
    <Page>
      <PageHeader
        title="Admin Users"
        sub="Staff with console access, their roles and what each role can do"
        actions={
          store.can('admins', 'create') && (
            <Button onClick={() => setInviting(true)}>
              <UserPlus /> Invite admin
            </Button>
          )
        }
      />
      <Tabs
        className="mb-5"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'users', label: 'Users', count: store.admins.length },
          { value: 'roles', label: 'Roles & Permissions', count: ADMIN_ROLES.length },
        ]}
      />
      {tab === 'users' ? <UsersTab canEdit={canEdit} /> : <RolesTab canEdit={canEdit} />}
      <AdminModal open={inviting} onClose={() => setInviting(false)} />
    </Page>
  )
}

/* ---------------------------------------------------------------- Users */

function UsersTab({ canEdit }: { canEdit: boolean }) {
  const store = useStore()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [role, setRole] = useState<AdminRole | 'all'>('all')
  const [editing, setEditing] = useState<AdminUser | null>(null)
  const [removing, setRemoving] = useState<AdminUser | null>(null)

  const list = useMemo(
    () => store.admins.filter((a) => (role === 'all' || a.role === role) && matches([a.name, a.email, a.phone, a.role, a.id], q)),
    [store.admins, q, role]
  )
  const count = (st: AdminUser['status']) => store.admins.filter((a) => a.status === st).length
  /** The row menu, shared by the phone cards and the desktop table. */
  const menuFor = (a: AdminUser, me: boolean) => [
    { label: 'Edit', icon: <UserRoundCheck />, onClick: () => setEditing(a) },
    ...(a.status === 'invited' ? [{ label: 'Resend invite', icon: <RotateCcw />, onClick: () => toast(`Invite re-sent to ${a.email}`) }] : []),
    ...(!me
      ? [
          {
            label: a.status === 'disabled' ? 'Enable' : 'Disable',
            icon: a.status === 'disabled' ? <UserRoundCheck /> : <UserRoundX />,
            onClick: () => {
              store.saveAdmin({ ...a, status: a.status === 'disabled' ? 'active' : 'disabled' })
              toast(`${a.name} ${a.status === 'disabled' ? 'enabled' : 'disabled'}`)
            },
          },
          { label: 'Remove', icon: <Trash2 />, danger: true, onClick: () => setRemoving(a) },
        ]
      : []),
  ]

  return (
    <>
      <section className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:gap-4" aria-label="Team at a glance">
        <StatCard label="Total admins" value={store.admins.length} icon={<Users />} />
        <StatCard label="Active" value={count('active')} icon={<UserRoundCheck />} toneName="success" />
        <StatCard label="Invites pending" value={count('invited')} icon={<UserPlus />} toneName="warning" />
      </section>

      <Card>
        <div className="flex flex-wrap gap-2 border-b border-line p-4">
          <SearchInput value={q} onChange={setQ} placeholder="Search name, email or phone" className="min-w-[220px] flex-1" />
          <Select
            value={role}
            onChange={setRole}
            label="Role"
            options={[{ value: 'all' as const, label: 'All roles' }, ...ADMIN_ROLES.map((r) => ({ value: r, label: r }))]}
          />
        </div>
        {/* Phone: one card per admin — the table would scroll sideways. */}
        <ul className="divide-y divide-line sm:hidden">
          {list.length === 0 && <li className="px-4 py-12 text-center text-sm font-semibold text-muted">No admins match these filters.</li>}
          {list.map((a) => {
            const me = a.email === ADMIN.email
            return (
              <li key={a.id} className="flex items-start gap-3 px-4 py-3">
                <Avatar name={a.name} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">
                        {a.name}
                        {me && <span className="ml-1.5 text-xs font-semibold text-faint">(you)</span>}
                      </span>
                      <span className="block truncate text-xs font-medium text-muted">{a.email}</span>
                    </span>
                    {canEdit && <RowMenu items={menuFor(a, me)} />}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Chip tone={ROLE_TONE[a.role]}>{a.role}</Chip>
                    <Chip tone={STATUS_TONE[a.status]}>{STATUS_LABEL[a.status]}</Chip>
                  </div>
                  <p className="mt-1.5 text-xs font-medium text-muted">
                    <span className="num">{a.phone}</span> · {a.status === 'invited' ? `Invited ${ago(a.createdAt)}` : `Active ${ago(a.lastActive)}`}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
        <div className="hidden sm:block">
        <TableWrap>
          <thead>
            <tr>
              <th className={th}>Admin</th>
              <th className={th}>Contact</th>
              <th className={th}>Role</th>
              <th className={th}>Status</th>
              <th className={th}>Last active</th>
              <th className={cn(th, 'text-right')}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-sm font-semibold text-muted">
                  No admins match these filters.
                </td>
              </tr>
            )}
            {list.map((a) => {
              const me = a.email === ADMIN.email
              return (
                <tr key={a.id} className={tr}>
                  <td className={td}>
                    <span className="flex items-center gap-3">
                      <Avatar name={a.name} size={32} />
                      <span>
                        <span className="block font-bold">
                          {a.name}
                          {me && <span className="ml-1.5 text-xs font-semibold text-faint">(you)</span>}
                        </span>
                        <span className="num block text-xs font-medium text-muted">{a.id}</span>
                      </span>
                    </span>
                  </td>
                  <td className={td}>
                    <span className="block text-[13px] font-semibold">{a.email}</span>
                    <span className="num block text-xs text-muted">{a.phone}</span>
                  </td>
                  <td className={td}>
                    <Chip tone={ROLE_TONE[a.role]}>{a.role}</Chip>
                  </td>
                  <td className={td}>
                    <Chip tone={STATUS_TONE[a.status]}>{STATUS_LABEL[a.status]}</Chip>
                  </td>
                  <td className={cn(td, 'text-xs font-semibold text-muted')}>{a.status === 'invited' ? `Invited ${ago(a.createdAt)}` : ago(a.lastActive)}</td>
                  <td className={cn(td, 'text-right')}>
                    {canEdit && (
                      <RowMenu items={menuFor(a, me)} />
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </TableWrap>
        </div>
        <p className="px-5 py-3 text-xs font-semibold text-muted">{list.length} admins</p>
      </Card>

      <AdminModal open={!!editing} user={editing ?? undefined} onClose={() => setEditing(null)} />

      <Modal
        open={!!removing}
        onClose={() => setRemoving(null)}
        title={`Remove ${removing?.name}?`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRemoving(null)}>
              Keep
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (!removing) return
                store.removeAdmin(removing.id)
                toast(`${removing.name} removed from the console`)
                setRemoving(null)
              }}
            >
              Remove access
            </Button>
          </>
        }
      >
        <p className="text-sm font-medium text-muted">They are signed out everywhere and lose console access straight away. Their past actions stay in the audit log.</p>
      </Modal>
    </>
  )
}

/** A small “…” menu for a table row. */
function RowMenu({ items }: { items: { label: string; icon: React.ReactNode; onClick: () => void; danger?: boolean }[] }) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])
  return (
    <div ref={box} className="relative inline-block text-left">
      <button
        type="button"
        aria-label="Actions"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="grid size-8 place-items-center rounded-lg text-muted hover:bg-canvas hover:text-ink"
      >
        <MoreHorizontal className="size-4" />
      </button>
      {open && (
        <div className="animate-fade absolute right-0 top-9 z-30 w-44 rounded-xl border border-line bg-card p-1 shadow-float">
          {items.map((i) => (
            <button
              key={i.label}
              type="button"
              onClick={() => {
                setOpen(false)
                i.onClick()
              }}
              className={cn(
                'flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-left text-[13px] font-semibold [&_svg]:size-4',
                i.danger ? 'text-danger hover:bg-danger-soft' : 'text-ink-2 hover:bg-canvas'
              )}
            >
              {i.icon}
              {i.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Invite a new admin, or edit an existing one when `user` is given. */
function AdminModal({ open, onClose, user }: { open: boolean; onClose: () => void; user?: AdminUser }) {
  return open ? <AdminForm key={user?.id ?? 'new'} onClose={onClose} user={user} /> : null
}

function AdminForm({ onClose, user }: { onClose: () => void; user?: AdminUser }) {
  const store = useStore()
  const toast = useToast()
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '+91 ')
  const [role, setRole] = useState<AdminRole>(user?.role ?? 'Operations Admin')
  // Kept on the record for the backend; there is no OTP sign-in to switch on.
  const twoFactor = user?.twoFactor ?? false
  const me = user?.email === ADMIN.email
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const taken = !user && store.admins.some((a) => a.email.toLowerCase() === email.trim().toLowerCase())
  const ok = name.trim().length > 1 && emailOk && !taken

  const save = () => {
    if (user) {
      store.saveAdmin({ ...user, name: name.trim(), phone: phone.trim(), role, twoFactor })
      toast(`${name.trim()} updated`)
    } else {
      const next = Math.max(0, ...store.admins.map((a) => Number(a.id.replace(/\D/g, '')) || 0)) + 1
      const now = new Date().toISOString()
      store.saveAdmin({
        id: `ADM-${String(next).padStart(2, '0')}`,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        role,
        status: 'invited',
        twoFactor,
        lastActive: now,
        createdAt: now,
      })
      toast(`Invite sent to ${email.trim()} as ${role}`)
    }
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={user ? `Edit ${user.name}` : 'Invite an admin'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!ok} onClick={save}>
            {user ? 'Save changes' : 'Send invite'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Full name">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="e.g. Neha Kapoor" />
        </Field>
        <Field label="Work email" hint={taken ? <span className="text-danger">This email already has access.</span> : undefined}>
          <input type="email" value={email} disabled={!!user} onChange={(e) => setEmail(e.target.value)} placeholder="name@customerservice.example" className={cn(inputClass, user && 'bg-canvas text-muted')} />
        </Field>
        <Field label="Phone">
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Role" hint={me ? 'You can’t change your own role.' : ROLE_NOTE[role]}>
          <Select full label="Role" value={role} disabled={me} onChange={setRole} options={ADMIN_ROLES.map((r) => ({ value: r, label: r }))} />
        </Field>
      </div>
    </Modal>
  )
}

/* ---------------------------------------------------------------- Roles */

function RolesTab({ canEdit }: { canEdit: boolean }) {
  const store = useStore()
  const toast = useToast()
  const [role, setRole] = useState<AdminRole>('Operations Admin')
  const perms = store.roles[role] ?? {}
  const locked = role === 'Super Admin' || !canEdit

  const set = (m: Module, next: Perm[]) => {
    const allowed: readonly Perm[] = m === 'audit' ? AUDIT_PERMS : PERMS
    // Order follows PERMS; nothing without View.
    const clean = PERMS.filter((p) => allowed.includes(p) && next.includes(p))
    store.setRolePerms(role, m, clean.includes('view') ? clean : [])
  }

  const toggle = (m: Module, p: Perm) => {
    const cur = perms[m] ?? []
    if (cur.includes(p)) set(m, p === 'view' ? [] : cur.filter((x) => x !== p))
    else set(m, [...cur, p, 'view'])
  }

  return (
    <>
      <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Roles">
        {ADMIN_ROLES.map((r) => {
          const on = r === role
          const users = store.admins.filter((a) => a.role === r).length
          const modules = Object.values(store.roles[r] ?? {}).filter((p) => p?.includes('view')).length
          return (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              aria-pressed={on}
              className={cn(
                'flex flex-col rounded-card border bg-card p-4 text-left shadow-card transition-colors',
                on ? 'border-brand ring-1 ring-brand' : 'border-line hover:border-line-strong'
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <Chip tone={ROLE_TONE[r]}>{r}</Chip>
                {r === 'Super Admin' && <Lock className="size-3.5 text-faint" aria-label="Locked" />}
              </span>
              <span className="mt-2.5 text-xs font-medium leading-relaxed text-muted">{ROLE_NOTE[r]}</span>
              <span className="mt-auto flex gap-3 pt-3 text-xs font-bold text-ink-2">
                <span className="num">
                  {users} {users === 1 ? 'user' : 'users'}
                </span>
                <span className="num text-faint">{modules} modules</span>
              </span>
            </button>
          )
        })}
      </section>

      <Card>
        <CardHeader
          className="flex-wrap"
          title={`${role} permissions`}
          sub={role === 'Super Admin' ? 'Super Admin always has full access. It can’t be narrowed.' : 'Tick what this role may do in each module. Every change is recorded in Audit Logs.'}
          action={
            <>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  store.viewAs(role)
                  toast(`Previewing the console as ${role}`)
                }}
              >
                <Eye /> Preview as this role
              </Button>
              {!locked && (
                <Button
                  size="sm"
                  variant="subtle"
                  onClick={() => {
                    for (const m of MODULES) {
                      const def = DEFAULT_ROLES[role][m] ?? []
                      const cur = perms[m] ?? []
                      if (def.join() !== cur.join()) store.setRolePerms(role, m, def)
                    }
                    toast(`${role} reset to default permissions`)
                  }}
                >
                  <RotateCcw /> Reset to default
                </Button>
              )}
            </>
          }
        />
        {!canEdit && (
          <p className="flex items-center gap-2 border-b border-line bg-canvas/60 px-5 py-2.5 text-xs font-semibold text-muted">
            <Lock className="size-3.5" aria-hidden /> You can view permissions but not change them as {store.as}.
          </p>
        )}
        {/* Phone: one card per module — the matrix would scroll sideways. */}
        <ul className="divide-y divide-line sm:hidden">
          {MODULES.map((m) => {
            const cur = perms[m] ?? []
            const allowed = m === 'audit' ? AUDIT_PERMS : PERMS
            const all = allowed.every((p) => cur.includes(p))
            return (
              <li key={m} className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0">
                    <span className="block text-sm font-bold">{MODULE_LABEL[m]}</span>
                    {m === 'audit' && <span className="block text-[11px] font-semibold text-faint">Audit logs are read-only</span>}
                  </span>
                  <span className={cn('inline-flex shrink-0 items-center gap-2 text-[11px] font-bold text-muted', locked && 'pointer-events-none opacity-50')}>
                    All
                    <Toggle
                      size="sm"
                      checked={all}
                      label={`All permissions for ${MODULE_LABEL[m]}`}
                      onChange={(v) => {
                        if (locked) return
                        set(m, v ? [...allowed] : [])
                      }}
                    />
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {allowed.map((p) => {
                    const checked = cur.includes(p)
                    return (
                      <button
                        key={p}
                        type="button"
                        disabled={locked}
                        aria-pressed={checked}
                        onClick={() => toggle(m, p)}
                        className={cn(
                          'h-7 rounded-md border px-2.5 text-xs font-bold transition-colors disabled:cursor-not-allowed',
                          checked ? 'border-brand bg-brand-soft text-brand' : 'border-line-strong text-muted hover:border-ink-2'
                        )}
                      >
                        {PERM_LABEL[p]}
                      </button>
                    )
                  })}
                </div>
              </li>
            )
          })}
        </ul>
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[860px] border-collapse text-left text-sm">
            <thead>
              <tr>
                <th className={th}>Module</th>
                {PERMS.map((p) => (
                  <th key={p} className={cn(th, 'text-center')}>
                    {PERM_LABEL[p]}
                  </th>
                ))}
                <th className={cn(th, 'text-center')}>All</th>
              </tr>
            </thead>
            <tbody>
              {MODULES.map((m) => {
                const cur = perms[m] ?? []
                const allowed = m === 'audit' ? AUDIT_PERMS : PERMS
                const all = allowed.every((p) => cur.includes(p))
                return (
                  <tr key={m} className={tr}>
                    <td className={td}>
                      <span className="block font-bold">{MODULE_LABEL[m]}</span>
                      {m === 'audit' && <span className="block text-[11px] font-semibold text-faint">Audit logs are read-only</span>}
                    </td>
                    {PERMS.map((p) => {
                      const offered = allowed.includes(p)
                      const checked = cur.includes(p)
                      return (
                        <td key={p} className={cn(td, 'text-center')}>
                          {offered ? (
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={locked}
                              onChange={() => toggle(m, p)}
                              aria-label={`${PERM_LABEL[p]} ${MODULE_LABEL[m]}`}
                              className="size-4 cursor-pointer accent-brand disabled:cursor-not-allowed"
                            />
                          ) : (
                            <span className="text-faint" aria-label="Not available">
                              —
                            </span>
                          )}
                        </td>
                      )
                    })}
                    <td className={cn(td, 'text-center')}>
                      <span className={cn('inline-flex', locked && 'pointer-events-none opacity-50')}>
                        <Toggle
                          size="sm"
                          checked={all}
                          label={`All permissions for ${MODULE_LABEL[m]}`}
                          onChange={(v) => {
                            if (locked) return
                            set(m, v ? [...allowed] : [])
                          }}
                        />
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {role === 'Super Admin' && (
          <p className="flex items-center gap-2 border-t border-line px-5 py-3 text-xs font-semibold text-muted">
            <Lock className="size-3.5" aria-hidden /> Locked: Super Admin has every permission. Audit Logs stay view and export only for everyone.
          </p>
        )}
      </Card>
    </>
  )
}
