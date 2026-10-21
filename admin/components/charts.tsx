'use client'

import { useState } from 'react'
import { cn } from '@/lib/cn'
import { compact } from '@/lib/format'

/**
 * The console's charts, drawn as plain SVG + HTML. One series wears the
 * brand blue; a breakdown takes the categorical slots below in this fixed
 * order (validated for colour-blind separation), never cycled. Values and
 * labels stay in text colours; the mark beside them carries identity.
 */
export const SERIES = ['var(--color-chart-1)', 'var(--color-chart-2)', 'var(--color-chart-3)', 'var(--color-chart-4)', 'var(--color-chart-5)'] as const

/** A round step so the four gridlines land on readable numbers. */
function niceStep(raw: number) {
  if (raw <= 0) return 1
  const p = 10 ** Math.floor(Math.log10(raw))
  const n = raw / p
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p
}

/** Vertical bars over time with a hover readout. */
export function BarChart({
  data,
  format = (n) => n.toLocaleString('en-IN'),
  height = 220,
  labelEvery = 1,
  name,
}: {
  data: { label: string; value: number; detail?: string }[]
  format?: (n: number) => string
  height?: number
  labelEvery?: number
  name: string
}) {
  const [hover, setHover] = useState<number | null>(null)
  const step = Math.max(niceStep(Math.max(...data.map((d) => d.value), 1) / 4), 1)
  const max = step * 4
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max)
  const h = hover !== null ? data[hover] : null
  return (
    <figure className="relative" aria-label={name}>
      <div className="flex gap-2" style={{ height }}>
        <div className="num flex w-9 shrink-0 flex-col-reverse justify-between pb-6 text-right text-[10.5px] font-semibold text-faint">
          {ticks.map((t) => (
            <span key={t} className="-mb-1.5 leading-none">
              {compact(t)}
            </span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
          <div className="absolute inset-x-0 bottom-6 top-0 flex flex-col-reverse justify-between" aria-hidden>
            {ticks.map((t, i) => (
              <span key={t} className={cn('block h-px w-full', i === 0 ? 'bg-line-strong' : 'bg-line/70')} />
            ))}
          </div>
          <div className="absolute inset-x-0 bottom-6 top-0 flex items-end gap-[2px]" onMouseLeave={() => setHover(null)}>
            {data.map((d, i) => (
              <button
                key={i}
                type="button"
                aria-label={`${d.label}: ${format(d.value)}`}
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                className="group relative flex h-full min-w-0 flex-1 items-end justify-center focus-visible:rounded"
              >
                <span
                  className={cn('block w-full max-w-7 rounded-t-[4px] transition-opacity', hover !== null && hover !== i && 'opacity-45')}
                  style={{ height: `${Math.max((d.value / max) * 100, d.value ? 1.5 : 0)}%`, background: SERIES[0] }}
                />
              </button>
            ))}
          </div>
          <div className="absolute inset-x-0 bottom-0 flex h-5 gap-[2px]" aria-hidden>
            {data.map((d, i) => (
              <span key={i} className="min-w-0 flex-1 truncate text-center text-[10.5px] font-semibold text-faint">
                {i % labelEvery === 0 || i === data.length - 1 ? d.label : ''}
              </span>
            ))}
          </div>
          {h && hover !== null && (
            <div
              className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-xs text-white shadow-float"
              style={{ left: `${((hover + 0.5) / data.length) * 100}%` }}
            >
              <p className="font-semibold text-white/70">{h.label}</p>
              <p className="num font-extrabold">{format(h.value)}</p>
              {h.detail && <p className="text-white/70">{h.detail}</p>}
            </div>
          )}
        </div>
      </div>
    </figure>
  )
}

/** Ranked horizontal bars — "which brand / area / appliance". */
export function HBars({
  rows,
  format = (n) => n.toLocaleString('en-IN'),
  color = SERIES[0],
}: {
  rows: { label: React.ReactNode; value: number; key: string; note?: string }[]
  format?: (n: number) => string
  color?: string
}) {
  const max = Math.max(...rows.map((r) => r.value), 1)
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.key} title={`${r.key}: ${format(r.value)}`}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="min-w-0 truncate font-semibold text-ink-2">{r.label}</span>
            <span className="num shrink-0 font-bold text-ink">
              {format(r.value)}
              {r.note && <span className="ml-1.5 text-xs font-semibold text-faint">{r.note}</span>}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-canvas">
            <div className="h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: color }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Share of a whole, with a legend that also carries the numbers. */
export function Donut({
  slices,
  center,
  centerLabel,
  format = (n) => n.toLocaleString('en-IN'),
}: {
  slices: { label: string; value: number }[]
  center: string
  centerLabel: string
  format?: (n: number) => string
}) {
  const [hover, setHover] = useState<number | null>(null)
  const total = slices.reduce((s, x) => s + x.value, 0) || 1
  const R = 42
  const C = 2 * Math.PI * R
  const gap = slices.length > 1 ? 1.6 : 0
  const offsets = slices.map((_, i) => slices.slice(0, i).reduce((s, x) => s + (x.value / total) * C, 0))
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative size-40 shrink-0">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
          <circle cx="50" cy="50" r={R} fill="none" stroke="var(--color-canvas)" strokeWidth="12" />
          {slices.map((s, i) => {
            const len = (s.value / total) * C
            return (
              <circle
                key={s.label}
                cx="50"
                cy="50"
                r={R}
                fill="none"
                stroke={SERIES[i % SERIES.length]}
                strokeWidth={hover === i ? 14 : 12}
                strokeDasharray={`${Math.max(len - gap, 0)} ${C}`}
                strokeDashoffset={-offsets[i]!}
                className="transition-[stroke-width]"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            )
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="num text-xl font-extrabold leading-tight">{hover !== null ? format(slices[hover]!.value) : center}</p>
            <p className="text-[11px] font-semibold text-muted">{hover !== null ? slices[hover]!.label : centerLabel}</p>
          </div>
        </div>
      </div>
      <ul className="w-full min-w-0 flex-1 space-y-2">
        {slices.map((s, i) => (
          <li
            key={s.label}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            className={cn('flex items-center gap-2.5 rounded-md px-1.5 py-1 text-[13px]', hover === i && 'bg-canvas')}
          >
            <span className="size-2.5 shrink-0 rounded-sm" style={{ background: SERIES[i % SERIES.length] }} aria-hidden />
            <span className="min-w-0 flex-1 truncate font-semibold text-ink-2">{s.label}</span>
            <span className="num font-bold">{format(s.value)}</span>
            <span className="num w-10 text-right text-xs font-semibold text-faint">{Math.round((s.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** A thin trend line for a stat tile. */
export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  if (values.length < 2) return null
  const max = Math.max(...values, 1)
  const min = Math.min(...values)
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${30 - ((v - min) / (max - min || 1)) * 26 - 2}`).join(' ')
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className={cn('h-8 w-full', className)} aria-hidden>
      <polyline points={pts} fill="none" stroke={SERIES[0]} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
