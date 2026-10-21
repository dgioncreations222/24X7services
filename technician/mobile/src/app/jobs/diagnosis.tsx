import { useEffect, useRef, useState } from 'react'
import { TextInput, View, type ScrollView } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { ChevronRight, Package } from 'lucide-react-native'
import { JobNotFound, useJobParam } from '@/components/JobParts'
import { PhotoSlots } from '@/components/PhotoSlots'
import { ActionDock, Button, Card, Field, FilterChip, Icon, Page, ScreenHeader, SectionTitle, Tappable, Text, inputClass } from '@/components/ui'
import { CONDITIONS, FAULT_CATEGORIES, LABOUR_RATE, applianceTitle, inr, type Condition } from '@/lib/catalog'
import { cn } from '@/lib/cn'
import { partsTotal } from '@/lib/format'
import { useBack } from '@/lib/nav'
import { stepHref } from '@/lib/routes'
import { useStore } from '@/lib/store'
import type { Job } from '@/lib/types'
import { COLORS } from '@/lib/theme'

export default function Diagnosis() {
  const job = useJobParam()
  if (!job) return <JobNotFound />
  return <DiagnosisForm key={job.id} job={job} />
}

const CONDITION_TONE: Record<Condition, string> = {
  Good: 'border-success bg-success',
  Fair: 'border-info bg-info',
  Poor: 'border-warning bg-warning',
  'Not working': 'border-danger bg-danger',
}

