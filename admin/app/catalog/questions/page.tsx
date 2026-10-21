'use client'

import type { Route } from 'next'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { ListPlus, MessageCircleQuestion, Pencil, Smartphone, Trash2 } from 'lucide-react'
import { CatalogHeader, Reorder, useAction } from '@/components/catalog/parts'
import { QuestionEditor } from '@/components/catalog/QuestionEditor'
import { QuestionPreview } from '@/components/catalog/QuestionPreview'
import { Async, Button, Card, CardHeader, Chip, Empty, Modal, Page, Select } from '@/components/ui'
import { deleteQuestion, moveQuestion, useCan, useCategories, useQuestions, useServices, type Category, type Question, type Service } from '@/lib/data'

const KIND_LABEL: Record<Question['kind'], string> = { options: 'Options', text: 'Text', number: 'Number', photo: 'Photo' }

export default function QuestionsPage() {
  return (
    <Suspense>
      <Questions />
    </Suspense>
  )
}

/** The booking form for one service: what the customer is asked, in order, with a live preview. */
function Questions() {
  const categories = useCategories()
  const services = useServices()
  return (
    <Page>
      <CatalogHeader sub="What a booking asks the customer, per service. Technicians see the answers on the job." />
      <Async query={categories}>{(cats) => <Async query={services}>{(svcs) => <Builder categories={cats} services={svcs} />}</Async>}</Async>
    </Page>
  )
}

function Builder({ categories, services }: { categories: Category[]; services: Service[] }) {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const serviceId = services.some((s) => s.id === params.get('service')) ? params.get('service')! : services[0]?.id
  const service = services.find((s) => s.id === serviceId)
  const can = useCan()
  const editable = can('catalog', 'edit')
  const questions = useQuestions(serviceId)
  const [editing, setEditing] = useState<Question | 'new' | null>(null)
  const [removing, setRemoving] = useState<Question | null>(null)
  const { run, busy } = useAction()

  if (!service) return <Empty icon={<MessageCircleQuestion />} title="Add a service first" body="Questions belong to a service." />
  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? ''

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
      <Card className="overflow-hidden">
        <CardHeader
          title={service.name}
          sub={`${catName(service.categoryId)}${service.active ? '' : ' · hidden from customers'}`}
          action={
            <>
              <Select
                label="Service"
                value={service.id}
                onChange={(id) => router.replace(`${pathname}?service=${id}` as Route, { scroll: false })}
                options={services.map((s) => ({ value: s.id, label: s.name }))}
                className="max-w-64"
              />
              {editable && (
                <Button onClick={() => setEditing('new')}>
                  <ListPlus /> Add question
                </Button>
              )}
            </>
          }
          className="flex-wrap"
        />
        <Async query={questions} empty={<Empty icon={<MessageCircleQuestion />} title="No questions yet" body="Without questions the booking asks nothing — add the brand at least." />}>
          {(list) => (
            <ol className="divide-y divide-line">
              {list.map((q, i) => (
                <li key={q.id} className="flex items-start gap-3 px-4 py-3.5">
                  {editable && <Reorder label={q.label} first={i === 0} last={i === list.length - 1} disabled={busy} onMove={(dir) => void run(() => moveQuestion(q.id, dir))} />}
                  <span className="num mt-1 w-5 shrink-0 text-sm font-bold text-faint">{i + 1}.</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{q.label}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Chip tone="brand" dot={false}>
                        {KIND_LABEL[q.kind]}
                        {q.kind === 'options' && ` · ${q.options.length}${q.multiple ? ', pick any' : ''}`}
                        {q.kind === 'number' && q.unit ? ` · ${q.unit}` : ''}
                      </Chip>
                      <Chip tone={q.required ? 'warning' : 'neutral'} dot={false}>
                        {q.required ? 'Required' : 'Optional'}
                      </Chip>
                    </div>
                  </div>
                  {editable && (
                    <span className="flex shrink-0 gap-1">
                      <Button size="sm" variant="subtle" onClick={() => setEditing(q)} aria-label={`Edit ${q.label}`}>
                        <Pencil />
                      </Button>
                      <Button size="sm" variant="subtle" onClick={() => setRemoving(q)} aria-label={`Delete ${q.label}`} className="text-danger hover:bg-danger-soft">
                        <Trash2 />
                      </Button>
                    </span>
                  )}
                </li>
              ))}
            </ol>
          )}
        </Async>
      </Card>

      <Card className="h-fit overflow-hidden xl:sticky xl:top-20">
        <CardHeader title="Customer preview" sub="How the booking asks it, in this order." action={<Smartphone className="size-4 text-faint" aria-hidden />} />
        <div className="space-y-6 bg-canvas/50 p-5">
          {questions.data?.length ? questions.data.map((q) => <QuestionPreview key={q.id} q={q} />) : <p className="text-sm text-muted">Nothing to preview yet.</p>}
        </div>
      </Card>

      {editing && <QuestionEditor serviceId={service.id} question={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      <Modal
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title="Delete this question?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRemoving(null)}>
              Cancel
            </Button>
            <Button variant="danger" disabled={busy} onClick={() => removing && void run(() => deleteQuestion(removing.id), 'Question deleted', () => setRemoving(null))}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          “{removing?.label}” stops being asked on new bookings. Answers on earlier bookings stay as they are.
        </p>
      </Modal>
    </div>
  )
}
