'use client'

import Link from 'next/link'
import { Fragment, useState } from 'react'
import { BadgeCheck, ChevronDown, Download, Landmark, Wallet } from 'lucide-react'
import { FormError, SortTh, useAction } from '@/components/catalog/parts'
import { useTable } from '@/components/catalog/useTable'
import { Async, Avatar, Button, Card, Chip, Empty, Field, Modal, Page, PageHeader, Pager, SearchInput, Tabs, TableWrap, inputClass, td, th, tr } from '@/components/ui'
import { approvePayouts, markPayoutPaid, useCan, usePartners, usePayouts, type Partner, type PartnerPayout } from '@/lib/data'
import { cn } from '@/lib/cn'
import { downloadCsv } from '@/lib/format'

const rupees = (p: number) => '₹' + Math.round(p / 100).toLocaleString('en-IN')
const day = (t: number) => new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
const STATUS = { pending: { label: 'Waiting for approval', tone: 'warning' }, approved: { label: 'Approved', tone: 'info' }, paid: { label: 'Paid', tone: 'success' } } as const

/** What each technician earned each week after commission: approve, then mark paid when the transfer goes out. */
export default function PayoutsPage() {
  const payouts = usePayouts()
  const partners = usePartners()
  return (
    <Page>
      <PageHeader side="technician" title="Payouts" sub="One payout per technician per week: their completed, paid jobs minus commission. Suspended technicians’ payouts stay on hold." />
      <Card className="overflow-hidden">
        <Async query={payouts} empty={<Empty icon={<Wallet />} title="No payouts yet" />}>
          {(rows) => <PayoutTable rows={rows} partners={partners.data ?? []} />}
        </Async>
      </Card>
    </Page>
  )
}

