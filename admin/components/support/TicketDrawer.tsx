'use client'

import Link from 'next/link'
import type { Route } from 'next'
import { useState } from 'react'
import { CheckCircle2, RotateCcw, SearchX, Send } from 'lucide-react'
import { textareaClass } from '@/components/catalog/fields'
import { FormError, useAction } from '@/components/catalog/parts'
import { Async, Button, Chip, Drawer, Empty, Field, Select, SideTag, SkeletonRows } from '@/components/ui'
import { assignTicket, replyToTicket, setTicketPriority, setTicketStatus, useAdmins, useCan, useTicket, type SupportTicket, type TicketPriority } from '@/lib/data'
import { cn } from '@/lib/cn'
import { PRIORITY, STATUS, when } from './labels'

/** One conversation: messages, reply, who has it, how urgent it is, and resolve / reopen. */
export function TicketDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const query = useTicket(id)
  if (!id) return null
  return (
    <Async
      query={query}
      loading={
        <Drawer open onClose={onClose} title="Loading…">
          <SkeletonRows rows={3} />
        </Drawer>
      }
      isEmpty={(t) => t === null}
      empty={
        <Drawer open onClose={onClose} title="Ticket not found">
          <Empty icon={<SearchX />} title="Not found" />
        </Drawer>
      }
    >
      {(t) => t && <Body ticket={t} onClose={onClose} />}
    </Async>
  )
}

function Body({ ticket: t, onClose }: { ticket: SupportTicket; onClose: () => void }) {
  const can = useCan()
  const admins = useAdmins()
  const [text, setText] = useState('')
  const { run, busy, error } = useAction()
  const editable = can('support', 'edit')
  const closed = t.status === 'resolved'
  const personHref = (t.side === 'customer' ? `/customers?id=${t.personId}` : `/technicians?id=${t.personId}`) as Route
  return (
    <Drawer
      open
      onClose={onClose}
      width="max-w-2xl"
      title={t.subject}
      sub={
        <span className="flex flex-wrap items-center gap-2 pt-1">
          <span className="num">{t.id}</span>
          <Chip tone={STATUS[t.status].tone}>{STATUS[t.status].label}</Chip>
          <Chip tone={PRIORITY[t.priority].tone} dot={false}>
            {PRIORITY[t.priority].label}
          </Chip>
          <span>{t.category}</span>
        </span>
      }
      footer={
        editable && (
          <>
            {closed ? (
              <Button variant="secondary" size="sm" className="mr-auto" disabled={busy} onClick={() => void run(() => setTicketStatus(t.id, 'open'), 'Ticket reopened')}>
                <RotateCcw /> Reopen
              </Button>
            ) : (
              <Button variant="success" size="sm" className="mr-auto" disabled={busy} onClick={() => void run(() => setTicketStatus(t.id, 'resolved'), 'Ticket resolved')}>
                <CheckCircle2 /> Resolve
              </Button>
            )}
            {!closed && (
              <Button size="sm" disabled={busy || !text.trim()} onClick={() => void run(() => replyToTicket(t.id, text), 'Reply sent', () => setText(''))}>
                <Send /> Send reply
              </Button>
            )}
          </>
        )
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <SideTag side={t.side} />
        <Link href={personHref} className="font-bold hover:text-brand">
          {t.personName}
        </Link>
        {t.bookingId && (
          <Link href={`/bookings?id=${t.bookingId}`} className="num text-muted hover:text-brand">
            Booking {t.bookingId}
          </Link>
        )}
      </div>
      {editable && (
        <div className="mb-5 grid gap-3 sm:grid-cols-2">
          <Field label="Assigned to">
            <Select
              full
              label="Assigned to"
              value={t.assignee ?? ''}
              onChange={(v) => v && void run(() => assignTicket(t.id, v), `Assigned to ${v}`)}
              options={[{ value: '', label: 'Nobody yet' }, ...(admins.data ?? []).filter((a) => a.status === 'active').map((a) => ({ value: a.name, label: `${a.name} · ${a.role}` }))]}
            />
          </Field>
          <Field label="Priority">
            <Select
              full
              label="Priority"
              value={t.priority}
              onChange={(v: TicketPriority) => void run(() => setTicketPriority(t.id, v), 'Priority changed')}
              options={(Object.keys(PRIORITY) as TicketPriority[]).map((p) => ({ value: p, label: PRIORITY[p].label }))}
            />
          </Field>
        </div>
      )}
      <ol className="space-y-3">
        {t.messages.map((m, i) =>
          m.from === 'system' ? (
            <li key={i} className="text-center text-xs font-semibold text-faint">
              {m.text} · {when(m.at)}
            </li>
          ) : (
            <li key={i} className={cn('flex', m.from === 'agent' && 'justify-end')}>
              <div className={cn('max-w-[85%] rounded-2xl px-4 py-2.5 text-sm', m.from === 'agent' ? 'rounded-br-md bg-brand text-white' : 'rounded-bl-md bg-canvas')}>
                <p className="whitespace-pre-wrap">{m.text}</p>
                <p className={cn('mt-1 text-[11px]', m.from === 'agent' ? 'text-white/70' : 'text-muted')}>
                  {m.from === 'agent' ? m.by ?? 'Support' : t.personName} · {when(m.at)}
                </p>
              </div>
            </li>
          )
        )}
      </ol>
      {editable && !closed && (
        <Field label="Reply" className="mt-5">
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={`Write to ${t.personName.split(' ')[0]}…`} className={textareaClass} />
        </Field>
      )}
      <div className="mt-3">
        <FormError error={error} />
      </div>
    </Drawer>
  )
}
