'use client'

import { useState } from 'react'
import { APPLIANCES, APPLIANCE_LABEL, BRANDS, BRAND_LABEL, inr } from '@/lib/catalog'
import { cn } from '@/lib/cn'
import type { Catalog } from '@/lib/types'

/**
 * What the draft catalogue changes against the live one, as plain lines an
 * admin can read before publishing: "Samsung AC normal ₹499 → ₹599".
 */
export function catalogDiff(draft: Catalog, live: Catalog): string[] {
  const out: string[] = []
  const money = (label: string, a: number, b: number) => a !== b && out.push(`${label} ${inr(a)} → ${inr(b)}`)
  const onOff = (v: boolean) => (v ? 'enabled' : 'disabled')

  for (const a of APPLIANCES) {
    const d = draft.services[a]
    const l = live.services[a]
    const n = APPLIANCE_LABEL[a]
    if (d.enabled !== l.enabled) out.push(`${n} service ${onOff(d.enabled)}`)
    if (d.name !== l.name) out.push(`${n} renamed to “${d.name}”`)
    if (d.description !== l.description) out.push(`${n} description updated`)
    if (d.image !== l.image) out.push(`${n} image replaced`)
    for (const t of d.types) {
      const was = l.types.find((x) => x.name === t.name)
      if (!was) out.push(`${n}: added “${t.name}” at ${inr(t.price)}`)
      else {
        money(`${n} ${t.name}`, was.price, t.price)
        if (was.enabled !== t.enabled) out.push(`${n} ${t.name} ${onOff(t.enabled)}`)
      }
    }
    for (const t of l.types) if (!d.types.some((x) => x.name === t.name)) out.push(`${n}: removed “${t.name}”`)
  }

  for (const b of BRANDS) {
    const d = draft.brands[b]
    const l = live.brands[b]
    const n = BRAND_LABEL[b]
    if (d.enabled !== l.enabled) out.push(`${n} brand ${onOff(d.enabled)}`)
    if (d.logo !== l.logo) out.push(`${n} logo replaced`)
    if (d.image !== l.image) out.push(`${n} brand image replaced`)
    if (d.tagline !== l.tagline) out.push(`${n} tagline updated`)
    for (const a of APPLIANCES) {
      money(`${n} ${APPLIANCE_LABEL[a]} normal`, live.pricing.rows[b][a].normal, draft.pricing.rows[b][a].normal)
      money(`${n} ${APPLIANCE_LABEL[a]} emergency`, live.pricing.rows[b][a].emergency, draft.pricing.rows[b][a].emergency)
    }
  }

  const dp = draft.pricing
  const lp = live.pricing
  money('Visit charge', lp.visitCharge, dp.visitCharge)
  money('Emergency charge', lp.emergencyCharge, dp.emergencyCharge)
  money('Platform fee', lp.platformFee, dp.platformFee)
  money('Cancellation fee', lp.cancellationFee, dp.cancellationFee)
  money('Additional service charge', lp.additionalCharge, dp.additionalCharge)
  if (lp.taxPct !== dp.taxPct) out.push(`Tax ${lp.taxPct}% → ${dp.taxPct}%`)
  for (const a of APPLIANCES) money(`${APPLIANCE_LABEL[a]} labour`, lp.labour[a], dp.labour[a])

  const de = draft.emergency
  const le = live.emergency
  if (de.enabled !== le.enabled) out.push(`Emergency bookings ${onOff(de.enabled)}`)
  money('Emergency surcharge', le.surcharge, de.surcharge)
  money('Night surcharge', le.nightSurcharge, de.nightSurcharge)
  if (de.nightFrom !== le.nightFrom || de.nightTo !== le.nightTo) out.push(`Night hours ${le.nightFrom}–${le.nightTo} → ${de.nightFrom}–${de.nightTo}`)
  if (de.slaMin !== le.slaMin) out.push(`Emergency SLA ${le.slaMin} → ${de.slaMin} min`)
  if (de.maxRadiusKm !== le.maxRadiusKm) out.push(`Emergency radius ${le.maxRadiusKm} → ${de.maxRadiusKm} km`)
  return out
}

/**
 * A number field that commits on blur or Enter, so an audit entry is one
 * deliberate change rather than one per keystroke. Escape puts it back.
 */
export function NumberInput({
  value,
  onCommit,
  prefix = '₹',
  suffix,
  min = 0,
  max = 1_000_000,
  label,
  disabled,
  className,
  changed,
}: {
  value: number
  onCommit: (v: number) => void
  prefix?: string
  suffix?: string
  min?: number
  max?: number
  label: string
  disabled?: boolean
  className?: string
  /** Differs from what customers see right now. */
  changed?: boolean
}) {
  const [text, setText] = useState(String(value))
  const [seen, setSeen] = useState(value)
  // A publish, discard or another field changing the value resets the text.
  if (seen !== value) {
    setSeen(value)
    setText(String(value))
  }
  const commit = () => {
    const n = Number(text)
    if (text.trim() === '' || Number.isNaN(n) || n < min || n > max) {
      setText(String(value))
      return
    }
    if (n !== value) onCommit(Math.round(n * 100) / 100)
  }
  return (
    <span
      className={cn(
        'flex h-9 items-center rounded-lg border bg-card text-sm transition-[border-color,box-shadow] focus-within:border-brand focus-within:shadow-focus',
        changed ? 'border-warning/60 bg-warning-soft/40' : 'border-line-strong',
        disabled && 'bg-canvas opacity-70',
        className
      )}
    >
      {prefix && <span className="pl-2.5 text-xs font-bold text-faint">{prefix}</span>}
      <input
        type="number"
        inputMode="decimal"
        aria-label={label}
        disabled={disabled}
        value={text}
        min={min}
        max={max}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          if (e.key === 'Escape') {
            setText(String(value))
            ;(e.target as HTMLInputElement).blur()
          }
        }}
        className="num h-full w-full min-w-0 bg-transparent px-2 text-right font-bold outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      {suffix && <span className="pr-2.5 text-xs font-bold text-faint">{suffix}</span>}
    </span>
  )
}

/** The small amber dot that marks a card or cell as an unpublished draft. */
export function DraftDot({ show, className }: { show: boolean; className?: string }) {
  if (!show) return null
  return (
    <span className={cn('inline-flex items-center gap-1 text-[10.5px] font-extrabold uppercase tracking-wider text-warning', className)}>
      <span className="size-1.5 rounded-full bg-warning" aria-hidden />
      Draft
    </span>
  )
}
