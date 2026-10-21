'use client'

import { useState } from 'react'
import { Save } from 'lucide-react'
import { PriceInput } from '@/components/catalog/fields'
import { FormError, useAction } from '@/components/catalog/parts'
import { Async, Button, Card, CardHeader, Field, Page, PageHeader, SkeletonRows, Toggle, inputClass } from '@/components/ui'
import { saveSettings, useCan, useSettings, type BusinessSettings } from '@/lib/data'
import { cn } from '@/lib/cn'

/** How the business runs: money, cancellations, dispatch and the support number. */
export default function SettingsPage() {
  const settings = useSettings()
  return (
    <Page>
      <PageHeader title="Settings" sub="Changes apply to new bookings from the moment you save, and each one is written to the audit log." />
      <Async query={settings} loading={<SkeletonRows rows={4} />}>
        {(s) => <Form key={JSON.stringify(s)} initial={s} />}
      </Async>
    </Page>
  )
}

function Form({ initial }: { initial: BusinessSettings }) {
  const can = useCan()
  const editable = can('settings', 'edit')
  const [f, setF] = useState(initial)
  const set = <K extends keyof BusinessSettings>(k: K, v: BusinessSettings[K]) => setF((s) => ({ ...s, [k]: v }))
  const dirty = JSON.stringify(f) !== JSON.stringify(initial)
  const { run, busy, error } = useAction()
  const num = (k: keyof BusinessSettings, suffix: string, label: string) => (
    <div className="relative">
      <input
        inputMode="numeric"
        aria-label={label}
        disabled={!editable}
        value={String(f[k])}
        onChange={(e) => set(k, Number(e.target.value.replace(/[^\d.]/g, '')) as never)}
        className={cn(inputClass, 'num h-10 pr-12')}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted">{suffix}</span>
    </div>
  )
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Money" sub="What the platform keeps, tax, and the emergency surcharge customers pay." />
        <div className="grid gap-4 p-5 sm:grid-cols-3">
          <Field label="Commission" hint="Taken from every job’s bill.">
            {num('commissionPct', '%', 'Commission percent')}
          </Field>
          <Field label="GST">{num('gstPct', '%', 'GST percent')}</Field>
          <Field label="Emergency surcharge">
            <PriceInput label="Emergency surcharge in rupees" value={f.emergencySurcharge} onChange={(v) => set('emergencySurcharge', v)} />
          </Field>
        </div>
      </Card>
      <Card>
        <CardHeader title="Cancellations" sub="When a customer can cancel for free, and the fee after that." />
        <div className="grid gap-4 p-5 sm:grid-cols-3">
          <Field label="Free until">{num('freeCancelHours', 'hours', 'Free cancellation hours before the slot')}</Field>
          <Field label="Fee after that">
            <PriceInput label="Cancellation fee in rupees" value={f.cancellationFee} onChange={(v) => set('cancellationFee', v)} />
          </Field>
        </div>
      </Card>
      <Card>
        <CardHeader title="Dispatch" sub="How jobs reach technicians." />
        <div className="grid gap-4 p-5 sm:grid-cols-3">
          <Field label="Auto-assign" hint="Offer each job to the nearest free technician.">
            <div className="flex h-10 items-center">
              <Toggle checked={f.autoAssign} disabled={!editable} onChange={(v) => set('autoAssign', v)} label="Auto-assign" />
            </div>
          </Field>
          <Field label="Time to answer an offer">{num('offerTimeoutSec', 'sec', 'Offer timeout in seconds')}</Field>
          <Field label="Emergency SLA" hint="A technician on the way within this time.">
            {num('emergencySlaMin', 'min', 'Emergency SLA in minutes')}
          </Field>
        </div>
      </Card>
      <Card>
        <CardHeader title="Support" />
        <div className="grid gap-4 p-5 sm:grid-cols-3">
          <Field label="Support phone" hint="Shown in both apps.">
            <input value={f.supportPhone} disabled={!editable} onChange={(e) => set('supportPhone', e.target.value)} className={cn(inputClass, 'num h-10')} />
          </Field>
        </div>
      </Card>
      {editable && (
        <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-end gap-3 border-t border-line bg-canvas/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-card sm:border">
          <div className="mr-auto">
            <FormError error={error} />
          </div>
          {dirty && (
            <Button variant="secondary" onClick={() => setF(initial)}>
              Undo changes
            </Button>
          )}
          <Button disabled={!dirty || busy} onClick={() => void run(() => saveSettings(f), 'Settings saved')}>
            <Save /> {busy ? 'Saving…' : 'Save settings'}
          </Button>
        </div>
      )}
    </div>
  )
}
