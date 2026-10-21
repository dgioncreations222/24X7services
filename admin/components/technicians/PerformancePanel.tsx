'use client'

import { rupees } from '@/lib/money'
import { Rating, SectionLabel } from '@/components/ui'
import type { Partner } from '@/lib/data'
import { cn } from '@/lib/cn'


/** How well they work: ratings, volume, and the three rates dispatch watches. */
export function PerformancePanel({ partner: p }: { partner: Partner }) {
  if (p.status !== 'active' && p.status !== 'suspended') {
    return <p className="mt-6 text-sm text-muted">Numbers appear once they start taking jobs.</p>
  }
  return (
    <>
      <SectionLabel>Last 30 days</SectionLabel>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Rating" sub={`${p.ratingCount.toLocaleString('en-IN')} ratings`}>
          <Rating value={p.rating} className="text-base" />
        </Tile>
        <Tile label="Jobs done" sub={`${p.completedJobs.toLocaleString('en-IN')} lifetime`}>
          {p.jobs30}
        </Tile>
        <Tile label="Earned" sub="After commission">
          {rupees(p.earnings30)}
        </Tile>
        <Tile label="Status now" sub={p.status === 'suspended' ? 'Not getting jobs' : 'Getting jobs'}>
          {p.status === 'suspended' ? 'Paused' : p.onJob ? 'On a job' : p.online ? 'Online' : 'Offline'}
        </Tile>
      </dl>
      <SectionLabel>Reliability</SectionLabel>
      <div className="space-y-3 rounded-card border border-line p-4">
        <Bar label="Offers accepted" value={p.acceptanceRate} good={80} />
        <Bar label="Arrived on time" value={p.onTimeRate} good={90} />
        <Bar label="Jobs cancelled" value={p.cancelRate} good={5} lowerIsBetter />
      </div>
    </>
  )
}

function Tile({ label, sub, children }: { label: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-line p-3">
      <dt className="text-[11px] font-bold uppercase tracking-[0.06em] text-faint">{label}</dt>
      <dd className="num mt-0.5 text-base font-extrabold">{children}</dd>
      <dd className="text-[11px] font-medium text-muted">{sub}</dd>
    </div>
  )
}

/** A rate against its target: green when on target, amber when not. */
function Bar({ label, value, good, lowerIsBetter }: { label: string; value: number; good: number; lowerIsBetter?: boolean }) {
  const ok = lowerIsBetter ? value <= good : value >= good
  return (
    <div>
      <div className="mb-1 flex justify-between text-[13px]">
        <span className="font-semibold text-ink-2">
          {label} <span className="text-xs font-medium text-faint">· target {lowerIsBetter ? '≤' : '≥'} {good}%</span>
        </span>
        <span className={cn('num font-bold', !ok && 'text-warning')}>{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-canvas">
        <div className={cn('h-full rounded-full', ok ? 'bg-success' : 'bg-warning')} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  )
}
