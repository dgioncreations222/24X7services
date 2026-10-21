'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Bell, ChevronRight, Database, FileClock, MapPinned, Settings2, ShieldCheck, Siren } from 'lucide-react'
import { useToast } from '@/components/toast'
import { Button, Card, CardHeader, Chip, Modal, Page, PageHeader, Toggle, inputClass } from '@/components/ui'
import { cn } from '@/lib/cn'
import { ADMIN, useStore } from '@/lib/store'

const SECTIONS = [
  { id: 'operations', label: 'Operations', icon: Settings2 },
  { id: 'areas', label: 'Service areas', icon: MapPinned },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'access', label: 'Access & audit', icon: ShieldCheck },
  { id: 'demo', label: 'Demo data', icon: Database },
] as const

/** How the console and the network behave. Staff and the audit trail live on their own pages. */
export default function SettingsPage() {
  const store = useStore()
  const toast = useToast()
  const s = store.settings
  const [sla, setSla] = useState(String(s.emergencySlaMin))
  const [resetting, setResetting] = useState(false)
  const [notify, setNotify] = useState({ emergency: true, unassigned: true, kyc: true, tickets: true, payouts: false, digest: true })
  const activeAreas = s.areas.filter((a) => a.active).length

  return (
    <Page>
      <PageHeader title="Settings" sub={`Signed in as ${ADMIN.name} · ${store.as}`} />

      <div className="lg:grid lg:grid-cols-[200px_1fr] lg:gap-8">
        <nav aria-label="Settings sections" className="no-scrollbar -mx-4 mb-5 flex gap-1 overflow-x-auto px-4 lg:sticky lg:top-24 lg:mx-0 lg:mb-0 lg:flex-col lg:self-start lg:px-0">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <a
              key={id}
              href={`#${id}`}
              className="flex h-9 shrink-0 items-center gap-2.5 rounded-lg border border-line bg-card px-3 text-sm font-semibold text-ink-2 hover:bg-canvas lg:border-0 lg:bg-transparent"
            >
              <Icon className="size-4 text-muted" aria-hidden /> {label}
            </a>
          ))}
        </nav>

        <div className="min-w-0 space-y-5">
          <Card id="operations" className="scroll-mt-24">
            <CardHeader title="Operations" sub="How bookings reach technicians" />
            <ul className="divide-y divide-line">
              <Line title="Auto-assign bookings" sub="Offer each paid booking to the nearest free certified technician. Off means dispatchers assign by hand.">
                <Toggle
                  checked={s.autoAssign}
                  label="Auto-assign"
                  onChange={(v) => {
                    store.updateSettings({ autoAssign: v })
                    toast(`Auto-assign ${v ? 'on' : 'off'}`)
                  }}
                />
              </Line>
              <Line title="Emergency response target" sub="Minutes from booking to a technician on site; emergencies past it are escalated.">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={10}
                    max={240}
                    value={sla}
                    onChange={(e) => setSla(e.target.value)}
                    aria-label="Emergency SLA minutes"
                    className={`${inputClass} num w-20 text-right font-bold`}
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={Number(sla) === s.emergencySlaMin || !(Number(sla) >= 10 && Number(sla) <= 240)}
                    onClick={() => {
                      store.updateSettings({ emergencySlaMin: Number(sla) })
                      toast(`Emergency target set to ${sla} min`)
                    }}
                  >
                    Save
                  </Button>
                </div>
              </Line>
            </ul>
            <p className="flex items-start gap-2 border-t border-line bg-danger-soft/50 px-5 py-3 text-xs font-semibold text-ink-2">
              <Siren className="mt-0.5 size-3.5 shrink-0 text-danger" aria-hidden />
              The emergency desk runs round the clock — emergencies reach technicians outside their working hours if they opted in.
            </p>
          </Card>

          <Card id="areas" className="scroll-mt-24">
            <CardHeader title="Service areas" sub={`${activeAreas} of ${s.areas.length} Hyderabad pincodes accepting bookings`} />
            <ul className="grid divide-y divide-line sm:grid-cols-2 sm:divide-y-0">
              {s.areas.map((a, i) => (
                <li key={a.pincode} className={cn('flex items-center gap-3 px-5 py-2.5 sm:border-b sm:border-line', i % 2 === 0 && 'sm:border-r')}>
                  <span className="min-w-0 flex-1">
                    <span className={cn('block text-sm font-bold', !a.active && 'text-muted')}>{a.area}</span>
                    <span className="num block text-xs font-semibold text-faint">{a.pincode}</span>
                  </span>
                  {!a.active && <Chip tone="neutral">Paused</Chip>}
                  <Toggle
                    size="sm"
                    checked={a.active}
                    label={`${a.area} active`}
                    onChange={(v) => {
                      store.updateSettings((cur) => ({ areas: cur.areas.map((x) => (x.pincode === a.pincode ? { ...x, active: v } : x)) }))
                      toast(`${a.area} ${v ? 'accepting bookings' : 'paused'}`)
                    }}
                  />
                </li>
              ))}
            </ul>
          </Card>

          <Card id="access" className="scroll-mt-24">
            <CardHeader title="Access & accountability" sub="Staff, roles and the record of every change now have their own pages" />
            <div className="grid gap-3 p-5 sm:grid-cols-2">
              <Link href="/admins" className="flex items-center gap-3 rounded-lg border border-line p-4 transition-colors hover:border-line-strong hover:bg-canvas/60">
                <span className="grid size-9 place-items-center rounded-lg bg-brand-soft text-brand">
                  <ShieldCheck className="size-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">Admin Users</span>
                  <span className="block text-xs font-medium text-muted">{store.admins.length} staff · roles & permissions</span>
                </span>
                <ChevronRight className="size-4 text-faint" aria-hidden />
              </Link>
              <Link href="/audit" className="flex items-center gap-3 rounded-lg border border-line p-4 transition-colors hover:border-line-strong hover:bg-canvas/60">
                <span className="grid size-9 place-items-center rounded-lg bg-brand-soft text-brand">
                  <FileClock className="size-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">Audit Logs</span>
                  <span className="block text-xs font-medium text-muted">{store.audit.length} recorded changes · read-only</span>
                </span>
                <ChevronRight className="size-4 text-faint" aria-hidden />
              </Link>
            </div>
          </Card>

          <Card id="notifications" className="scroll-mt-24">
            <CardHeader title="Notifications" sub="What alerts you in the console and by email" />
            <ul className="divide-y divide-line">
              {(
                [
                  ['emergency', 'Emergency bookings', 'Instant alert when an emergency is waiting for a technician'],
                  ['unassigned', 'Unassigned bookings', 'When a paid booking has no technician 30 min before its slot'],
                  ['kyc', 'Technician applications', 'New onboarding documents to review'],
                  ['tickets', 'Urgent support tickets', 'Urgent and high-priority tickets from customers or technicians'],
                  ['payouts', 'Payout run reminders', 'Every Monday before the weekly settlement'],
                  ['digest', 'Daily email digest', 'Bookings, revenue and ratings at 9 PM'],
                ] as const
              ).map(([k, title, sub]) => (
                <Line key={k} title={title} sub={sub}>
                  <Toggle
                    checked={notify[k]}
                    label={title}
                    onChange={(v) => {
                      setNotify((n) => ({ ...n, [k]: v }))
                      toast(`${title} ${v ? 'on' : 'off'}`)
                    }}
                  />
                </Line>
              ))}
            </ul>
          </Card>

          <Card id="demo" className="scroll-mt-24">
            <CardHeader title="Demo data" sub="This console runs on a seeded month of the Hyderabad network, saved on this device" />
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <p className="max-w-lg text-sm font-medium text-muted">Resetting rebuilds every booking, technician, payout and ticket from the seed and clears your changes.</p>
              <Button variant="danger" onClick={() => setResetting(true)}>
                Reset demo data
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <Modal
        open={resetting}
        onClose={() => setResetting(false)}
        title="Reset demo data?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setResetting(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                store.resetDemo()
                setResetting(false)
                toast('Demo data reset')
              }}
            >
              Reset everything
            </Button>
          </>
        }
      >
        <p className="text-sm font-medium text-muted">All assignments, refunds, payouts, coupons and settings you changed are discarded. This cannot be undone.</p>
      </Modal>
    </Page>
  )
}

function Line({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-4 px-5 py-3.5">
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold">{title}</span>
        <span className="block text-xs font-medium text-muted">{sub}</span>
      </span>
      {children}
    </li>
  )
}
