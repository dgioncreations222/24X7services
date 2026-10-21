'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Eye, EyeOff, MessageSquareReply, Star } from 'lucide-react'
import { textareaClass } from '@/components/catalog/fields'
import { FormError, SortTh, useAction } from '@/components/catalog/parts'
import { useTable } from '@/components/catalog/useTable'
import { ReasonModal } from '@/components/technicians/ReasonModal'
import { Async, Button, Card, Chip, Empty, Field, Modal, Page, PageHeader, Pager, SearchInput, Select, Tabs } from '@/components/ui'
import { hideReview, publishReview, replyToReview, useAdminReviews, useCan, usePartners, type AdminReview } from '@/lib/data'
import { cn } from '@/lib/cn'
import { longDate } from '@/lib/format'

const HIDE_REASONS = ['Abusive or offensive language.', 'Shares a phone number or personal details.', 'About a different service, not this booking.', 'Spam or advertising.']

/** What customers wrote about their jobs: read the flagged ones, hide what breaks the rules, reply where it helps. */
export default function ReviewsPage() {
  const reviews = useAdminReviews()
  return (
    <Page>
      <PageHeader side="customer" title="Reviews & ratings" sub="Low ratings are flagged for a look. Hiding a review takes it off the app; it still counts in the technician’s rating." />
      <Card className="overflow-hidden">
        <Async query={reviews} empty={<Empty icon={<Star />} title="No reviews yet" />}>
          {(rows) => <ReviewList rows={rows} />}
        </Async>
      </Card>
    </Page>
  )
}

