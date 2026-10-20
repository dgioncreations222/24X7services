'use client'

import { useState } from 'react'
import { Button, Field, Modal, Segmented, Toggle, inputClass } from '@/components/ui'
import { saveQuestion, type Question, type QuestionKind } from '@/lib/data'
import { cn } from '@/lib/cn'
import { ListEditor } from './fields'
import { FormError, useAction } from './parts'
import { QuestionPreview } from './QuestionPreview'

const KINDS: { value: QuestionKind; label: string }[] = [
  { value: 'options', label: 'Options' },
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'photo', label: 'Photo' },
]

/** Add or edit one question, with the customer's view of it underneath. */
export function QuestionEditor({ serviceId, question, onClose }: { serviceId: string; question: Question | null; onClose: () => void }) {
  const [q, setQ] = useState({
    label: question?.label ?? '',
    kind: question?.kind ?? ('options' as QuestionKind),
    options: question?.options.length ? question.options : ['', ''],
    multiple: question?.multiple ?? false,
    unit: question?.unit ?? '',
    help: question?.help ?? '',
    required: question?.required ?? true,
  })
  const set = <K extends keyof typeof q>(k: K, v: (typeof q)[K]) => setQ((s) => ({ ...s, [k]: v }))
  const { run, busy, error } = useAction()
  const save = () => void run(() => saveQuestion({ ...q, serviceId, id: question?.id }), question ? 'Question saved' : 'Question added', onClose)

  return (
    <Modal
      open
      onClose={onClose}
      title={question ? 'Edit question' : 'Add question'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={busy} onClick={save}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Question">
          <input value={q.label} onChange={(e) => set('label', e.target.value)} placeholder="e.g. Front load or top load?" className={cn(inputClass, 'h-10')} autoFocus />
        </Field>
        <Field label="Answer type">
          <Segmented value={q.kind} onChange={(v) => set('kind', v)} options={KINDS} className="w-full [&>button]:flex-1" />
        </Field>
        {q.kind === 'options' && (
          <>
            <Field label="Options">
              <ListEditor label="Option" items={q.options} onChange={(v) => set('options', v)} placeholder="e.g. Front load" />
            </Field>
            <label className="flex items-center justify-between gap-3 text-sm font-semibold">
              Customer can pick more than one
              <Toggle checked={q.multiple} onChange={(v) => set('multiple', v)} label="Allow several answers" />
            </label>
          </>
        )}
        {q.kind === 'number' && (
          <Field label="Unit" hint="Optional — litres, ton, kg.">
            <input value={q.unit} onChange={(e) => set('unit', e.target.value)} className={cn(inputClass, 'h-10 w-40')} />
          </Field>
        )}
        <Field label="Help text" hint="Optional, one short line under the question.">
          <input value={q.help} onChange={(e) => set('help', e.target.value)} className={cn(inputClass, 'h-10')} />
        </Field>
        <label className="flex items-center justify-between gap-3 text-sm font-semibold">
          Required to book
          <Toggle checked={q.required} onChange={(v) => set('required', v)} label="Required" />
        </label>
        <div className="rounded-xl border border-line bg-canvas p-4">
          <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.1em] text-faint">Preview</p>
          <QuestionPreview q={q} />
        </div>
        <FormError error={error} />
      </div>
    </Modal>
  )
}
