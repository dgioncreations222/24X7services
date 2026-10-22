'use client'

import { useMemo, useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import { ImageField } from '@/components/catalog/fields'
import { FormError, useAction } from '@/components/catalog/parts'
import { Button, Field, Modal, Segmented, inputClass } from '@/components/ui'
import { addTechnician, findClashes, useAdminSession, useCategories, usePartners, type KycDocType, type NewTechnician } from '@/lib/data'
import { cn } from '@/lib/cn'
import { DOC_LABEL } from './status'

const DOCS: KycDocType[] = ['aadhaar', 'pan', 'photo', 'bank']

const EMPTY: NewTechnician = {
  name: '',
  phone: '',
  email: '',
  city: 'Hyderabad',
  area: '',
  skills: [],
  experienceYears: 1,
  aadhaarLast4: '',
  pan: '',
  payout: { kind: 'bank', accountName: '', accountNumber: '', ifsc: '' },
  docs: { aadhaar: undefined, pan: undefined, photo: undefined, bank: undefined },
  namesMatch: false,
  faceChecked: false,
}

/**
 * The partner desk adds a technician — the only way onto the network. The
 * person is in front of the admin: their details, the last four digits of
 * the Aadhaar, PAN, where payouts go and photos of all four documents. Anyone
 * already on the network with the same phone, email, PAN, bank or UPI is
 * flagged as the form is filled; another admin approves the result.
 */
export function AddTechnicianModal({ onClose, onAdded }: { onClose: () => void; onAdded: (id: string) => void }) {
  const [f, setF] = useState<NewTechnician>(EMPTY)
  const categories = useCategories()
  const partners = usePartners()
  const session = useAdminSession()
  const superAdmin = session.status === 'signed_in' && session.admin.role === 'Super Admin'
  const [override, setOverride] = useState(false)
  const { run, busy, error } = useAction()
  const set = <K extends keyof NewTechnician>(k: K, v: NewTechnician[K]) => setF((x) => ({ ...x, [k]: v }))
  const bank = f.payout.kind === 'bank' ? f.payout : null
  const upi = f.payout.kind === 'upi' ? f.payout : null

  const clashes = useMemo(() => findClashes(partners.data ?? [], f), [partners.data, f])
  const blocked = clashes.length > 0 && !(superAdmin && override)

  return (
    <Modal
      open
      onClose={onClose}
      title="Add a technician"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={busy || blocked} onClick={() => void run(() => addTechnician(f, override).then((p) => onAdded(p.id)), `${f.name.trim()} added · waiting for KYC review`)}>
            {busy ? 'Adding…' : 'Add and send for review'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Section title="Who they are">
          <Field label="Full name, as on the Aadhaar">
            <input value={f.name} onChange={(e) => set('name', e.target.value)} className={inputClass} autoComplete="off" />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Mobile">
              <input value={f.phone} onChange={(e) => set('phone', e.target.value)} inputMode="tel" placeholder="98765 43210" className={inputClass} />
            </Field>
            <Field label="Email they sign in with" hint="Google or a password they set from the invite.">
              <input value={f.email} onChange={(e) => set('email', e.target.value)} type="email" className={inputClass} />
            </Field>
            <Field label="City">
              <input value={f.city} onChange={(e) => set('city', e.target.value)} className={inputClass} />
            </Field>
            <Field label="Base area">
              <input value={f.area} onChange={(e) => set('area', e.target.value)} placeholder="Kondapur" className={inputClass} />
            </Field>
          </div>
          <div>
            <span className="mb-1.5 block text-[13px] font-bold text-ink-2">Works on</span>
            <div className="flex flex-wrap gap-1.5">
              {(categories.data ?? []).map((c) => {
                const on = f.skills.includes(c.id)
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => set('skills', on ? f.skills.filter((s) => s !== c.id) : [...f.skills, c.id])}
                    className={cn('rounded-full border px-3 py-1 text-[13px] font-semibold', on ? 'border-brand bg-brand-soft text-brand' : 'border-line-strong text-ink-2 hover:bg-canvas')}
                  >
                    {c.name}
                  </button>
                )
              })}
            </div>
          </div>
          <Field label="Years of experience">
            <input type="number" min={0} max={60} value={f.experienceYears} onChange={(e) => set('experienceYears', Math.max(0, Math.min(60, Math.round(Number(e.target.value) || 0))))} className={cn(inputClass, 'w-28')} />
          </Field>
        </Section>

        <Section title="Identity">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Aadhaar — last 4 digits only" hint="Never type or keep the full number.">
              <input value={f.aadhaarLast4} onChange={(e) => set('aadhaarLast4', e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" placeholder="1234" className={cn(inputClass, 'num')} />
            </Field>
            <Field label="PAN">
              <input value={f.pan} onChange={(e) => set('pan', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))} placeholder="ABCDE1234F" className={cn(inputClass, 'num')} />
            </Field>
          </div>
        </Section>

        <Section title="Where payouts go">
          <Segmented
            value={f.payout.kind}
            onChange={(k) => set('payout', k === 'bank' ? { kind: 'bank', accountName: f.name, accountNumber: '', ifsc: '' } : { kind: 'upi', upiId: '' })}
            options={[
              { value: 'bank', label: 'Bank account' },
              { value: 'upi', label: 'UPI' },
            ]}
          />
          {bank && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Account holder" className="sm:col-span-2">
                <input value={bank.accountName} onChange={(e) => set('payout', { ...bank, accountName: e.target.value })} className={inputClass} />
              </Field>
              <Field label="Account number">
                <input value={bank.accountNumber} onChange={(e) => set('payout', { ...bank, accountNumber: e.target.value.replace(/\D/g, '').slice(0, 18) })} inputMode="numeric" className={cn(inputClass, 'num')} />
              </Field>
              <Field label="IFSC">
                <input value={bank.ifsc} onChange={(e) => set('payout', { ...bank, ifsc: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11) })} placeholder="HDFC0001234" className={cn(inputClass, 'num')} />
              </Field>
            </div>
          )}
          {upi && (
            <Field label="UPI ID">
              <input value={upi.upiId} onChange={(e) => set('payout', { kind: 'upi', upiId: e.target.value })} placeholder="name@okhdfc" className={inputClass} />
            </Field>
          )}
        </Section>

        <Section title="Documents">
          {DOCS.map((d) => (
            <Field key={d} label={DOC_LABEL[d]}>
              <ImageField label={DOC_LABEL[d]} value={f.docs[d]} onChange={(v) => set('docs', { ...f.docs, [d]: v })} />
            </Field>
          ))}
        </Section>

        {clashes.length > 0 && (
          <div role="alert" className="space-y-2 rounded-lg border border-danger/30 bg-danger-soft p-3 text-sm">
            <p className="flex items-center gap-2 font-bold text-danger">
              <TriangleAlert className="size-4" /> Already on the network
            </p>
            <ul className="list-disc space-y-1 pl-5 text-ink-2">
              {clashes.map((c, i) => (
                <li key={i}>
                  This {c.field} belongs to <span className="font-bold">{c.partner.name}</span> ({c.partner.id}, {c.partner.status}).
                  {(c.partner.status === 'inactive' || c.partner.status === 'suspended') && ' Reactivate that account instead of adding a new one.'}
                </li>
              ))}
            </ul>
            {superAdmin ? (
              <Check checked={override} onChange={setOverride} label="I am a Super Admin and have checked this is a different person — save anyway." />
            ) : (
              <p className="text-xs font-semibold text-ink-2">Only a Super Admin can add someone whose details are already on the network.</p>
            )}
          </div>
        )}

        <Section title="Checks at the desk">
          <Check checked={f.namesMatch} onChange={(v) => set('namesMatch', v)} label="The names on the Aadhaar, the PAN and the bank account are the same as the name above." />
          <Check checked={f.faceChecked} onChange={(v) => set('faceChecked', v)} label="I have matched the person in front of me with the Aadhaar photo." />
        </Section>

        <FormError error={error} />
      </div>
    </Modal>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-faint">{title}</h3>
      {children}
    </section>
  )
}

function Check({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-start gap-2.5 text-sm text-ink-2">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-[var(--color-brand)]" />
      <span>{label}</span>
    </label>
  )
}
