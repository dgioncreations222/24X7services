'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button, Drawer, Field, Select, inputClass } from '@/components/ui'
import { saveService, type Category, type Service } from '@/lib/data'
import { cn } from '@/lib/cn'
import { ImageField, ListEditor, PriceInput, textareaClass } from './fields'
import { FormError, useAction } from './parts'

/** Add or edit one service: what it is, its price and time, what it covers, pictures and FAQs. */
export function ServiceEditor({ service, categories, defaultCategory, onClose }: { service: Service | null; categories: Category[]; defaultCategory?: string; onClose: () => void }) {
  const [form, setForm] = useState({
    categoryId: service?.categoryId ?? defaultCategory ?? categories[0]?.id ?? '',
    name: service?.name ?? '',
    description: service?.description ?? '',
    price: service?.price ?? 0,
    durationMinutes: service?.durationMinutes ?? 60,
    included: service?.included ?? [''],
    excluded: service?.excluded ?? [],
    images: service?.images ?? [],
    faqs: service?.faqs ?? [],
  })
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }))
  const { run, busy, error } = useAction()
  const save = () => void run(() => saveService({ ...form, id: service?.id }), service ? 'Service saved' : 'Service added', onClose)

  return (
    <Drawer
      open
      onClose={onClose}
      title={service ? service.name : 'Add service'}
      sub={service ? 'Changes show in the customer app as soon as you save.' : 'It goes live as soon as you save. Hide it until it is ready.'}
      footer={
        <>
          <FormError error={error} />
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={busy} onClick={save}>
            {busy ? 'Saving…' : 'Save service'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category">
            <Select full label="Category" value={form.categoryId} onChange={(v) => set('categoryId', v)} options={categories.map((c) => ({ value: c.id, label: c.name }))} />
          </Field>
          <Field label="Name">
            <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. AC deep cleaning" className={cn(inputClass, 'h-10')} />
          </Field>
          <Field label="Price">
            <PriceInput label="Price in rupees" value={form.price} onChange={(v) => set('price', v)} />
          </Field>
          <Field label="Usual time" hint="Typical time on site, not a promise.">
            <div className="relative">
              <input
                inputMode="numeric"
                value={form.durationMinutes || ''}
                onChange={(e) => set('durationMinutes', Number(e.target.value.replace(/\D/g, '')))}
                className={cn(inputClass, 'num h-10 pr-12')}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted">min</span>
            </div>
          </Field>
        </div>
        <Field label="Description">
          <textarea value={form.description} onChange={(e) => set('description', e.target.value)} className={textareaClass} />
        </Field>
        <Field label="What’s included">
          <ListEditor label="Included" items={form.included} onChange={(v) => set('included', v)} placeholder="e.g. Filter and coil cleaning" />
        </Field>
        <Field label="Not included">
          <ListEditor label="Not included" items={form.excluded} onChange={(v) => set('excluded', v)} placeholder="e.g. Spare parts" />
        </Field>
        <Field label="Images" hint="The first one is the cover.">
          <div className="space-y-3">
            {form.images.map((img, i) => (
              <ImageField key={i} label={`Image ${i + 1}`} value={img} onChange={(v) => set('images', v ? form.images.map((x, j) => (j === i ? v : x)) : form.images.filter((_, j) => j !== i))} />
            ))}
            <Button variant="ghost" size="sm" onClick={() => set('images', [...form.images, ''])}>
              <Plus /> Add image
            </Button>
          </div>
        </Field>
        <Field label="FAQs">
          <div className="space-y-3">
            {form.faqs.map((f, i) => (
              <div key={i} className="space-y-2 rounded-lg border border-line p-3">
                <div className="flex gap-2">
                  <input
                    aria-label={`Question ${i + 1}`}
                    value={f.q}
                    placeholder="Question"
                    onChange={(e) => set('faqs', form.faqs.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)))}
                    className={cn(inputClass, 'h-9 font-semibold')}
                  />
                  <Button variant="subtle" aria-label={`Remove FAQ ${i + 1}`} onClick={() => set('faqs', form.faqs.filter((_, j) => j !== i))} className="px-2.5">
                    <Trash2 />
                  </Button>
                </div>
                <textarea
                  aria-label={`Answer ${i + 1}`}
                  value={f.a}
                  placeholder="Answer"
                  onChange={(e) => set('faqs', form.faqs.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))}
                  className={textareaClass}
                />
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={() => set('faqs', [...form.faqs, { q: '', a: '' }])}>
              <Plus /> Add FAQ
            </Button>
          </div>
        </Field>
      </div>
    </Drawer>
  )
}
