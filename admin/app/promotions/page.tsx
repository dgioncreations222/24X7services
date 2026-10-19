'use client'

import Link from 'next/link'
import type { Route } from 'next'
import { useState } from 'react'
import { BellRing, Gift, Send } from 'lucide-react'
import { OffersManager } from '@/components/promo-offers'
import { useToast } from '@/components/toast'
import { Avatar, Button, Card, CardHeader, Chip, Field, Page, PageHeader, Segmented, inputClass } from '@/components/ui'
import { ago } from '@/lib/format'
import { BRAND } from '@/lib/brand'
import { useStore } from '@/lib/store'
import type { Broadcast } from '@/lib/types'

type Audience = Broadcast['audience']
const AUDIENCE: Record<Audience, string> = { customers: 'Customers', technicians: 'Technicians', all: 'Everyone' }

/** Customer growth levers: offers and coupons, referrals and push messages. */
export default function Promotions() {
  const store = useStore()

  const refer = store.coupons.find((c) => c.code === 'REFER100')
  const referrers = [...store.customers].filter((c) => c.referrals > 0).sort((a, z) => z.referrals - a.referrals)
  const totalRefs = referrers.reduce((s, c) => s + c.referrals, 0)
  const referBookings = store.bookings.filter((b) => b.coupon === 'REFER100')

  return (
    <Page>
      <PageHeader
        side="customer"
        title="Promotions"
        sub="Offers, coupons, referrals and push notifications"
      />

      <OffersManager />

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Card className="self-start">
          <CardHeader title="Referral programme" sub="Both friends get ₹100 off with REFER100" />
          <dl className="grid grid-cols-3 divide-x divide-line border-b border-line">
            {[
              ['Referrals', totalRefs.toLocaleString('en-IN')],
              ['Redeemed', (refer?.used ?? 0).toLocaleString('en-IN')],
              ['Booked · 30d', referBookings.length.toLocaleString('en-IN')],
            ].map(([k, v]) => (
              <div key={k} className="px-4 py-3 text-center">
                <dt className="text-[11px] font-bold uppercase tracking-[0.06em] text-faint">{k}</dt>
                <dd className="num mt-0.5 text-lg font-extrabold">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="px-5 pb-1 pt-4 text-[11px] font-extrabold uppercase tracking-[0.1em] text-faint">Top referrers</p>
          <ul className="divide-y divide-line">
            {referrers.slice(0, 6).map((c, i) => (
              <li key={c.id}>
                <Link href={`/customers/?id=${c.id}` as Route} className="flex items-center gap-3 px-5 py-2.5 hover:bg-canvas/60">
                  <span className="num w-4 text-xs font-bold text-faint">{i + 1}</span>
                  <Avatar name={c.name} size={30} side="customer" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{c.name}</span>
                    <span className="block font-mono text-[11px] font-semibold text-muted">{c.referralCode}</span>
                  </span>
                  <span className="num text-sm font-extrabold">
                    {c.referrals} <Gift className="inline size-3.5 text-faint" aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Compose />

        <Card className="self-start">
          <CardHeader title="Sent notifications" sub={`${store.broadcasts.length} pushes`} />
          <ul className="max-h-[480px] divide-y divide-line overflow-y-auto">
            {store.broadcasts.map((b) => (
              <li key={b.id} className="px-5 py-3">
                <div className="flex items-center justify-between gap-2">
                  <Chip tone={b.audience === 'technicians' ? 'violet' : b.audience === 'customers' ? 'brand' : 'info'}>{AUDIENCE[b.audience]}</Chip>
                  <span className="text-[11px] font-semibold text-faint">{ago(b.at)}</span>
                </div>
                <p className="mt-2 text-sm font-bold">{b.title}</p>
                <p className="mt-0.5 text-[13px] font-medium text-muted">{b.body}</p>
                <p className="num mt-1.5 text-[11px] font-bold text-faint">Delivered to {b.reach.toLocaleString('en-IN')}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>

    </Page>
  )
}

/** Push composer with a lock-screen preview of what lands on the phone. */
function Compose() {
  const store = useStore()
  const toast = useToast()
  const [audience, setAudience] = useState<Audience>('customers')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const reach =
    audience === 'customers'
      ? store.customers.filter((c) => c.status === 'active').length
      : audience === 'technicians'
        ? store.technicians.filter((t) => t.kyc === 'verified').length
        : store.customers.filter((c) => c.status === 'active').length + store.technicians.filter((t) => t.kyc === 'verified').length

  return (
    <Card className="self-start">
      <CardHeader title="Send push notification" sub={`Reaches ${reach} ${audience === 'all' ? 'people' : audience}`} />
      <div className="space-y-4 p-5">
        <Segmented
          value={audience}
          onChange={setAudience}
          className="w-full [&>button]:flex-1"
          options={(['customers', 'technicians', 'all'] as const).map((a) => ({ value: a, label: AUDIENCE[a] }))}
        />
        <Field label="Title">
          <input value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} placeholder="Monsoon AC check-up — 20% off" className={inputClass} />
        </Field>
        <Field label="Message" hint={`${body.length}/160`}>
          <textarea value={body} maxLength={160} rows={3} onChange={(e) => setBody(e.target.value)} placeholder="What should people know?" className={inputClass} />
        </Field>

        <div className="rounded-2xl bg-gradient-to-b from-[#1b2550] to-[#0f1d57] p-3" aria-label="Preview">
          <p className="num mb-2 text-center text-[11px] font-semibold text-white/60">
            {new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
          </p>
          <div className="rounded-xl bg-white/90 p-3 shadow-float backdrop-blur">
            <div className="flex items-center gap-2 text-[11px] font-bold text-muted">
              <span className="grid size-5 place-items-center rounded bg-brand-ink text-[7px] font-extrabold text-white">{BRAND.mark}</span>
              {(audience === 'technicians' ? `${BRAND.name} Partner` : BRAND.name).toUpperCase()} · now
            </div>
            <p className="mt-1.5 truncate text-[13px] font-extrabold text-ink">{title || 'Notification title'}</p>
            <p className="line-clamp-2 text-xs font-medium text-ink-2">{body || 'Your message appears here.'}</p>
          </div>
        </div>

        <Button
          className="w-full"
          disabled={!title.trim() || !body.trim()}
          onClick={() => {
            store.sendBroadcast({ audience, title: title.trim(), body: body.trim() })
            toast(`Push sent to ${reach} ${audience === 'all' ? 'people' : audience}`)
            setTitle('')
            setBody('')
          }}
        >
          <Send /> Send now
        </Button>
        <p className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-faint">
          <BellRing className="size-3.5" aria-hidden /> Respects each person’s notification settings
        </p>
      </div>
    </Card>
  )
}
