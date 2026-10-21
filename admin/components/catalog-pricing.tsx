'use client'

import { useState } from 'react'
import { Moon, Siren } from 'lucide-react'
import { APPLIANCES, APPLIANCE_LABEL, BRANDS, BRAND_LABEL, inr, type Appliance, type Brand } from '@/lib/catalog'
import { cn } from '@/lib/cn'
import { useStore } from '@/lib/store'
import type { Catalog, Pricing } from '@/lib/types'
import { NumberInput } from './catalog-shared'
import { ApplianceGlyph } from './glyphs'
import { useToast } from './toast'
import { Card, CardHeader, Field, Segmented, Select, Toggle, inputClass } from './ui'

type Fee = 'visitCharge' | 'emergencyCharge' | 'platformFee' | 'cancellationFee' | 'additionalCharge'

const FEES: { key: Fee; label: string; hint: string }[] = [
  { key: 'visitCharge', label: 'Visit charge', hint: 'Adjusted in the bill if the repair goes ahead' },
  { key: 'emergencyCharge', label: 'Emergency charge', hint: 'Added to every emergency booking' },
  { key: 'platformFee', label: 'Platform fee', hint: 'Per booking, shown at checkout' },
  { key: 'cancellationFee', label: 'Cancellation fee', hint: 'Within 1 hour of the slot' },
  { key: 'additionalCharge', label: 'Additional service charge', hint: 'Each extra appliance in one visit' },
]

