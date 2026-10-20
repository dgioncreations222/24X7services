'use client'

import { useState } from 'react'
import { Check, Crown, Pencil, Plus } from 'lucide-react'
import { PriceInput } from '@/components/catalog/fields'
import { FormError, rupees, useAction } from '@/components/catalog/parts'
import { Async, Button, Card, Chip, Empty, Field, Modal, Toggle, inputClass } from '@/components/ui'
import { savePlan, setPlanActive, useCan, usePlans, type PlusPlan } from '@/lib/data'
import { cn } from '@/lib/cn'

/** Plus memberships: what each plan costs, how long it lasts, and what it gives. */
export function PlansPanel() {
  const plans = usePlans()
  const can = useCan()
  const editable = can('promotions', 'edit')
  const [editing, setEditing] = useState<PlusPlan | 'new' | null>(null)
  const { run, busy } = useAction()
  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted">Turning a plan off stops new sign-ups. People already on it keep it until it ends.</p>
        {can('promotions', 'create') && (
          <Button onClick={() => setEditing('new')}>
            <Plus /> New plan
          </Button>
        )}
      </div>
      <Async query={plans} empty={<Empty icon={<Crown />} title="No plans yet" />}>
        {(list) => (
          <div className="grid gap-4 md:grid-cols-3">
            {list.map((p) => (
              <Card key={p.id} className={cn('flex flex-col p-5', !p.active && 'opacity-70')}>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-extrabold">{p.name}</p>
                  <Chip tone={p.active ? 'success' : 'neutral'}>{p.active ? 'On sale' : 'Off'}</Chip>
                </div>
                <p className="num mt-2 text-2xl font-extrabold">
                  {rupees(p.price)}
                  <span className="text-sm font-semibold text-muted"> / {p.durationDays} days</span>
                </p>
                <ul className="mt-3 flex-1 space-y-1.5 text-sm">
                  {p.freeVisits && <Benefit>No visit fee on any booking</Benefit>}
                  {p.discountPct > 0 && <Benefit>{p.discountPct}% off labour</Benefit>}
                  {p.priority && <Benefit>Priority dispatch</Benefit>}
                </ul>
                <p className="num mt-3 text-xs font-semibold text-muted">{p.subscribers.toLocaleString('en-IN')} members</p>
                {editable && (
                  <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                    <Button size="sm" variant="subtle" onClick={() => setEditing(p)}>
                      <Pencil /> Edit
                    </Button>
                    <Toggle checked={p.active} disabled={busy} label={`${p.name} on sale`} onChange={(v) => void run(() => setPlanActive(p.id, v), v ? `${p.name} on sale` : `${p.name} taken off sale`)} />
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </Async>
      {editing && <PlanModal plan={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </>
  )
}

function Benefit({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <Check className="size-4 text-success" aria-hidden /> {children}
    </li>
  )
}

function PlanModal({ plan, onClose }: { plan: PlusPlan | null; onClose: () => void }) {
  const [f, setF] = useState({ name: plan?.name ?? '', price: plan?.price ?? 0, durationDays: plan?.durationDays ?? 365, freeVisits: plan?.freeVisits ?? true, discountPct: plan?.discountPct ?? 0, priority: plan?.priority ?? false })
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }))
  const { run, busy, error } = useAction()
  return (
    <Modal
      open
      onClose={onClose}
      title={plan ? `Edit ${plan.name}` : 'New Plus plan'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={busy} onClick={() => void run(() => savePlan({ ...f, id: plan?.id }), plan ? 'Plan saved' : 'Plan added', onClose)}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" className="sm:col-span-2">
          <input value={f.name} onChange={(e) => set('name', e.target.value)} className={cn(inputClass, 'h-10')} />
        </Field>
        <Field label="Price">
          <PriceInput label="Price in rupees" value={f.price} onChange={(v) => set('price', v)} />
        </Field>
        <Field label="Lasts (days)">
          <input inputMode="numeric" value={f.durationDays || ''} onChange={(e) => set('durationDays', Number(e.target.value.replace(/\D/g, '')))} className={cn(inputClass, 'num h-10')} />
        </Field>
        <Field label="Labour discount (%)">
          <input inputMode="numeric" value={f.discountPct || ''} onChange={(e) => set('discountPct', Number(e.target.value.replace(/\D/g, '')))} className={cn(inputClass, 'num h-10')} />
        </Field>
        <div className="space-y-3 pt-6">
          <label className="flex items-center justify-between gap-3 text-sm font-semibold">
            No visit fee <Toggle checked={f.freeVisits} onChange={(v) => set('freeVisits', v)} label="No visit fee" />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm font-semibold">
            Priority dispatch <Toggle checked={f.priority} onChange={(v) => set('priority', v)} label="Priority dispatch" />
          </label>
        </div>
        <div className="sm:col-span-2">
          <FormError error={error} />
        </div>
      </div>
    </Modal>
  )
}
