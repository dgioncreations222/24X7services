'use client'

import { Landmark, Mail, MapPin, Phone, Smartphone } from 'lucide-react'
import { useAction } from '@/components/catalog/parts'
import { Detail, SectionLabel } from '@/components/ui'
import { setPartnerSkills, useCan, useCategories, type Partner } from '@/lib/data'
import { cn } from '@/lib/cn'
import { longDate } from '@/lib/format'

/** Contact, where they work, which categories they may take, and where payouts go. */
export function ProfilePanel({ partner: p }: { partner: Partner }) {
  const categories = useCategories()
  const can = useCan()
  const editable = can('technicians', 'edit')
  const { run, busy } = useAction()
  const toggle = (id: string) => {
    const next = p.skills.includes(id) ? p.skills.filter((s) => s !== id) : [...p.skills, id]
    const name = categories.data?.find((c) => c.id === id)?.name ?? id
    void run(() => setPartnerSkills(p.id, next), `${name} ${p.skills.includes(id) ? 'removed from' : 'added to'} ${p.name}`)
  }
  return (
    <>
      <SectionLabel>Contact</SectionLabel>
      <dl className="grid gap-3 sm:grid-cols-2">
        <Detail label="Mobile">
          <a href={`tel:${p.phone.replace(/\s/g, '')}`} className="num inline-flex items-center gap-1.5 hover:text-brand">
            <Phone className="size-3.5 text-faint" aria-hidden /> {p.phone}
          </a>
        </Detail>
        <Detail label="Email">
          <span className="inline-flex items-center gap-1.5 break-all">
            <Mail className="size-3.5 shrink-0 text-faint" aria-hidden /> {p.email}
          </span>
        </Detail>
        <Detail label="Works in">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-3.5 text-faint" aria-hidden /> {p.area}, {p.city}
          </span>
        </Detail>
        <Detail label="Experience · joined">
          {p.experienceYears} yrs · {longDate(new Date(p.createdAt).toISOString())}
        </Detail>
      </dl>

      <SectionLabel>Categories they take jobs in</SectionLabel>
      <div className="flex flex-wrap gap-1.5">
        {categories.data?.map((c) => {
          const on = p.skills.includes(c.id)
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={on}
              disabled={!editable || busy}
              onClick={() => toggle(c.id)}
              className={cn(
                'inline-flex h-8 items-center rounded-lg border px-2.5 text-[13px] font-bold transition-colors disabled:cursor-default',
                on ? 'border-tech/30 bg-tech-soft text-tech' : 'border-line text-muted hover:border-line-strong',
                !editable && !on && 'opacity-60'
              )}
            >
              {c.name}
            </button>
          )
        })}
      </div>

      <SectionLabel>Payouts go to</SectionLabel>
      {p.payout ? (
        <p className="flex items-center gap-2 rounded-lg border border-line px-3 py-2.5 text-sm font-semibold">
          {p.payout.kind === 'bank' ? (
            <>
              <Landmark className="size-4 text-faint" aria-hidden /> {p.payout.accountName} · <span className="num">···· {p.payout.accountLast4} · {p.payout.ifsc}</span>
            </>
          ) : (
            <>
              <Smartphone className="size-4 text-faint" aria-hidden /> UPI · <span className="num">{p.payout.upiId}</span>
            </>
          )}
        </p>
      ) : (
        <p className="text-sm text-muted">Not added yet.</p>
      )}
    </>
  )
}
