'use client'

import { useState } from 'react'
import { FormError, useAction } from '@/components/catalog/parts'
import { useToast } from '@/components/toast'
import { textareaClass } from '@/components/catalog/fields'
import { Button, Field, Modal } from '@/components/ui'

/**
 * Asks for the reason behind a decision the technician will read — a
 * rejection or a suspension — with a few ready answers to start from.
 */
export function ReasonModal({
  title,
  body,
  confirm,
  suggestions,
  onSubmit,
  onClose,
  done,
}: {
  title: string
  body: string
  confirm: string
  suggestions: string[]
  onSubmit: (reason: string) => Promise<unknown>
  onClose: () => void
  /** The toast; a function gets what onSubmit resolved with. */
  done: string | ((result: unknown) => string)
}) {
  const [reason, setReason] = useState('')
  const { run, busy, error } = useAction()
  const toast = useToast()
  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" disabled={busy || !reason.trim()} onClick={() => {
              let result: unknown
              void run(
                async () => {
                  result = await onSubmit(reason)
                },
                undefined,
                () => {
                  toast(typeof done === 'string' ? done : done(result))
                  onClose()
                }
              )
            }}>
            {busy ? 'Saving…' : confirm}
          </Button>
        </>
      }
    >
      <p className="text-sm text-muted">{body}</p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {suggestions.map((s) => (
          <button key={s} type="button" onClick={() => setReason(s)} className="rounded-full border border-line-strong px-2.5 py-1 text-xs font-semibold text-ink-2 hover:bg-canvas">
            {s}
          </button>
        ))}
      </div>
      <Field label="Reason the technician will see" className="mt-4">
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} className={textareaClass} autoFocus />
      </Field>
      <div className="mt-3">
        <FormError error={error} />
      </div>
    </Modal>
  )
}