function DiagnosisForm({ job }: { job: Job }) {
  const store = useStore()
  const goBack = useBack(stepHref('detail', job.id))
  const { focus } = useLocalSearchParams<{ focus?: string }>()
  const scrollRef = useRef<ScrollView>(null)
  const photosY = useRef<number | null>(null)
  const scrolled = useRef(false)
  const d = job.diagnosis
  const [condition, setCondition] = useState<Condition>(d?.condition ?? 'Not working')
  const [problem, setProblem] = useState(d?.problem ?? '')
  const [category, setCategory] = useState(d?.category ?? '')
  const [repair, setRepair] = useState(d?.repair ?? '')
  const [notes, setNotes] = useState(d?.notes ?? '')
  const suggested = LABOUR_RATE[job.appliance] + partsTotal(job)
  const [estimate, setEstimate] = useState<string>(String(d?.estimate ?? suggested))
  const [saved, setSaved] = useState(false)
  const savedTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(savedTimer.current), [])

  const valid = !!(problem.trim() && category && repair.trim())
  const readOnly = job.status === 'closed'

  function save() {
    store.saveDiagnosis(job.id, {
      condition,
      problem: problem.trim(),
      category,
      repair: repair.trim(),
      notes: notes.trim(),
      estimate: Number(estimate) || suggested,
    })
  }

  /** Opened from the job's Photos row: go straight to the photo slots. */
  function scrollToPhotos() {
    if (focus !== 'photos' || scrolled.current || photosY.current === null) return
    scrolled.current = true
    const y = photosY.current
    setTimeout(() => scrollRef.current?.scrollTo({ y: Math.max(0, y - 16), animated: true }), 50)
  }

  return (
    <>
      <ScreenHeader back={stepHref('detail', job.id)} title="Diagnosis" subtitle={`${applianceTitle(job.brand, job.appliance)} · ${job.id}`} />
      <Page className="gap-5" scrollRef={scrollRef} onContentSizeChange={scrollToPhotos}>
        {/* A closed job's diagnosis is the record: shown, not editable. */}
        <View className="gap-5" pointerEvents={readOnly ? 'none' : 'auto'}>
          <Card className="gap-5 p-4">
            <View>
              <Text className="mb-2 text-sm font-bold text-ink-2">Appliance condition</Text>
              <View className="flex-row flex-wrap gap-2">
                {CONDITIONS.map((c) => (
                  <Tappable
                    key={c}
                    accessibilityState={{ selected: condition === c, disabled: readOnly }}
                    onPress={() => setCondition(c)}
                    className={cn('h-11 grow basis-[47%] items-center justify-center rounded-xl border-2', condition === c ? CONDITION_TONE[c] : 'border-line-strong bg-card')}
                  >
                    <Text className={cn('text-sm font-extrabold', condition === c ? 'text-white' : 'text-ink-2')}>{c}</Text>
                  </Tappable>
                ))}
              </View>
            </View>

            <Field label="Problem identified">
              <TextInput
                value={problem}
                onChangeText={setProblem}
                editable={!readOnly}
                className={inputClass}
                placeholder="e.g. Drain pump impeller jammed with debris"
                placeholderTextColor={COLORS.faint}
              />
            </Field>

            <View>
              <Text className="mb-2 text-sm font-bold text-ink-2">Fault category</Text>
              <View className="flex-row flex-wrap gap-2">
                {FAULT_CATEGORIES[job.appliance].map((c) => (
                  <FilterChip key={c} active={category === c} onClick={() => setCategory(c)}>
                    {c}
                  </FilterChip>
                ))}
              </View>
            </View>

            <Field label="Required repair">
              <TextInput
                value={repair}
                onChangeText={setRepair}
                editable={!readOnly}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                className={cn(inputClass, 'min-h-[88px]')}
                placeholder="What you will do to fix it"
                placeholderTextColor={COLORS.faint}
              />
            </Field>
          </Card>

          <View>
            <SectionTitle>Parts required</SectionTitle>
            <Tappable
              href={stepHref('parts', job.id)}
              onPress={() => valid && !readOnly && save()}
              className="flex-row items-center gap-3 rounded-card border border-line bg-card p-4 shadow-card active:border-line-strong active:opacity-100"
            >
              <View className="size-10 items-center justify-center rounded-xl bg-brand-soft">
                <Icon as={Package} className="size-5 text-brand" />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="text-sm font-extrabold">
                  {job.parts.length ? `${job.parts.length} part${job.parts.length > 1 ? 's' : ''} selected` : 'No parts selected'}
                </Text>
                <Text numberOfLines={1} className="text-xs font-medium text-muted">
                  {job.parts.length ? job.parts.map((p) => `${p.name} ×${p.qty}`).join(', ') : 'Pick from van stock for this appliance'}
                </Text>
              </View>
              <Text className="num text-sm font-extrabold">{inr(partsTotal(job))}</Text>
              <Icon as={ChevronRight} className="size-4 text-faint" />
            </Tappable>
          </View>

          <Card className="gap-4 p-4">
            <Field
              label="Estimated repair cost"
              hint={`Suggested ${inr(suggested)} — labour ${inr(LABOUR_RATE[job.appliance])} + parts ${inr(partsTotal(job))}`}
            >
              <View className="justify-center">
                <TextInput
                  keyboardType="number-pad"
                  value={estimate}
                  editable={!readOnly}
                  onChangeText={(v) => setEstimate(v.replace(/\D/g, ''))}
                  className={cn(inputClass, 'num pl-8 font-extrabold')}
                />
                <Text pointerEvents="none" className="absolute left-3.5 font-bold text-muted">
                  ₹
                </Text>
              </View>
            </Field>
            <Field label="Technician notes">
              <TextInput
                value={notes}
                onChangeText={setNotes}
                editable={!readOnly}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                className={cn(inputClass, 'min-h-[88px]')}
                placeholder="Readings, advice given to the customer, anything the next technician should know"
                placeholderTextColor={COLORS.faint}
              />
            </Field>
          </Card>
        </View>

        <View
          onLayout={(e) => {
            photosY.current = e.nativeEvent.layout.y
            scrollToPhotos()
          }}
        >
          <SectionTitle>Photos</SectionTitle>
          <Card className="p-4">
            <PhotoSlots job={job} />
          </Card>
        </View>
      </Page>

      {!readOnly && (
        <ActionDock>
          <Button
            variant="secondary"
            size="lg"
            disabled={!valid}
            className="flex-1 border-2 opacity-100"
            textClassName={cn('text-[15px] font-extrabold', !valid && 'text-faint')}
            onPress={() => {
              save()
              setSaved(true)
              clearTimeout(savedTimer.current)
              savedTimer.current = setTimeout(() => setSaved(false), 1600)
            }}
          >
            {saved ? 'Saved ✓' : 'Save'}
          </Button>
          {job.status === 'diagnosis' && (
            <Button
              size="lg"
              disabled={!valid}
              className="flex-[1.6]"
              textClassName="text-[15px] font-extrabold"
              onPress={() => {
                save()
                store.advance(job.id, 'repair')
                goBack()
              }}
            >
              Save &amp; Start Repair
            </Button>
          )}
        </ActionDock>
      )}
    </>
  )
}
