'use client'

import { useState } from 'react'
import { ImageField } from '@/components/catalog/fields'
import { FormError, useAction } from '@/components/catalog/parts'
import { Button, Field, Modal, Segmented, inputClass } from '@/components/ui'
import { saveBanner, type HomeBanner } from '@/lib/data'
import { cn } from '@/lib/cn'
import { fromDay, toDay } from './CouponModal'

export const TONE_BG: Record<HomeBanner['tone'], string> = {
  blue: 'bg-brand',
  teal: 'bg-info',
  amber: 'bg-warning',
  green: 'bg-success',
  violet: 'bg-violet',
}

/** The banner roughly as a phone shows it: headline and button on its tone, picture on the right. */
export function BannerPreview({ b, className }: { b: Pick<HomeBanner, 'title' | 'subtitle' | 'image' | 'ctaLabel' | 'tone'>; className?: string }) {
  return (
    <div className={cn('relative flex h-28 items-center overflow-hidden rounded-xl p-4 text-white', TONE_BG[b.tone], className)}>
      <div className="relative z-10 max-w-[62%]">
        <p className="line-clamp-2 text-[15px] font-extrabold leading-tight">{b.title || 'Headline'}</p>
        {b.subtitle && <p className="mt-0.5 line-clamp-1 text-xs text-white/80">{b.subtitle}</p>}
        {b.ctaLabel && <span className="mt-2 inline-block rounded-md bg-white px-2 py-1 text-[11px] font-bold text-ink">{b.ctaLabel}</span>}
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element -- static export */}
      {b.image && <img src={b.image} alt="" className="absolute inset-y-0 right-0 h-full w-2/5 object-cover" />}
    </div>
  )
}

export function BannerModal({ banner, onClose }: { banner: HomeBanner | null; onClose: () => void }) {
  const [f, setF] = useState({
    title: banner?.title ?? '',
    subtitle: banner?.subtitle ?? '',
    image: banner?.image,
    ctaLabel: banner?.ctaLabel ?? '',
    ctaHref: banner?.ctaHref ?? '',
    slot: banner?.slot ?? ('hero' as HomeBanner['slot']),
    tone: banner?.tone ?? ('blue' as HomeBanner['tone']),
    from: banner?.validFrom ? toDay(banner.validFrom) : '',
    till: banner?.validTill ? toDay(banner.validTill) : '',
  })
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }))
  const { run, busy, error } = useAction()
  const save = () =>
    void run(
      () =>
        saveBanner({
          id: banner?.id,
          title: f.title,
          subtitle: f.subtitle,
          image: f.image,
          ctaLabel: f.ctaLabel,
          ctaHref: f.ctaHref,
          slot: f.slot,
          tone: f.tone,
          validFrom: f.from ? fromDay(f.from) : undefined,
          validTill: f.till ? fromDay(f.till, true) : undefined,
        }),
      banner ? 'Banner saved' : 'Banner added',
      onClose
    )
  return (
    <Modal
      open
      onClose={onClose}
      title={banner ? 'Edit banner' : 'New banner'}
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
        <BannerPreview b={f} />
        <Field label="Headline">
          <input value={f.title} onChange={(e) => set('title', e.target.value)} maxLength={60} className={cn(inputClass, 'h-10')} />
        </Field>
        <Field label="Line under it">
          <input value={f.subtitle} onChange={(e) => set('subtitle', e.target.value)} className={cn(inputClass, 'h-10')} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Button">
            <input value={f.ctaLabel} onChange={(e) => set('ctaLabel', e.target.value)} placeholder="Book now" className={cn(inputClass, 'h-10')} />
          </Field>
          <Field label="Opens">
            <input value={f.ctaHref} onChange={(e) => set('ctaHref', e.target.value)} placeholder="/services/ac" className={cn(inputClass, 'h-10')} />
          </Field>
        </div>
        <div className="flex flex-wrap gap-4">
          <Field label="Where">
            <Segmented
              value={f.slot}
              onChange={(v) => set('slot', v)}
              options={[
                { value: 'hero', label: 'Top carousel' },
                { value: 'inline', label: 'Between sections' },
              ]}
            />
          </Field>
          <Field label="Colour">
            <div className="flex gap-1.5">
              {(Object.keys(TONE_BG) as HomeBanner['tone'][]).map((t) => (
                <button key={t} type="button" aria-label={t} aria-pressed={f.tone === t} onClick={() => set('tone', t)} className={cn('size-8 rounded-full ring-offset-2', TONE_BG[t], f.tone === t && 'ring-2 ring-ink')} />
              ))}
            </div>
          </Field>
        </div>
        <Field label="Picture">
          <ImageField label="Banner picture" value={f.image} onChange={(v) => set('image', v)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Show from" hint="Optional">
            <input type="date" value={f.from} onChange={(e) => set('from', e.target.value)} className={cn(inputClass, 'h-10')} />
          </Field>
          <Field label="Until" hint="Optional">
            <input type="date" value={f.till} onChange={(e) => set('till', e.target.value)} className={cn(inputClass, 'h-10')} />
          </Field>
        </div>
        <FormError error={error} />
      </div>
    </Modal>
  )
}
