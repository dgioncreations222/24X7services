'use client'

import { useState } from 'react'
import { PriceInput, textareaClass } from '@/components/catalog/fields'
import { FormError, useAction } from '@/components/catalog/parts'
import { Button, Field, Modal } from '@/components/ui'
import { bill, refundBooking, type AdminBooking } from '@/lib/data'
import { rupees } from './status'

/** How much to give back, and why. Defaults to everything still refundable. */
export function RefundModal({ booking: b, onClose }: { booking: AdminBooking; onClose: () => void }) {
  const { refundable } = bill(b)
  const [amount, setAmount] = useState(refundable)
  const [reason, setReason] = useState(b.status === 'cancelled' ? 'Cancelled before the visit, full refund.' : '')
  const { run, busy, error } = useAction()
  return (
    <Modal
      open
      onClose={onClose}
      title={`Refund ${b.displayId}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={busy} onClick={() => void run(() => refundBooking(b.id, amount, reason), `${rupees(amount)} refunded to ${b.customer.name}`, onClose)}>
            {busy ? 'Refunding…' : `Refund ${rupees(amount)}`}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-muted">
          Goes back the way they paid, in 5–7 working days. Up to <span className="num font-bold text-ink">{rupees(refundable)}</span> can be refunded.
        </p>
        <Field label="Amount">
          <PriceInput label="Refund in rupees" value={amount} onChange={setAmount} />
        </Field>
        <Field label="Reason" hint="Shown on the customer’s receipt.">
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} className={textareaClass} />
        </Field>
        <FormError error={error} />
      </div>
    </Modal>
  )
}