/** The price matrix customers book from, plus every fee on the bill. */
export function PricingTab() {
  const store = useStore()
  const toast = useToast()
  const canEdit = store.can('catalog', 'edit')
  const p = store.catalog.pricing
  const live = store.catalogPublished.pricing

  const setRow = (b: Brand, a: Appliance, k: 'normal' | 'emergency', v: number) => {
    const was = p.rows[b][a][k]
    store.updateCatalog(
      (c) => {
        c.pricing.rows[b][a][k] = v
        return c
      },
      { action: 'Changed price', target: `${BRAND_LABEL[b]} ${APPLIANCE_LABEL[a]} · ${k}`, old: inr(was), new: inr(v) }
    )
    toast(`${BRAND_LABEL[b]} ${APPLIANCE_LABEL[a]} ${k}: ${inr(was)} → ${inr(v)}`)
  }

  const setFee = (k: Fee | 'taxPct', label: string, v: number) => {
    const was = p[k]
    const fmt = (n: number) => (k === 'taxPct' ? `${n}%` : inr(n))
    store.updateCatalog(
      (c) => {
        c.pricing[k] = v
        return c
      },
      { action: 'Changed fee', target: label, old: fmt(was), new: fmt(v) }
    )
    toast(`${label}: ${fmt(was)} → ${fmt(v)}`)
  }

  return (
    <div className="grid gap-5 2xl:grid-cols-[1fr_380px]">
      <Card className="min-w-0">
        <CardHeader title="Base prices · brand × appliance" sub="Normal and emergency price per visit, before parts. Amber cells differ from the live price." />
        {/* Phone: one card per brand with a row per appliance — the matrix would scroll sideways. */}
        <ul className="divide-y divide-line sm:hidden">
          {BRANDS.map((b) => (
            <li key={b} className="px-4 py-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-extrabold">{BRAND_LABEL[b]}</p>
                <p className="flex gap-3 text-[10.5px] font-bold uppercase tracking-wider">
                  <span className="w-[104px] text-faint">Normal</span>
                  <span className="w-[104px] text-danger">Emergency</span>
                </p>
              </div>
              <ul className="space-y-2">
                {APPLIANCES.map((a) => {
                  const row = p.rows[b][a]
                  const was = live.rows[b][a]
                  return (
                    <li key={a} className="flex items-start gap-2">
                      <span className="flex min-w-0 flex-1 items-center gap-1.5 pt-2 text-[13px] font-semibold">
                        <ApplianceGlyph appliance={a} className="size-4 shrink-0 text-brand" />
                        <span className="truncate">{APPLIANCE_LABEL[a]}</span>
                      </span>
                      <span className="w-[104px] shrink-0">
                        <NumberInput
                          className="w-full"
                          label={`${BRAND_LABEL[b]} ${APPLIANCE_LABEL[a]} normal price`}
                          value={row.normal}
                          disabled={!canEdit}
                          changed={row.normal !== was.normal}
                          onCommit={(v) => setRow(b, a, 'normal', v)}
                        />
                        {row.normal !== was.normal && <span className="num block pl-1 pt-0.5 text-[10.5px] font-semibold text-faint">Live {inr(was.normal)}</span>}
                      </span>
                      <span className="w-[104px] shrink-0">
                        <NumberInput
                          className="w-full"
                          label={`${BRAND_LABEL[b]} ${APPLIANCE_LABEL[a]} emergency price`}
                          value={row.emergency}
                          disabled={!canEdit}
                          changed={row.emergency !== was.emergency}
                          onCommit={(v) => setRow(b, a, 'emergency', v)}
                        />
                        {row.emergency !== was.emergency && <span className="num block pl-1 pt-0.5 text-[10.5px] font-semibold text-faint">Live {inr(was.emergency)}</span>}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </li>
          ))}
        </ul>
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-line bg-canvas/60">
                <th className="px-5 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.06em] text-faint">Brand</th>
                {APPLIANCES.map((a) => (
                  <th key={a} className="px-2 py-2.5 text-left">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-faint">
                      <ApplianceGlyph appliance={a} className="size-4 text-brand" />
                      {APPLIANCE_LABEL[a]}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BRANDS.map((b) => (
                <tr key={b} className="border-b border-line last:border-0">
                  <th scope="row" className="px-5 py-3 text-left align-top font-extrabold">
                    {BRAND_LABEL[b]}
                    <span className="mt-3 block text-[10.5px] font-bold uppercase tracking-wider text-faint">Normal</span>
                    <span className="mt-[26px] block text-[10.5px] font-bold uppercase tracking-wider text-danger">Emergency</span>
                  </th>
                  {APPLIANCES.map((a) => {
                    const row = p.rows[b][a]
                    const was = live.rows[b][a]
                    return (
                      <td key={a} className="px-2 py-3 align-top">
                        <div className="h-5" />
                        <NumberInput
                          className="w-[118px]"
                          label={`${BRAND_LABEL[b]} ${APPLIANCE_LABEL[a]} normal price`}
                          value={row.normal}
                          disabled={!canEdit}
                          changed={row.normal !== was.normal}
                          onCommit={(v) => setRow(b, a, 'normal', v)}
                        />
                        <p className="num h-4 pl-1 pt-0.5 text-[10.5px] font-semibold text-faint">{row.normal !== was.normal ? `Live ${inr(was.normal)}` : ''}</p>
                        <NumberInput
                          className="mt-1 w-[118px]"
                          label={`${BRAND_LABEL[b]} ${APPLIANCE_LABEL[a]} emergency price`}
                          value={row.emergency}
                          disabled={!canEdit}
                          changed={row.emergency !== was.emergency}
                          onCommit={(v) => setRow(b, a, 'emergency', v)}
                        />
                        <p className="num h-4 pl-1 pt-0.5 text-[10.5px] font-semibold text-faint">{row.emergency !== was.emergency ? `Live ${inr(was.emergency)}` : ''}</p>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-3 2xl:grid-cols-1 2xl:content-start">
        <Preview catalog={store.catalog} />
        <Card>
          <CardHeader title="Fees & taxes" sub="Applied to every new booking" />
          <ul className="divide-y divide-line">
            {FEES.map((f) => (
              <li key={f.key} className="flex items-center gap-3 px-5 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">{f.label}</span>
                  <span className="block text-xs font-medium text-muted">{f.hint}</span>
                </span>
                <NumberInput className="w-28" label={f.label} value={p[f.key]} disabled={!canEdit} changed={p[f.key] !== live[f.key]} onCommit={(v) => setFee(f.key, f.label, v)} />
              </li>
            ))}
            <li className="flex items-center gap-3 px-5 py-3">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold">Tax (GST)</span>
                <span className="block text-xs font-medium text-muted">On labour, parts and fees</span>
              </span>
              <NumberInput className="w-28" prefix="" suffix="%" max={40} label="Tax percent" value={p.taxPct} disabled={!canEdit} changed={p.taxPct !== live.taxPct} onCommit={(v) => setFee('taxPct', 'Tax', v)} />
            </li>
          </ul>
        </Card>
        <Card>
          <CardHeader title="Labour charge" sub="Per appliance, charged once the repair starts" />
          <ul className="divide-y divide-line">
            {APPLIANCES.map((a) => (
              <li key={a} className="flex items-center gap-3 px-5 py-2.5">
                <span className="grid size-8 place-items-center rounded-lg bg-brand-soft text-brand">
                  <ApplianceGlyph appliance={a} className="size-4" />
                </span>
                <span className="flex-1 text-sm font-semibold">{APPLIANCE_LABEL[a]}</span>
                <NumberInput
                  className="w-28"
                  label={`${APPLIANCE_LABEL[a]} labour`}
                  value={p.labour[a]}
                  disabled={!canEdit}
                  changed={p.labour[a] !== live.labour[a]}
                  onCommit={(v) => {
                    const was = p.labour[a]
                    store.updateCatalog(
                      (c) => {
                        c.pricing.labour[a] = v
                        return c
                      },
                      { action: 'Changed labour charge', target: APPLIANCE_LABEL[a], old: inr(was), new: inr(v) }
                    )
                    toast(`${APPLIANCE_LABEL[a]} labour: ${inr(was)} → ${inr(v)}`)
                  }}
                />
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}

/** The checkout a customer would see for one brand + appliance, from the draft. */
function Preview({ catalog }: { catalog: Catalog }) {
  const [b, setB] = useState<Brand>('samsung')
  const [a, setA] = useState<Appliance>('ac')
  const [mode, setMode] = useState<'normal' | 'emergency'>('normal')
  const p: Pricing = catalog.pricing
  const base = p.rows[b][a][mode]
  const extra = mode === 'emergency' ? p.emergencyCharge : 0
  const sub = base + p.visitCharge + p.platformFee + extra
  const tax = Math.round((sub * p.taxPct) / 100)
  const lines: [string, number][] = [
    [`${BRAND_LABEL[b]} ${APPLIANCE_LABEL[a]} · ${mode === 'emergency' ? 'emergency' : 'standard'} visit`, base],
    ['Visit charge', p.visitCharge],
    ...(extra ? ([['Emergency charge', extra]] as [string, number][]) : []),
    ['Platform fee', p.platformFee],
    [`GST ${p.taxPct}%`, tax],
  ]
  return (
    <Card>
      <CardHeader title="Customer sees" sub="Checkout estimate from the draft prices, before parts" />
      <div className="space-y-3 p-5">
        <div className="grid grid-cols-2 gap-2">
          <Select label="Brand" value={b} onChange={setB} className="w-full" options={BRANDS.map((x) => ({ value: x, label: BRAND_LABEL[x] }))} />
          <Select label="Appliance" value={a} onChange={setA} className="w-full" options={APPLIANCES.map((x) => ({ value: x, label: APPLIANCE_LABEL[x] }))} />
        </div>
        <Segmented
          value={mode}
          onChange={setMode}
          className="w-full [&>button]:flex-1"
          options={[
            { value: 'normal', label: 'Normal' },
            { value: 'emergency', label: 'Emergency' },
          ]}
        />
        <dl className="rounded-lg border border-line">
          {lines.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 border-b border-line px-3 py-2 text-[13px] last:border-0">
              <dt className="min-w-0 truncate font-medium text-muted">{k}</dt>
              <dd className="num font-bold">{inr(v)}</dd>
            </div>
          ))}
          <div className={cn('flex justify-between rounded-b-lg px-3 py-2.5', mode === 'emergency' ? 'bg-danger-soft' : 'bg-brand-soft')}>
            <dt className="text-sm font-extrabold">Estimated total</dt>
            <dd className={cn('num text-base font-extrabold', mode === 'emergency' ? 'text-danger' : 'text-brand')}>{inr(sub + tax)}</dd>
          </div>
        </dl>
      </div>
    </Card>
  )
}

/* -------------------------------------------------------------- Emergency */

/** The emergency desk's price rules and promise. */
export function EmergencyTab() {
  const store = useStore()
  const toast = useToast()
  const canEdit = store.can('catalog', 'edit')
  const e = store.catalog.emergency
  const live = store.catalogPublished.emergency
  const p = store.catalog.pricing

  const set = <K extends keyof typeof e>(k: K, v: (typeof e)[K], label: string, fmt: (x: (typeof e)[K]) => string) => {
    const was = e[k]
    store.updateCatalog(
      (c) => {
        c.emergency[k] = v
        return c
      },
      { action: 'Changed emergency pricing', target: label, old: fmt(was), new: fmt(v) }
    )
    toast(`${label}: ${fmt(was)} → ${fmt(v)}`)
  }
  const money = (n: number) => inr(n)

  return (
    <div className="grid gap-5 xl:grid-cols-[400px_1fr]">
      <Card className="self-start">
        <CardHeader
          title="Emergency desk"
          sub="Rules for bookings marked emergency"
          action={
            <Toggle
              checked={e.enabled}
              label="Emergency bookings"
              onChange={(v) => canEdit && set('enabled', v, 'Emergency bookings', (x) => (x ? 'On' : 'Off'))}
            />
          }
        />
        <ul className="divide-y divide-line">
          <li className="flex items-center gap-3 px-5 py-3">
            <Siren className="size-4 text-danger" aria-hidden />
            <span className="flex-1 text-sm font-bold">Emergency surcharge</span>
            <NumberInput className="w-28" label="Emergency surcharge" value={e.surcharge} disabled={!canEdit} changed={e.surcharge !== live.surcharge} onCommit={(v) => set('surcharge', v, 'Emergency surcharge', money)} />
          </li>
          <li className="flex items-center gap-3 px-5 py-3">
            <Moon className="size-4 text-violet" aria-hidden />
            <span className="flex-1 text-sm font-bold">Night surcharge</span>
            <NumberInput className="w-28" label="Night surcharge" value={e.nightSurcharge} disabled={!canEdit} changed={e.nightSurcharge !== live.nightSurcharge} onCommit={(v) => set('nightSurcharge', v, 'Night surcharge', money)} />
          </li>
          <li className="grid grid-cols-2 gap-3 px-5 py-3">
            <Field label="Night from">
              <input
                type="time"
                disabled={!canEdit}
                value={e.nightFrom}
                onChange={(ev) => ev.target.value && set('nightFrom', ev.target.value, 'Night hours start', (x) => x)}
                className={cn(inputClass, e.nightFrom !== live.nightFrom && 'border-warning/60')}
              />
            </Field>
            <Field label="Night to">
              <input
                type="time"
                disabled={!canEdit}
                value={e.nightTo}
                onChange={(ev) => ev.target.value && set('nightTo', ev.target.value, 'Night hours end', (x) => x)}
                className={cn(inputClass, e.nightTo !== live.nightTo && 'border-warning/60')}
              />
            </Field>
          </li>
          <li className="flex items-center gap-3 px-5 py-3">
            <span className="flex-1">
              <span className="block text-sm font-bold">Arrival promise (SLA)</span>
              <span className="block text-xs font-medium text-muted">Technician on site within</span>
            </span>
            <NumberInput className="w-28" prefix="" suffix="min" min={10} max={240} label="Emergency SLA minutes" value={e.slaMin} disabled={!canEdit} changed={e.slaMin !== live.slaMin} onCommit={(v) => set('slaMin', v, 'Emergency SLA', (x) => `${x} min`)} />
          </li>
          <li className="flex items-center gap-3 px-5 py-3">
            <span className="flex-1">
              <span className="block text-sm font-bold">Maximum dispatch radius</span>
              <span className="block text-xs font-medium text-muted">Farther technicians aren’t offered emergencies</span>
            </span>
            <NumberInput className="w-28" prefix="" suffix="km" min={1} max={60} label="Emergency radius" value={e.maxRadiusKm} disabled={!canEdit} changed={e.maxRadiusKm !== live.maxRadiusKm} onCommit={(v) => set('maxRadiusKm', v, 'Emergency radius', (x) => `${x} km`)} />
          </li>
        </ul>
        <p className="border-t border-line px-5 py-3 text-xs font-medium text-muted">
          Customers pay the emergency price below, plus {inr(p.emergencyCharge)} emergency charge{e.nightSurcharge ? ` and ${inr(e.nightSurcharge)} between ${e.nightFrom} and ${e.nightTo}` : ''}.
        </p>
      </Card>

      <Card className="min-w-0">
        <CardHeader title="Emergency prices · brand × appliance" sub="Edit these on the Pricing tab. The uplift column shows emergency over normal." />
        {/* Phone: one card per appliance — the matrix would scroll sideways. */}
        <ul className="divide-y divide-line sm:hidden">
          {APPLIANCES.map((a) => (
            <li key={a} className="px-4 py-3">
              <p className="mb-2 flex items-center gap-2 text-sm font-bold">
                <ApplianceGlyph appliance={a} className="size-4 text-brand" />
                {APPLIANCE_LABEL[a]}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {BRANDS.map((b) => {
                  const r = p.rows[b][a]
                  return (
                    <div key={b} className="rounded-lg bg-canvas px-3 py-2">
                      <span className="block text-[10.5px] font-bold uppercase tracking-wider text-faint">{BRAND_LABEL[b]}</span>
                      <span className="num block text-sm font-extrabold text-danger">{inr(r.emergency)}</span>
                      <span className="num block text-[11px] font-semibold text-faint">+{inr(r.emergency - r.normal)} over {inr(r.normal)}</span>
                    </div>
                  )
                })}
              </div>
            </li>
          ))}
        </ul>
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line bg-canvas/60 text-[11px] font-bold uppercase tracking-[0.06em] text-faint">
                <th className="px-5 py-2.5 text-left">Appliance</th>
                {BRANDS.map((b) => (
                  <th key={b} className="px-4 py-2.5 text-right">
                    {BRAND_LABEL[b]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {APPLIANCES.map((a) => (
                <tr key={a} className="border-b border-line last:border-0">
                  <th scope="row" className="px-5 py-3 text-left font-bold">
                    <span className="inline-flex items-center gap-2">
                      <ApplianceGlyph appliance={a} className="size-4 text-brand" />
                      {APPLIANCE_LABEL[a]}
                    </span>
                  </th>
                  {BRANDS.map((b) => {
                    const r = p.rows[b][a]
                    return (
                      <td key={b} className="px-4 py-3 text-right">
                        <span className="num block font-extrabold text-danger">{inr(r.emergency)}</span>
                        <span className="num block text-[11px] font-semibold text-faint">
                          +{inr(r.emergency - r.normal)} over {inr(r.normal)}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
