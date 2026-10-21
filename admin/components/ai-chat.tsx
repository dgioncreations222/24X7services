'use client'

import { useState } from 'react'
import { ArrowDown, ArrowUp, ImagePlus, Plus, Send, X } from 'lucide-react'
import { APPLIANCES, APPLIANCE_LABEL, BRANDS, BRAND_LABEL } from '@/lib/catalog'
import { useStore } from '@/lib/store'
import type { AiChatConfig } from '@/lib/types'
import { MediaPicker, MediaThumb } from './media'
import { useToast } from './toast'
import { Button, Card, CardHeader, Field, inputClass, Select, Toggle } from './ui'
import { SaveBar, ToggleChip, changedKeys } from './ai-shared'

const LABELS: Partial<Record<keyof AiChatConfig, string>> = {
  enabled: 'enabled',
  name: 'name',
  avatar: 'avatar',
  welcome: 'welcome message',
  quickQuestions: 'quick questions',
  instructions: 'system instructions',
  brands: 'supported brands',
  appliances: 'supported appliances',
  techRules: 'technical rules',
  safety: 'safety instructions',
  tone: 'tone',
  handoff: 'human handoff',
}

/** The customer-facing chat assistant: who it is, what it says first, and the rules it follows. */
export function ChatAgentTab({ readOnly }: { readOnly: boolean }) {
  const store = useStore()
  const toast = useToast()
  const saved = store.aiChat
  const [d, setD] = useState<AiChatConfig>(saved)
  const [picker, setPicker] = useState(false)
  const [newQ, setNewQ] = useState('')
  const set = <K extends keyof AiChatConfig>(k: K, v: AiChatConfig[K]) => setD((x) => ({ ...x, [k]: v }))
  const dirty = JSON.stringify(d) !== JSON.stringify(saved)

  const moveQ = (i: number, by: number) => {
    const q = [...d.quickQuestions]
    const j = i + by
    if (j < 0 || j >= q.length) return
    ;[q[i], q[j]] = [q[j]!, q[i]!]
    set('quickQuestions', q)
  }
  const addQ = () => {
    const v = newQ.trim()
    if (!v || d.quickQuestions.includes(v)) return
    set('quickQuestions', [...d.quickQuestions, v])
    setNewQ('')
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-5">
        <Card>
          <CardHeader
            title="Identity"
            sub="What customers see when they open chat"
            action={
              <span className="flex items-center gap-2 text-[13px] font-bold text-ink-2">
                {d.enabled ? 'Enabled' : 'Disabled'}
                <Toggle checked={d.enabled} onChange={(v) => !readOnly && set('enabled', v)} label="Enable AI chat" />
              </span>
            }
          />
          <div className="grid gap-4 p-5 sm:grid-cols-[auto_1fr]">
            <div className="flex flex-col items-center gap-2">
              <MediaThumb src={d.avatar} className="size-20 rounded-2xl border border-line" />
              <Button size="xs" variant="secondary" disabled={readOnly} onClick={() => setPicker(true)}>
                <ImagePlus /> Change avatar
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="AI name">
                <input className={inputClass} value={d.name} disabled={readOnly} onChange={(e) => set('name', e.target.value)} />
              </Field>
              <Field label="Tone">
                <Select
                  label="Tone"
                  className="w-full"
                  value={d.tone}
                  onChange={(v) => !readOnly && set('tone', v)}
                  options={(['Friendly', 'Professional', 'Concise'] as const).map((v) => ({ value: v, label: v }))}
                />
              </Field>
              <Field label="Welcome message" className="sm:col-span-2">
                <textarea className={inputClass} rows={3} value={d.welcome} disabled={readOnly} onChange={(e) => set('welcome', e.target.value)} />
              </Field>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Quick questions" sub="Shown as tap-to-ask chips under the welcome message, in this order" />
          <div className="p-5">
            <ul className="space-y-2">
              {d.quickQuestions.map((q, i) => (
                <li key={q} className="flex items-center gap-2 rounded-lg border border-line bg-canvas/50 px-3 py-2">
                  <span className="num w-5 text-xs font-bold text-faint">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{q}</span>
                  <button type="button" aria-label="Move up" disabled={readOnly || i === 0} onClick={() => moveQ(i, -1)} className="grid size-7 place-items-center rounded-md text-muted hover:bg-card disabled:opacity-30">
                    <ArrowUp className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Move down"
                    disabled={readOnly || i === d.quickQuestions.length - 1}
                    onClick={() => moveQ(i, 1)}
                    className="grid size-7 place-items-center rounded-md text-muted hover:bg-card disabled:opacity-30"
                  >
                    <ArrowDown className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${q}`}
                    disabled={readOnly}
                    onClick={() => set('quickQuestions', d.quickQuestions.filter((x) => x !== q))}
                    className="grid size-7 place-items-center rounded-md text-muted hover:bg-danger-soft hover:text-danger disabled:opacity-30"
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <input
                className={inputClass}
                placeholder="Add a quick question…"
                value={newQ}
                disabled={readOnly || d.quickQuestions.length >= 8}
                onChange={(e) => setNewQ(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addQ()}
              />
              <Button variant="secondary" disabled={readOnly || !newQ.trim() || d.quickQuestions.length >= 8} onClick={addQ}>
                <Plus /> Add
              </Button>
            </div>
            <p className="mt-1.5 text-xs text-muted">Up to 8. Keep each under 30 characters so it fits on a phone.</p>
          </div>
        </Card>

        <Card>
          <CardHeader title="Scope" sub="The assistant declines anything outside these brands and appliances" />
          <div className="space-y-4 p-5">
            <div>
              <p className="mb-2 text-[13px] font-bold text-ink-2">Supported brands</p>
              <div className="flex flex-wrap gap-2">
                {BRANDS.map((b) => (
                  <ToggleChip
                    key={b}
                    disabled={readOnly}
                    on={d.brands.includes(b)}
                    onClick={() => set('brands', d.brands.includes(b) ? d.brands.filter((x) => x !== b) : BRANDS.filter((x) => x === b || d.brands.includes(x)))}
                  >
                    {BRAND_LABEL[b]}
                  </ToggleChip>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[13px] font-bold text-ink-2">Supported appliances</p>
              <div className="flex flex-wrap gap-2">
                {APPLIANCES.map((a) => (
                  <ToggleChip
                    key={a}
                    disabled={readOnly}
                    on={d.appliances.includes(a)}
                    onClick={() => set('appliances', d.appliances.includes(a) ? d.appliances.filter((x) => x !== a) : APPLIANCES.filter((x) => x === a || d.appliances.includes(x)))}
                  >
                    {APPLIANCE_LABEL[a]}
                  </ToggleChip>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Instructions & rules" sub="How the assistant reasons and what it must never do" />
          <div className="space-y-4 p-5">
            <Field label="System instructions">
              <textarea className={inputClass} rows={4} value={d.instructions} disabled={readOnly} onChange={(e) => set('instructions', e.target.value)} />
            </Field>
            <Field label="Technical assistance rules" hint="Diagnosis, error codes, possible parts, repair guidance.">
              <textarea className={inputClass} rows={3} value={d.techRules} disabled={readOnly} onChange={(e) => set('techRules', e.target.value)} />
            </Field>
            <Field label="Safety instructions" hint="Always applied first, before any troubleshooting step.">
              <textarea className={inputClass} rows={3} value={d.safety} disabled={readOnly} onChange={(e) => set('safety', e.target.value)} />
            </Field>
            <div className="flex items-center justify-between gap-4 rounded-lg border border-line px-4 py-3">
              <div>
                <p className="text-sm font-bold">Hand off to a human</p>
                <p className="text-xs text-muted">Offer a support agent when the customer asks, or after two unresolved answers.</p>
              </div>
              <Toggle checked={d.handoff} onChange={(v) => !readOnly && set('handoff', v)} label="Human handoff" />
            </div>
          </div>
        </Card>

        <SaveBar
          dirty={dirty}
          disabled={readOnly}
          onReset={() => setD(saved)}
          onSave={() => {
            const changed = changedKeys(saved, d, LABELS)
            store.updateAiChat(d, { action: 'Updated AI chat agent', target: changed.join(', ') })
            toast('AI chat agent saved')
          }}
        />
      </div>

      <ChatPreview cfg={d} />

      <MediaPicker open={picker} onClose={() => setPicker(false)} onPick={(m) => set('avatar', m.url)} title="Choose the AI avatar" />
    </div>
  )
}

/** What the chat looks like on a customer's phone with the current draft. */
function ChatPreview({ cfg }: { cfg: AiChatConfig }) {
  return (
    <div className="xl:sticky xl:top-24 xl:self-start">
      <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.1em] text-faint">Live preview</p>
      <div className="mx-auto w-full max-w-[320px] rounded-[28px] border-[6px] border-ink bg-ink shadow-float">
        <div className="overflow-hidden rounded-[22px] bg-canvas">
          <div className="flex items-center gap-2.5 bg-brand-ink px-4 py-3 text-white">
            <MediaThumb src={cfg.avatar} className="size-9 rounded-full bg-white" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-extrabold">{cfg.name || 'Assistant'}</p>
              <p className="flex items-center gap-1.5 text-[11px] font-semibold text-white/70">
                <span className={cfg.enabled ? 'size-1.5 rounded-full bg-live-bright' : 'size-1.5 rounded-full bg-white/40'} />
                {cfg.enabled ? 'Online · replies instantly' : 'Chat is turned off'}
              </p>
            </div>
          </div>
          <div className="min-h-[340px] space-y-3 px-3 py-4">
            {cfg.enabled ? (
              <>
                <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-card px-3 py-2 text-[13px] font-medium leading-relaxed text-ink shadow-card">
                  {cfg.welcome || '…'}
                </div>
                <div className="flex flex-wrap gap-1.5 pl-1">
                  {cfg.quickQuestions.map((q) => (
                    <span key={q} className="rounded-full border border-brand/30 bg-card px-2.5 py-1 text-[11.5px] font-bold text-brand">
                      {q}
                    </span>
                  ))}
                </div>
                <p className="pt-2 text-center text-[10.5px] font-semibold text-faint">
                  Covers {cfg.brands.map((b) => BRAND_LABEL[b]).join(', ') || 'no brands'} · {cfg.appliances.length} appliances
                </p>
              </>
            ) : (
              <p className="pt-24 text-center text-xs font-semibold text-muted">Customers see “Chat with support” instead.</p>
            )}
          </div>
          <div className="flex items-center gap-2 border-t border-line bg-card px-3 py-2.5">
            <span className="h-8 flex-1 rounded-full bg-canvas px-3 text-[12px] leading-8 text-faint">Type your question…</span>
            <span className="grid size-8 place-items-center rounded-full bg-brand text-white">
              <Send className="size-3.5" />
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
