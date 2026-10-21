import { useEffect, useRef, useState } from 'react'
import { TextInput, View } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { Check, Copy, Info, Package, Pencil, ShieldAlert } from 'lucide-react-native'
import { Icon, Inherit, Tappable, Text } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { AiAnswer } from '@/lib/ai/types'
import { COLORS } from '@/lib/theme'

/** One assistant reply: lead line, structured sections, then the callouts. */
export function AnswerView({
  answer,
  onPick,
  onSaveNotes,
  notesSaved,
}: {
  answer: AiAnswer
  onPick?: (s: string) => void
  onSaveNotes?: (n: NonNullable<AiAnswer['notes']>) => void
  notesSaved?: boolean
}) {
  return (
    <Inherit className="text-[14px] leading-[22px] text-ink">
      <View className="gap-3">
        {answer.lead ? <Text className="font-semibold">{answer.lead}</Text> : null}

        {answer.sections.map((s) => (
          <View key={s.heading}>
            <Text className="mb-1 text-[11px] font-extrabold uppercase leading-4 tracking-[0.08em] text-muted">{s.heading}</Text>
            {s.ordered ? (
              <View className="gap-1.5">
                {s.items.map((it, i) => (
                  <View key={i} className="flex-row gap-2.5">
                    <View className="mt-0.5 size-5 shrink-0 items-center justify-center rounded-md bg-brand-soft">
                      <Text className="num text-[11px] font-extrabold leading-4 text-brand">{i + 1}</Text>
                    </View>
                    <Text className="min-w-0 flex-1">{it}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View className="gap-1">
                {s.items.map((it, i) => (
                  <View key={i} className="flex-row gap-2.5">
                    <View className="mt-2 size-1.5 shrink-0 rounded-full bg-faint" />
                    <Text className="min-w-0 flex-1">{it}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}

        {answer.parts && answer.parts.length > 0 ? (
          <View>
            <Text className="mb-1.5 text-[11px] font-extrabold uppercase leading-4 tracking-[0.08em] text-muted">Possible parts</Text>
            <View className="overflow-hidden rounded-xl border border-line bg-card">
              {answer.parts.map((p, i) => (
                <View key={p.sku ?? p.name} className={cn('flex-row items-center gap-2.5 px-3 py-2.5', i > 0 && 'border-t border-line')}>
                  <Icon as={Package} className={cn('size-4 shrink-0', p.likely ? 'text-brand' : 'text-faint')} />
                  <View className="min-w-0 flex-1">
                    <Text numberOfLines={1} className="text-[13.5px] font-bold leading-5">
                      {p.name}
                    </Text>
                    {p.sku ? <Text className="num text-[11px] font-semibold leading-4 text-faint">{p.sku}</Text> : null}
                  </View>
                  {p.likely ? (
                    <View className="rounded-md bg-brand-soft px-1.5 py-0.5">
                      <Text className="text-[10.5px] font-extrabold leading-4 text-brand">Most likely</Text>
                    </View>
                  ) : null}
                  {p.inVan !== undefined ? (
                    <View className={cn('rounded-md px-1.5 py-0.5', p.inVan ? 'bg-success-soft' : 'bg-warning-soft')}>
                      <Text className={cn('text-[10.5px] font-extrabold leading-4', p.inVan ? 'text-success' : 'text-warning')}>
                        {p.inVan ? 'In van' : 'From hub'}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {answer.notes ? <NotesCard notes={answer.notes} onSave={onSaveNotes} saved={notesSaved} /> : null}
        {answer.customer ? <CustomerCard {...answer.customer} /> : null}

        {answer.safety ? (
          <View className="flex-row gap-2.5 rounded-xl border border-warning/25 bg-warning-soft px-3 py-2.5">
            <Icon as={ShieldAlert} className="mt-0.5 size-4 shrink-0 text-warning" />
            <Text className="min-w-0 flex-1 text-[13px] leading-5">
              <Text className="text-[13px] font-extrabold leading-5">Safety · </Text>
              {answer.safety}
            </Text>
          </View>
        ) : null}
        {answer.caution ? (
          <View className="flex-row gap-2">
            <Icon as={Info} className="mt-0.5 size-3.5 shrink-0 text-muted" />
            <Text className="min-w-0 flex-1 text-[12.5px] font-medium leading-5 text-muted">{answer.caution}</Text>
          </View>
        ) : null}

        {answer.suggestions && answer.suggestions.length > 0 && onPick ? (
          <View className="flex-row flex-wrap gap-1.5 pt-0.5">
            {answer.suggestions.map((s) => (
              <Tappable
                key={s}
                onPress={() => onPick(s)}
                className="h-8 justify-center rounded-pill border border-brand/25 bg-card px-3 active:bg-brand-soft active:opacity-100"
              >
                <Text className="text-[12.5px] font-bold leading-4 text-brand">{s}</Text>
              </Tappable>
            ))}
          </View>
        ) : null}
      </View>
    </Inherit>
  )
}

function NotesCard({ notes, onSave, saved }: { notes: NonNullable<AiAnswer['notes']>; onSave?: (n: NonNullable<AiAnswer['notes']>) => void; saved?: boolean }) {
  const [draft, setDraft] = useState(notes)
  const [editing, setEditing] = useState(false)
  const rows: [keyof typeof draft, string][] = [
    ['diagnosis', 'Diagnosis'],
    ['action', 'Action taken'],
    ['recommendation', 'Recommendation'],
  ]
  return (
    <View className="overflow-hidden rounded-xl border border-line bg-card">
      <View>
        {rows.map(([k, label], i) => (
          <View key={k} className={cn('px-3 py-2.5', i > 0 && 'border-t border-line')}>
            <Text className="text-[10.5px] font-extrabold uppercase leading-4 tracking-[0.08em] text-faint">{label}</Text>
            {editing ? (
              <TextInput
                value={draft[k]}
                onChangeText={(v) => setDraft({ ...draft, [k]: v })}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
                placeholderTextColor={COLORS.faint}
                className="mt-1 min-h-[60px] w-full rounded-lg border border-line-strong bg-card px-2.5 py-2 font-normal text-[13.5px] text-ink"
              />
            ) : (
              <Text className="mt-0.5 text-[13.5px] font-semibold leading-5">{draft[k]}</Text>
            )}
          </View>
        ))}
      </View>
      <View className="flex-row gap-2 border-t border-line bg-canvas/60 p-2">
        <Tappable
          onPress={() => setEditing((e) => !e)}
          className="h-10 flex-1 flex-row items-center justify-center gap-1.5 rounded-lg border border-line-strong bg-card"
        >
          <Icon as={Pencil} className="size-3.5 text-ink" />
          <Text className="text-[13px] font-extrabold leading-4">{editing ? 'Done' : 'Edit'}</Text>
        </Tappable>
        {onSave ? (
          <Tappable
            onPress={() => {
              setEditing(false)
              onSave(draft)
            }}
            className={cn(
              'h-10 flex-[1.4] flex-row items-center justify-center gap-1.5 rounded-lg',
              saved ? 'bg-success' : 'bg-brand active:bg-brand-deep active:opacity-100'
            )}
          >
            {saved ? (
              <>
                <Icon as={Check} className="size-4 text-white" />
                <Text className="text-[13px] font-extrabold leading-4 text-white">Saved to job</Text>
              </>
            ) : (
              <Text className="text-[13px] font-extrabold leading-4 text-white">Save to Job</Text>
            )}
          </Tappable>
        ) : null}
      </View>
    </View>
  )
}

function CustomerCard({ technical, simple }: { technical: string; simple: string }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])
  return (
    <View className="overflow-hidden rounded-xl border border-line bg-card">
      <View className="px-3 py-2.5">
        <Text className="text-[10.5px] font-extrabold uppercase leading-4 tracking-[0.08em] text-faint">Technical</Text>
        <Text className="mt-0.5 text-[13px] font-medium leading-5 text-muted">{technical}</Text>
      </View>
      <View className="border-t border-line bg-success-soft/50 px-3 py-2.5">
        <Text className="text-[10.5px] font-extrabold uppercase leading-4 tracking-[0.08em] text-success">For the customer</Text>
        <Text className="mt-0.5 text-[14px] font-semibold leading-[22px]">{simple}</Text>
      </View>
      <Tappable
        onPress={async () => {
          try {
            await Clipboard.setStringAsync(simple)
            setCopied(true)
            if (timer.current) clearTimeout(timer.current)
            timer.current = setTimeout(() => setCopied(false), 1800)
          } catch {
            /* clipboard blocked */
          }
        }}
        className="h-10 w-full flex-row items-center justify-center gap-1.5 border-t border-line active:bg-brand-soft active:opacity-100"
      >
        <Icon as={copied ? Check : Copy} className="size-4 text-brand" />
        <Text className="text-[13px] font-extrabold leading-4 text-brand">{copied ? 'Copied' : 'Copy for customer'}</Text>
      </Tappable>
    </View>
  )
}