function PayoutTable({ rows, partners }: { rows: PartnerPayout[]; partners: Partner[] }) {
  const can = useCan()
  const canApprove = can('payouts', 'approve')
  const [picked, setPicked] = useState<string[]>([])
  const [open, setOpen] = useState<string | null>(null)
  const [paying, setPaying] = useState<PartnerPayout | null>(null)
  const { run, busy, error } = useAction()
  const who = (id: string) => partners.find((p) => p.id === id)
  const t = useTable({
    rows,
    search: (p) => [p.id, who(p.partnerId)?.name, p.reference],
    filters: { pending: (p: PartnerPayout) => p.status === 'pending', approved: (p: PartnerPayout) => p.status === 'approved', paid: (p: PartnerPayout) => p.status === 'paid', all: () => true },
    sorts: { week: (p: PartnerPayout) => -p.periodStart, net: (p: PartnerPayout) => -p.net },
    initialSort: 'week',
  })
  const pendingVisible = t.visible.filter((p) => p.status === 'pending')
  const allPicked = pendingVisible.length > 0 && pendingVisible.every((p) => picked.includes(p.id))
  const pickedTotal = rows.filter((p) => picked.includes(p.id)).reduce((s, p) => s + p.net, 0)
  const sum = (s: PartnerPayout['status']) => rows.filter((p) => p.status === s).reduce((x, p) => x + p.net, 0)
  return (
    <>
      <div className="grid grid-cols-3 divide-x divide-line border-b border-line">
        {(['pending', 'approved', 'paid'] as const).map((s) => (
          <div key={s} className="p-4">
            <p className="text-xs font-semibold text-muted">{STATUS[s].label}</p>
            <p className="num text-lg font-extrabold">{rupees(sum(s))}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3 border-b border-line p-4">
        <Tabs
          value={t.filter}
          onChange={(f) => {
            t.setFilter(f)
            setPicked([])
          }}
          options={[
            { value: 'pending', label: 'To approve', count: rows.filter((p) => p.status === 'pending').length, alert: true },
            { value: 'approved', label: 'To pay', count: rows.filter((p) => p.status === 'approved').length },
            { value: 'paid', label: 'Paid', count: rows.filter((p) => p.status === 'paid').length },
            { value: 'all', label: 'All', count: rows.length },
          ]}
          className="border-b-0"
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <SearchInput value={t.q} onChange={t.setQ} placeholder="Technician, payout ID or bank reference" className="flex-1" />
          {can('payouts', 'export') && (
            <Button
              variant="secondary"
              onClick={() =>
                downloadCsv('payouts', [
                  ['Payout', 'Technician', 'Week from', 'Week to', 'Jobs', 'Gross (₹)', 'Commission (₹)', 'Net (₹)', 'Status', 'Approved by', 'Reference'],
                  ...rows.map((p) => [p.id, who(p.partnerId)?.name ?? p.partnerId, day(p.periodStart), day(p.periodEnd), p.jobIds.length, p.gross / 100, p.commission / 100, p.net / 100, p.status, p.approvedBy ?? '', p.reference ?? '']),
                ])
              }
            >
              <Download /> CSV
            </Button>
          )}
          {canApprove && picked.length > 0 && (
            <Button variant="success" disabled={busy} onClick={() => void run(() => approvePayouts(picked), `${picked.length} payout${picked.length === 1 ? '' : 's'} approved · ${rupees(pickedTotal)}`, () => setPicked([]))}>
              <BadgeCheck /> Approve {picked.length} · {rupees(pickedTotal)}
            </Button>
          )}
        </div>
        <FormError error={error} />
      </div>
      {t.total === 0 ? (
        <Empty icon={<Wallet />} title={t.filter === 'pending' ? 'Nothing to approve' : 'Nothing here'} body={t.filter === 'pending' ? 'All caught up.' : 'Try another tab or search.'} />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              {canApprove && (
                <th className={cn(th, 'w-10')}>
                  <input
                    type="checkbox"
                    aria-label="Pick every payout to approve on this page"
                    className="size-4 accent-brand"
                    disabled={!pendingVisible.length}
                    checked={allPicked}
                    onChange={(e) => setPicked(e.target.checked ? [...new Set([...picked, ...pendingVisible.map((p) => p.id)])] : picked.filter((id) => !pendingVisible.some((p) => p.id === id)))}
                  />
                </th>
              )}
              <th className={th}>Technician</th>
              <SortTh by="week" label="Week" sort={t.sort} onSort={t.sortBy} />
              <th className={cn(th, 'text-right')}>Gross</th>
              <th className={cn(th, 'text-right')}>Commission</th>
              <SortTh by="net" label="Payout" sort={t.sort} onSort={t.sortBy} className="text-right" />
              <th className={th}>Status</th>
              <th className={cn(th, 'text-right')} />
            </tr>
          </thead>
          <tbody>
            {t.visible.map((p) => {
              const tech = who(p.partnerId)
              const held = tech?.status === 'suspended' && p.status === 'pending'
              const expanded = open === p.id
              return (
                <Fragment key={p.id}>
                  <tr className={tr}>
                    {canApprove && (
                      <td className={td}>
                        {p.status === 'pending' && (
                          <input
                            type="checkbox"
                            aria-label={`Pick ${tech?.name ?? p.partnerId}’s payout`}
                            className="size-4 accent-brand disabled:opacity-40"
                            disabled={held}
                            checked={picked.includes(p.id)}
                            onChange={(e) => setPicked(e.target.checked ? [...picked, p.id] : picked.filter((x) => x !== p.id))}
                          />
                        )}
                      </td>
                    )}
                    <td className={td}>
                      <Link href={`/technicians?id=${p.partnerId}`} className="flex items-center gap-3 hover:text-brand">
                        <Avatar name={tech?.name ?? '?'} size={32} side="technician" />
                        <span>
                          <span className="block font-bold">{tech?.name ?? p.partnerId}</span>
                          <span className="num block text-xs text-muted">{p.id}</span>
                        </span>
                      </Link>
                    </td>
                    <td className={cn(td, 'text-[13px]')}>
                      {day(p.periodStart)} – {day(p.periodEnd)}
                      <span className="block text-xs text-muted">{p.jobIds.length} jobs</span>
                    </td>
                    <td className={cn(td, 'num text-right text-[13px]')}>{rupees(p.gross)}</td>
                    <td className={cn(td, 'num text-right text-[13px] text-muted')}>− {rupees(p.commission)}</td>
                    <td className={cn(td, 'num text-right font-extrabold')}>{rupees(p.net)}</td>
                    <td className={td}>
                      {held ? <Chip tone="danger">On hold · suspended</Chip> : <Chip tone={STATUS[p.status].tone}>{STATUS[p.status].label}</Chip>}
                      {p.reference && <span className="num mt-1 block text-[11px] text-muted">{p.reference}</span>}
                    </td>
                    <td className={cn(td, 'whitespace-nowrap text-right')}>
                      {canApprove && p.status === 'pending' && !held && (
                        <Button size="sm" variant="success" disabled={busy} onClick={() => void run(() => approvePayouts([p.id]), `${rupees(p.net)} approved for ${tech?.name}`)}>
                          Approve
                        </Button>
                      )}
                      {canApprove && p.status === 'approved' && (
                        <Button size="sm" onClick={() => setPaying(p)}>
                          <Landmark /> Mark paid
                        </Button>
                      )}
                      <Button size="sm" variant="subtle" aria-expanded={expanded} aria-label="Show jobs" onClick={() => setOpen(expanded ? null : p.id)}>
                        <ChevronDown className={cn('transition-transform', expanded && 'rotate-180')} />
                      </Button>
                    </td>
                  </tr>
                  {expanded && (
                    <tr>
                      <td colSpan={canApprove ? 8 : 7} className="border-b border-line bg-canvas/50 px-5 py-3">
                        <p className="mb-2 text-xs font-bold text-muted">
                          Jobs in this payout{p.approvedBy ? ` · approved by ${p.approvedBy}` : ''}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {p.jobIds.map((id) => (
                            <Link key={id} href={`/bookings?id=${id}`} className="num rounded-md border border-line bg-card px-2 py-1 text-xs font-semibold hover:border-brand hover:text-brand">
                              {id}
                            </Link>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </TableWrap>
      )}
      <Pager page={t.page} pages={t.pages} total={t.total} onPage={t.setPage} />
      {paying && <PaidModal payout={paying} name={who(paying.partnerId)?.name ?? paying.partnerId} onClose={() => setPaying(null)} />}
    </>
  )
}

function PaidModal({ payout, name, onClose }: { payout: PartnerPayout; name: string; onClose: () => void }) {
  const [ref, setRef] = useState('')
  const { run, busy, error } = useAction()
  return (
    <Modal
      open
      onClose={onClose}
      title={`Mark ${rupees(payout.net)} paid to ${name}?`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={busy} onClick={() => void run(() => markPayoutPaid(payout.id, ref), `Payout to ${name} marked paid`, onClose)}>
            Mark paid
          </Button>
        </>
      }
    >
      <p className="mb-4 text-sm text-muted">Do this after the bank transfer has gone out. The technician sees it as Paid in their app.</p>
      <Field label="Bank reference (UTR)">
        <input value={ref} onChange={(e) => setRef(e.target.value.toUpperCase())} placeholder="e.g. HDFCN52024102012345" className={cn(inputClass, 'num h-10 uppercase')} autoFocus />
      </Field>
      <div className="mt-3">
        <FormError error={error} />
      </div>
    </Modal>
  )
}
