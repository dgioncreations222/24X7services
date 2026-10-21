'use client'

import { Camera } from 'lucide-react'
import type { Question } from '@/lib/data'
import { cn } from '@/lib/cn'

/**
 * A question drawn the way the customer app asks it, so the admin sees the
 * booking form while building it. Only a picture: nothing here can be filled.
 */
export function QuestionPreview({ q }: { q: Pick<Question, 'label' | 'kind' | 'options' | 'multiple' | 'unit' | 'help' | 'required'> }) {
  return (
    <div>
      <p className="text-[15px] font-bold text-ink">
        {q.label || 'Your question'}
        {q.required ? <span className="text-danger"> *</span> : <span className="text-xs font-semibold text-faint"> · optional</span>}
      </p>
      {q.help && <p className="mt-0.5 text-xs text-muted">{q.help}</p>}
      <div className="mt-2.5">
        {q.kind === 'options' && (
          <div className="flex flex-wrap gap-2">
            {(q.options.filter(Boolean).length ? q.options.filter(Boolean) : ['Option 1', 'Option 2']).map((o, i) => (
              <span
                key={i}
                className={cn(
                  'inline-flex h-10 items-center rounded-xl border-2 px-3.5 text-sm font-bold',
                  i === 0 ? 'border-brand bg-brand-soft text-brand' : 'border-line-strong bg-card text-ink-2'
                )}
              >
                {o}
              </span>
            ))}
            {q.multiple && <span className="self-center text-xs font-semibold text-muted">Pick any</span>}
          </div>
        )}
        {q.kind === 'text' && <div className="h-20 rounded-xl border border-line-strong bg-card px-3 py-2.5 text-sm text-faint">Type here…</div>}
        {q.kind === 'number' && (
          <div className="flex h-11 w-40 items-center justify-between rounded-xl border border-line-strong bg-card px-3 text-sm">
            <span className="text-faint">0</span>
            {q.unit && <span className="font-semibold text-muted">{q.unit}</span>}
          </div>
        )}
        {q.kind === 'photo' && (
          <div className="flex h-24 w-32 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line-strong bg-card text-xs font-bold text-muted">
            <Camera className="size-5" aria-hidden /> Add photo
          </div>
        )}
      </div>
    </div>
  )
}