function ReviewList({ rows: all }: { rows: AdminReview[] }) {
  const can = useCan()
  const partners = usePartners()
  const [stars, setStars] = useState('all')
  const [hiding, setHiding] = useState<AdminReview | null>(null)
  const [replying, setReplying] = useState<AdminReview | null>(null)
  const { run, busy } = useAction()
  const tech = (id: string) => partners.data?.find((p) => p.id === id)?.name ?? id
  const rows = stars === 'all' ? all : all.filter((r) => (stars === 'low' ? r.rating <= 2 : r.rating === Number(stars)))
  const t = useTable({
    rows,
    search: (r) => [r.text, r.customerName, r.displayId, tech(r.technicianId)],
    filters: { flagged: (r: AdminReview) => r.status === 'flagged', published: (r: AdminReview) => r.status === 'published', hidden: (r: AdminReview) => r.status === 'hidden', all: () => true },
    sorts: { newest: (r: AdminReview) => -r.at, rating: (r: AdminReview) => r.rating },
    initialSort: 'newest',
  })
  const editable = can('reviews', 'edit')
  return (
    <>
      <div className="flex flex-col gap-3 border-b border-line p-4">
        <Tabs
          value={t.filter}
          onChange={t.setFilter}
          options={[
            { value: 'flagged', label: 'Flagged', count: rows.filter((r) => r.status === 'flagged').length, alert: true },
            { value: 'published', label: 'Published', count: rows.filter((r) => r.status === 'published').length },
            { value: 'hidden', label: 'Hidden', count: rows.filter((r) => r.status === 'hidden').length },
            { value: 'all', label: 'All', count: rows.length },
          ]}
          className="border-b-0"
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <SearchInput value={t.q} onChange={t.setQ} placeholder="Words in the review, customer, booking or technician" className="flex-1" />
          <Select
            label="Stars"
            value={stars}
            onChange={setStars}
            options={[{ value: 'all', label: 'Any rating' }, { value: 'low', label: '1–2 stars' }, ...[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} star${n > 1 ? 's' : ''}` }))]}
          />
        </div>
      </div>
      <div className="flex justify-end gap-4 border-b border-line px-5 py-2 text-xs">
        <table>
          <thead>
            <tr>
              <SortTh by="newest" label="Newest" sort={t.sort} onSort={t.sortBy} className="border-0 bg-transparent px-0" />
              <SortTh by="rating" label="Lowest rating" sort={t.sort} onSort={t.sortBy} className="border-0 bg-transparent pl-4 pr-0" />
            </tr>
          </thead>
        </table>
      </div>
      {t.total === 0 ? (
        <Empty icon={<Star />} title={t.filter === 'flagged' ? 'Nothing flagged' : 'No reviews match'} body={t.filter === 'flagged' ? 'All caught up.' : 'Try another search or filter.'} />
      ) : (
        <ul className="divide-y divide-line">
          {t.visible.map((r) => (
            <li key={r.id} className={cn('flex flex-col gap-3 px-5 py-4 sm:flex-row', r.status === 'hidden' && 'opacity-70')}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className={cn('num inline-flex items-center gap-0.5 font-extrabold', r.rating <= 2 ? 'text-danger' : 'text-warning')} aria-label={`${r.rating} out of 5`}>
                    {r.rating}
                    <Star className="size-3.5 fill-current" aria-hidden />
                  </span>
                  <span className="font-bold">{r.customerName}</span>
                  <span className="text-muted">
                    on{' '}
                    <Link href={`/bookings?id=${r.bookingId}`} className="num font-semibold hover:text-brand">
                      {r.displayId}
                    </Link>{' '}
                    ·{' '}
                    <Link href={`/technicians?id=${r.technicianId}`} className="hover:text-brand">
                      {tech(r.technicianId)}
                    </Link>{' '}
                    · {longDate(new Date(r.at).toISOString())}
                  </span>
                  {r.status !== 'published' && <Chip tone={r.status === 'flagged' ? 'warning' : 'neutral'}>{r.status === 'flagged' ? 'Flagged' : 'Hidden'}</Chip>}
                </div>
                <p className={cn('mt-1.5 text-[15px]', !r.text && 'italic text-muted')}>{r.text || 'No comment, just a rating.'}</p>
                {r.hiddenReason && r.status === 'hidden' && <p className="mt-1 text-xs font-semibold text-muted">Hidden: {r.hiddenReason}</p>}
                {r.reply && (
                  <p className="mt-2 rounded-lg border-l-4 border-brand bg-brand-soft/50 px-3 py-2 text-sm">
                    <span className="font-bold">Our reply: </span>
                    {r.reply}
                  </p>
                )}
              </div>
              {editable && (
                <div className="flex shrink-0 gap-1 sm:flex-col sm:items-end">
                  {r.status === 'hidden' ? (
                    <Button size="sm" variant="subtle" disabled={busy} onClick={() => void run(() => publishReview(r.id), 'Review published')}>
                      <Eye /> Publish
                    </Button>
                  ) : (
                    <>
                      {r.status === 'flagged' && (
                        <Button size="sm" variant="success" disabled={busy} onClick={() => void run(() => publishReview(r.id), 'Review kept and published')}>
                          <Eye /> Keep
                        </Button>
                      )}
                      <Button size="sm" variant="subtle" onClick={() => setHiding(r)}>
                        <EyeOff /> Hide
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="subtle" onClick={() => setReplying(r)}>
                    <MessageSquareReply /> {r.reply ? 'Edit reply' : 'Reply'}
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <Pager page={t.page} pages={t.pages} total={t.total} onPage={t.setPage} />
      {hiding && (
        <ReasonModal
          title="Hide this review?"
          body="It comes off the customer app but still counts in the technician’s rating. The reason is for admins only."
          confirm="Hide review"
          suggestions={HIDE_REASONS}
          onSubmit={(reason) => hideReview(hiding.id, reason)}
          done="Review hidden"
          onClose={() => setHiding(null)}
        />
      )}
      {replying && <ReplyModal review={replying} onClose={() => setReplying(null)} />}
    </>
  )
}

function ReplyModal({ review, onClose }: { review: AdminReview; onClose: () => void }) {
  const [text, setText] = useState(review.reply ?? '')
  const { run, busy, error } = useAction()
  return (
    <Modal
      open
      onClose={onClose}
      title="Public reply"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={busy} onClick={() => void run(() => replyToReview(review.id, text), text.trim() ? 'Reply posted' : 'Reply removed', onClose)}>
            {text.trim() ? 'Post reply' : 'Remove reply'}
          </Button>
        </>
      }
    >
      <p className="mb-3 text-sm text-muted">Everyone reading the review sees this, signed as the company. Leave it empty to remove the reply.</p>
      <Field label="Reply">
        <textarea value={text} onChange={(e) => setText(e.target.value)} className={textareaClass} maxLength={500} autoFocus />
      </Field>
      <div className="mt-3">
        <FormError error={error} />
      </div>
    </Modal>
  )
}
