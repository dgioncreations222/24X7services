'use client'

import { useState } from 'react'
import { GalleryHorizontal, Pencil, Plus } from 'lucide-react'
import { HideButton, Reorder, StatusChip, useAction } from '@/components/catalog/parts'
import { BannerModal, BannerPreview } from '@/components/growth/BannerModal'
import { Async, Button, Card, CardHeader, Chip, Empty, Page, PageHeader } from '@/components/ui'
import { moveBanner, setBannerActive, useBanners, useCan, type HomeBanner } from '@/lib/data'
import { cn } from '@/lib/cn'

const SLOTS: { slot: HomeBanner['slot']; title: string; sub: string }[] = [
  { slot: 'hero', title: 'Top carousel', sub: 'Slides under the search bar on Home, in this order.' },
  { slot: 'inline', title: 'Between sections', sub: 'Single cards further down Home.' },
]

/** Home banners in the customer app: what they say, where they sit, in what order and when. */
export default function BannersPage() {
  const banners = useBanners()
  const can = useCan()
  const [editing, setEditing] = useState<HomeBanner | 'new' | null>(null)
  return (
    <Page>
      <PageHeader
        side="customer"
        title="Home banners"
        sub="What customers see at the top of the app. Changes go live as soon as you save."
        actions={
          can('content', 'create') && (
            <Button onClick={() => setEditing('new')}>
              <Plus /> New banner
            </Button>
          )
        }
      />
      <Async query={banners} empty={<Empty icon={<GalleryHorizontal />} title="No banners yet" />}>
        {(all) => (
          <div className="space-y-5">
            {SLOTS.map((s) => (
              <Slot key={s.slot} {...s} rows={all.filter((b) => b.slot === s.slot)} onEdit={setEditing} />
            ))}
          </div>
        )}
      </Async>
      {editing && <BannerModal banner={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </Page>
  )
}

function Slot({ title, sub, rows, onEdit }: { title: string; sub: string; rows: HomeBanner[]; onEdit: (b: HomeBanner) => void }) {
  const can = useCan()
  const editable = can('content', 'edit')
  const { run, busy } = useAction()
  const [now] = useState(() => Date.now())
  return (
    <Card className="overflow-hidden">
      <CardHeader title={title} sub={sub} action={<span className="num text-sm font-bold text-muted">{rows.filter((b) => b.active).length} live</span>} />
      {rows.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">Nothing here.</p>
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((b, i) => {
            const ended = b.validTill !== undefined && b.validTill < now
            const early = b.validFrom !== undefined && b.validFrom > now
            return (
              <li key={b.id} className={cn('flex flex-col gap-3 p-4 sm:flex-row sm:items-center', !b.active && 'opacity-60')}>
                {editable && <Reorder label={b.title} first={i === 0} last={i === rows.length - 1} disabled={busy} onMove={(dir) => void run(() => moveBanner(b.id, dir))} />}
                <BannerPreview b={b} className="w-full sm:w-72" />
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-bold">{b.title}</p>
                  <p className="text-xs text-muted">
                    {b.ctaHref ? `Opens ${b.ctaHref}` : 'No link'}
                    {b.validTill && ` · until ${new Date(b.validTill).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                  </p>
                  <div className="mt-1.5 flex gap-1.5">
                    <StatusChip active={b.active} />
                    {ended && <Chip tone="neutral">Ended</Chip>}
                    {early && <Chip tone="info">Scheduled</Chip>}
                  </div>
                </div>
                {editable && (
                  <span className="inline-flex gap-1">
                    <Button size="sm" variant="subtle" onClick={() => onEdit(b)}>
                      <Pencil /> Edit
                    </Button>
                    <HideButton active={b.active} disabled={busy} onToggle={() => void run(() => setBannerActive(b.id, !b.active), b.active ? 'Banner hidden' : 'Banner is live')} />
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
