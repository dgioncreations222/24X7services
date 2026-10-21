'use client'

import { useState } from 'react'
import { Download, FileClock } from 'lucide-react'
import { useTable } from '@/components/catalog/useTable'
import { when } from '@/components/support/labels'
import { Async, Button, Card, Empty, Page, PageHeader, Pager, SearchInput, Select, TableWrap, td, th, tr } from '@/components/ui'
import { useAuditLog, useCan, type AuditEntry } from '@/lib/data'
import { cn } from '@/lib/cn'
import { downloadCsv } from '@/lib/format'

const DAY = 86_400_000
const RANGES = { all: 'Any time', '1': 'Today', '7': 'Last 7 days', '30': 'Last 30 days' } as const
type Range = keyof typeof RANGES

/** Every accountable change in the console — read-only, newest first. */
export default function AuditPage() {
  const log = useAuditLog()
  return (
    <Page>
      <PageHeader title="Audit log" sub="Who changed what, and when. Entries can’t be edited or deleted." />
      <Card className="overflow-hidden">
        <Async query={log} empty={<Empty icon={<FileClock />} title="Nothing logged yet" />}>
          {(rows) => <AuditTable rows={rows} />}
        </Async>
      </Card>
    </Page>
  )
}

function AuditTable({ rows: all }: { rows: AuditEntry[] }) {
  const can = useCan()
  const [now] = useState(() => Date.now())
  const [module, setModule] = useState('all')
  const [admin, setAdmin] = useState('all')
  const [range, setRange] = useState<Range>('all')
  const modules = [...new Set(all.map((e) => e.module))].sort()
  const admins = [...new Set(all.map((e) => e.admin))].sort()
  const rows = all.filter((e) => (module === 'all' || e.module === module) && (admin === 'all' || e.admin === admin) && (range === 'all' || e.at >= now - Number(range) * DAY))
  const t = useTable({
    rows,
    search: (e) => [e.action, e.target, e.old, e.new, e.admin],
    filters: { all: () => true },
    sorts: { newest: (e: AuditEntry) => -e.at },
    initialSort: 'newest',
    pageSize: 25,
  })
  return (
    <>
      <div className="flex flex-col gap-2 border-b border-line p-4 lg:flex-row">
        <SearchInput value={t.q} onChange={t.setQ} placeholder="Action, record or value" className="flex-1" />
        <div className="flex flex-wrap gap-2">
          <Select label="Module" value={module} onChange={setModule} options={[{ value: 'all', label: 'Every module' }, ...modules.map((m) => ({ value: m, label: m }))]} />
          <Select label="Admin" value={admin} onChange={setAdmin} options={[{ value: 'all', label: 'Every admin' }, ...admins.map((a) => ({ value: a, label: a }))]} />
          <Select label="When" value={range} onChange={setRange} options={(Object.keys(RANGES) as Range[]).map((k) => ({ value: k, label: RANGES[k] }))} />
          {can('audit', 'export') && (
            <Button
              variant="secondary"
              onClick={() => downloadCsv('audit-log', [['When', 'Admin', 'Role', 'Module', 'Action', 'Record', 'Before', 'After'], ...rows.map((e) => [new Date(e.at).toISOString(), e.admin, e.role, e.module, e.action, e.target ?? '', e.old ?? '', e.new ?? ''])])}
            >
              <Download /> CSV
            </Button>
          )}
        </div>
      </div>
      {t.total === 0 ? (
        <Empty icon={<FileClock />} title="Nothing matches" body="Try another filter." />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <th className={th}>When</th>
              <th className={th}>Admin</th>
              <th className={th}>Action</th>
              <th className={th}>Change</th>
            </tr>
          </thead>
          <tbody>
            {t.visible.map((e) => (
              <tr key={e.id} className={tr}>
                <td className={cn(td, 'text-[13px]')}>{when(e.at)}</td>
                <td className={td}>
                  <span className="block text-[13px] font-bold">{e.admin}</span>
                  <span className="block text-xs text-muted">{e.role}</span>
                </td>
                <td className={td}>
                  <span className="block text-[13px] font-semibold">{e.action}</span>
                  <span className="block text-xs text-muted">
                    {e.module}
                    {e.target && ` · ${e.target}`}
                  </span>
                </td>
                <td className={cn(td, 'max-w-sm text-[13px]')}>
                  {e.old && <span className="text-muted line-through">{e.old}</span>}
                  {e.old && e.new && <span className="text-faint"> → </span>}
                  {e.new && <span className="font-semibold">{e.new}</span>}
                  {!e.old && !e.new && <span className="text-faint">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
      <Pager page={t.page} pages={t.pages} total={t.total} onPage={t.setPage} />
    </>
  )
}
