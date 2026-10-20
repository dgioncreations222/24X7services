'use client'

import { useRef, useState } from 'react'
import { ImagePlus, Plus, Trash2 } from 'lucide-react'
import { Button, inputClass } from '@/components/ui'
import { cn } from '@/lib/cn'

export const textareaClass = cn(inputClass, 'min-h-20 resize-y leading-relaxed')

/** Rupees typed, paise kept: "549" ⇄ 54900. */
export function PriceInput({ value, onChange, label }: { value: number; onChange: (paise: number) => void; label: string }) {
  const [text, setText] = useState(value ? String(value / 100) : '')
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted">₹</span>
      <input
        inputMode="decimal"
        aria-label={label}
        value={text}
        onChange={(e) => {
          const t = e.target.value.replace(/[^\d.]/g, '')
          setText(t)
          onChange(Math.round(Number(t || 0) * 100))
        }}
        className={cn(inputClass, 'num h-10 pl-7')}
      />
    </div>
  )
}

/** A short list of lines — included, not included — each removable. */
export function ListEditor({ items, onChange, placeholder, label }: { items: string[]; onChange: (next: string[]) => void; placeholder: string; label: string }) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <input
            aria-label={`${label} ${i + 1}`}
            value={item}
            placeholder={placeholder}
            onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
            className={cn(inputClass, 'h-10')}
          />
          <Button variant="subtle" aria-label={`Remove ${label.toLowerCase()} ${i + 1}`} onClick={() => onChange(items.filter((_, j) => j !== i))} className="px-2.5">
            <Trash2 />
          </Button>
        </div>
      ))}
      <Button variant="ghost" size="sm" onClick={() => onChange([...items, ''])}>
        <Plus /> Add line
      </Button>
    </div>
  )
}

const MAX_BYTES = 800_000

/**
 * An image: picked from this computer (kept as a data URL until uploads
 * exist) or typed as a path under /public.
 */
export function ImageField({ value, onChange, label }: { value?: string; onChange: (url: string | undefined) => void; label: string }) {
  const file = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  return (
    <div className="flex items-start gap-3">
      <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-canvas">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element -- static export, and data: URLs from the picker
          <img src={value} alt="" className="size-full object-cover" />
        ) : (
          <ImagePlus className="size-6 text-faint" aria-hidden />
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <input
          aria-label={`${label} path`}
          value={value?.startsWith('data:') ? 'Picked from this computer' : (value ?? '')}
          readOnly={value?.startsWith('data:')}
          placeholder="/media/svc-ac.jpg"
          onChange={(e) => onChange(e.target.value.trim() || undefined)}
          className={cn(inputClass, 'h-9')}
        />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => file.current?.click()}>
            <ImagePlus /> Choose image
          </Button>
          {value && (
            <Button size="sm" variant="subtle" onClick={() => onChange(undefined)}>
              Remove
            </Button>
          )}
        </div>
        {error && <p className="text-xs font-semibold text-danger">{error}</p>}
        <input
          ref={file}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (!f) return
            if (f.size > MAX_BYTES) return setError('Pick an image under 800 KB.')
            setError(null)
            const r = new FileReader()
            r.onload = () => onChange(String(r.result))
            r.readAsDataURL(f)
          }}
        />
      </div>
    </div>
  )
}
