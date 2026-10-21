import { useCallback, useEffect, useRef, useState } from 'react'
import { Linking, ScrollView, TextInput, View } from 'react-native'
import Animated, {
  Easing,
  FadeInDown,
  ReduceMotion,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import { useLocalSearchParams, type Href } from 'expo-router'
import * as Speech from 'expo-speech'
import { Check, ChevronDown, Headset, Mic, MicOff, Pencil, Phone, PhoneOff, RotateCcw, ShieldCheck, TriangleAlert } from 'lucide-react-native'
import { CallMark } from '@/components/ai/AiMark'
import { JobNotFound } from '@/components/JobParts'
import { BrandTag } from '@/components/glyphs'
import { ActionDock, Blink, Card, Icon, Page, ScreenHeader, SectionTitle, Tappable, Text, Toggle, inputClass } from '@/components/ui'
import { PURPOSE_HINT, PURPOSE_LABEL, RESULT_LABEL, SCENARIO_LABEL, planCall, purposeAvailability, scenariosFor, type CallPlan } from '@/lib/ai/call'
import type { CallLine, CallPurpose, CallRecord, CallScenario } from '@/lib/ai/types'
import { APPLIANCE_LABEL, BRAND_LABEL, applianceTitle } from '@/lib/catalog'
import { cn } from '@/lib/cn'
import { dayLabel, driveProgress, telHref, time } from '@/lib/format'
import { stepHref } from '@/lib/routes'
import { useJob, useStore } from '@/lib/store'
import type { Job } from '@/lib/types'
import { COLORS } from '@/lib/theme'

const PURPOSES: CallPurpose[] = ['confirm', 'eta', 'details', 'reschedule', 'status', 'followup']
const uid = () => Math.random().toString(36).slice(2, 10)

const EASE = Easing.bezier(0.22, 0.61, 0.36, 1)
/** The web's `animate-slide-up`. */
const SLIDE_UP = FadeInDown.duration(280).easing(EASE.factory()).reduceMotion(ReduceMotion.System)

/** 00:02:34 */
const clock = (s: number) => [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, '0')).join(':')

export default function AiCallScreen() {
  const params = useLocalSearchParams<{ id?: string; purpose?: string }>()
  const job = useJob(params.id ?? null)
  if (!job)
    return (
      <>
        <ScreenHeader back={'/ai' as Href} title="AI Customer Call" />
        <JobNotFound />
      </>
    )
  return <CallFlow key={job.id} job={job} initial={(params.purpose ?? null) as CallPurpose | null} />
}

function CallFlow({ job, initial }: { job: Job; initial: CallPurpose | null }) {
  const availability = purposeAvailability(job)
  const firstOpen = PURPOSES.find((p) => !availability[p]) ?? 'status'
  const [purpose, setPurpose] = useState<CallPurpose>(initial && PURPOSES.includes(initial) && !availability[initial] ? initial : firstOpen)
  const [scenario, setScenario] = useState<CallScenario>('cooperative')
  const [stage, setStage] = useState<'setup' | 'call' | 'summary'>('setup')
  const [record, setRecord] = useState<CallRecord | null>(null)

  const scenarios = scenariosFor(purpose)
  const pickPurpose = (p: CallPurpose) => {
    setPurpose(p)
    if (!scenariosFor(p).includes(scenario)) setScenario('cooperative')
  }

  return (
    <>
      <ScreenHeader back={stepHref('detail', job.id)} title={stage === 'summary' ? 'Call summary' : 'AI Customer Call'} subtitle={`${job.id} · ${job.customer.name}`} />
      {stage === 'setup' && (
        <Setup
          job={job}
          purpose={purpose}
          onPurpose={pickPurpose}
          availability={availability}
          scenario={scenario}
          scenarios={scenarios}
          onScenario={setScenario}
          onStart={() => setStage('call')}
        />
      )}
      {stage === 'call' && (
        <LiveCall
          job={job}
          purpose={purpose}
          scenario={scenario}
          onEnded={(r) => {
            setRecord(r)
            setStage('summary')
          }}
        />
      )}
      {stage === 'summary' && record && <Summary job={job} record={record} onChange={setRecord} onAgain={() => setStage('setup')} />}
    </>
  )
}

/* ------------------------------------------------------------------ Setup */

function Setup({
  job,
  purpose,
  onPurpose,
  availability,
  scenario,
  scenarios,
  onScenario,
  onStart,
}: {
  job: Job
  purpose: CallPurpose
  onPurpose: (p: CallPurpose) => void
  availability: Record<CallPurpose, string | null>
  scenario: CallScenario
  scenarios: CallScenario[]
  onScenario: (s: CallScenario) => void
  onStart: () => void
}) {
  return (
    <Page className="gap-5">
      <Card className="overflow-hidden">
        <View className="flex-row items-center gap-3 border-b border-line p-4">
          <CallMark size={44} />
          <View className="min-w-0 flex-1">
            <Text className="text-base font-extrabold">AI Customer Call</Text>
            <Text className="text-xs font-semibold text-muted">Automated service assistant · routine updates only</Text>
          </View>
        </View>
        <View className="flex-row flex-wrap justify-between gap-y-3 p-4">
          <Field label="Customer" value={job.customer.name} />
          <Field
            label="Appliance"
            value={
              <View className="flex-row items-center gap-1.5">
                <BrandTag brand={job.brand} />
                <Text numberOfLines={1} className="min-w-0 shrink text-sm font-bold">
                  {APPLIANCE_LABEL[job.appliance]}
                </Text>
              </View>
            }
          />
          <Field label="Issue" value={job.issue} wide />
          <Field label="Appointment" value={`${dayLabel(job.scheduledAt)} · ${time(job.scheduledAt)}`} />
          <Field label="Phone" value={<Text className="num text-sm font-bold">{job.customer.phone}</Text>} />
        </View>
      </Card>

      <View>
        <SectionTitle>Purpose</SectionTitle>
        <View className="gap-2">
          {PURPOSES.map((p) => {
            const blocked = availability[p]
            const active = purpose === p
            return (
              <Tappable
                key={p}
                disabled={!!blocked}
                onPress={() => onPurpose(p)}
                accessibilityState={{ selected: active, disabled: !!blocked }}
                className={cn(
                  'flex-row items-start gap-3 rounded-xl border-2 p-3',
                  active ? 'border-brand bg-brand-soft' : 'border-line bg-card active:border-line-strong active:opacity-100',
                  blocked && 'opacity-55'
                )}
              >
                <View className={cn('mt-0.5 size-5 shrink-0 items-center justify-center rounded-full border-2', active ? 'border-brand bg-brand' : 'border-line-strong')}>
                  {active && <Icon as={Check} className="size-3 text-white" strokeWidth={3.5} />}
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-sm font-extrabold">{PURPOSE_LABEL[p]}</Text>
                  <Text className={cn('text-xs font-medium', blocked ? 'text-warning' : 'text-muted')}>{blocked ?? PURPOSE_HINT[p]}</Text>
                </View>
              </Tappable>
            )
          })}
        </View>
      </View>

      <View>
        <SectionTitle
          action={
            <View className="rounded-md bg-violet-soft px-2 py-0.5">
              <Text className="text-[10.5px] font-extrabold uppercase tracking-wider text-violet">Demo line</Text>
            </View>
          }
        >
          Customer response
        </SectionTitle>
        <View className="flex-row flex-wrap gap-2">
          {scenarios.map((s) => (
            <Tappable
              key={s}
              accessibilityState={{ selected: scenario === s }}
              onPress={() => onScenario(s)}
              className={cn('h-10 justify-center rounded-pill border px-4', scenario === s ? 'border-ink bg-ink' : 'border-line-strong bg-card active:border-ink-2 active:opacity-100')}
            >
              <Text className={cn('text-[13px] font-bold', scenario === s ? 'text-white' : 'text-ink-2')}>{SCENARIO_LABEL[s]}</Text>
            </Tappable>
          ))}
        </View>
        <Text className="mt-2 text-xs font-medium text-muted">No phone line is connected in this build, so the customer’s side is simulated from this choice.</Text>
      </View>

      <View className="flex-row gap-2.5 rounded-xl border border-line bg-card p-3">
        <Icon as={ShieldCheck} className="size-4 shrink-0 text-success" />
        <Text className="min-w-0 flex-1 text-xs font-medium text-ink-2">
          The assistant introduces itself as automated, never shares an ETA the system doesn’t have, and never confirms prices, refunds or new slots. Anything sensitive is handed to a person.
        </Text>
      </View>

      <Tappable onPress={onStart} className="h-14 w-full flex-row items-center justify-center gap-2 rounded-xl bg-success active:opacity-90">
        <Icon as={Phone} className="size-5 text-white" />
        <Text className="text-base font-extrabold text-white">Start Call</Text>
      </Tappable>
    </Page>
  )
}

function Field({ label, value, wide }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return (
    <View className={cn('min-w-0', wide ? 'w-full' : 'w-[47%]')}>
      <Text className="text-[11px] font-bold uppercase tracking-[0.08em] text-faint">{label}</Text>
      <View className="mt-0.5">{typeof value === 'string' ? <Text className="text-sm font-bold">{value}</Text> : value}</View>
    </View>
  )
}

/* --------------------------------------------------------------- Live call */

type Status = 'connecting' | 'connected' | 'ended'

function useSpeech(muted: boolean) {
  const speak = useCallback(
    (text: string) => {
      if (muted) return
      try {
        // An Indian English voice where the phone has one; the OS falls back
        // to its default English voice otherwise.
        Speech.speak(text, { language: 'en-IN', rate: 1.05 })
      } catch {
        /* no speech on this device */
      }
    },
    [muted]
  )
  const stop = useCallback(() => {
    try {
      void Speech.stop()
    } catch {
      /* ignore */
    }
  }, [])
  return { speak, stop }
}

function LiveCall({ job, purpose, scenario, onEnded }: { job: Job; purpose: CallPurpose; scenario: CallScenario; onEnded: (r: CallRecord) => void }) {
  const [plan] = useState<CallPlan>(() => {
    // An ETA only exists while the technician is driving; otherwise the plan
    // gets none and the assistant says so.
    const eta = job.status === 'on_the_way' ? Math.max(1, Math.round(job.etaMin * (1 - driveProgress(job, Date.now())))) : undefined
    return planCall(job, purpose, scenario, eta)
  })
  const [status, setStatus] = useState<Status>('connecting')
  const [shown, setShown] = useState(0)
  const [speaking, setSpeaking] = useState<CallLine['speaker'] | null>(null)
  const [seconds, setSeconds] = useState(0)
  const [muted, setMuted] = useState(false)
  const { speak, stop } = useSpeech(muted)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const scrollRef = useRef<ScrollView>(null)
  const done = useRef(false)
  const secondsRef = useRef(0)

  const finish = useCallback(
    (count: number, early: boolean) => {
      if (done.current) return
      done.current = true
      timers.current.forEach(clearTimeout)
      stop()
      setSpeaking(null)
      setStatus('ended')
      const transcript = plan.lines.slice(0, count)
      const record: CallRecord = {
        id: uid(),
        jobId: job.id,
        purpose,
        scenario,
        at: new Date().toISOString(),
        durationSec: secondsRef.current,
        transcript,
        result: early ? 'informed' : plan.result,
        summary: early ? { result: 'Call ended early by the technician before the assistant finished.', followUp: true } : plan.summary,
        saved: false,
      }
      timers.current.push(setTimeout(() => onEnded(record), 1100))
    },
    [job.id, onEnded, plan, purpose, scenario, stop]
  )

  // The playback effect runs once; these keep it calling the latest versions.
  const speakRef = useRef(speak)
  const finishRef = useRef(finish)
  useEffect(() => {
    speakRef.current = speak
    finishRef.current = finish
  }, [speak, finish])

  // Play the plan: connect, then each line after the last has been "spoken".
  useEffect(() => {
    let at = 2200
    timers.current.push(setTimeout(() => setStatus('connected'), at))
    plan.lines.forEach((line, i) => {
      const start = at + 350
      const dur = Math.max(1500, line.text.length * 58)
      timers.current.push(
        setTimeout(() => {
          setShown(i + 1)
          setSpeaking(line.speaker)
          if (line.speaker === 'ai') speakRef.current(line.text)
        }, start)
      )
      timers.current.push(setTimeout(() => setSpeaking(null), start + dur))
      at = start + dur
    })
    timers.current.push(setTimeout(() => finishRef.current(plan.lines.length, false), at + 600))
    const t = timers.current
    return () => {
      t.forEach(clearTimeout)
      void Speech.stop()
    }
  }, [plan])

  useEffect(() => {
    if (status !== 'connected') return
    const i = setInterval(() => {
      secondsRef.current += 1
      setSeconds(secondsRef.current)
    }, 1000)
    return () => clearInterval(i)
  }, [status])

  const lines = plan.lines.slice(0, shown)
  const escalated = plan.result === 'escalated' && shown >= plan.lines.length - 2

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60)
    return () => clearTimeout(t)
  }, [shown, escalated])

  return (
    <>
      <Page scrollRef={scrollRef} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Call header */}
        <View className="overflow-hidden rounded-card bg-brand-ink shadow-float">
          <View className="flex-row items-center gap-3 px-4 pt-4">
            <CallMark size={40} />
            <View className="min-w-0 flex-1">
              <Text className="text-[15px] font-extrabold text-white">AI Service Assistant</Text>
              <Text numberOfLines={1} className="text-xs font-semibold text-white/60">
                Calling {job.customer.name} · {PURPOSE_LABEL[purpose]}
              </Text>
            </View>
            <StatusBadge status={status} />
          </View>
          <View className="flex-row items-end justify-between gap-4 px-4 pb-4 pt-3">
            <View>
              <Text className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-white/50">Call duration</Text>
              <Text className="num text-3xl font-extrabold tracking-tight text-white">{clock(seconds)}</Text>
            </View>
            <Waveform speaker={speaking} />
          </View>
          <View className="border-t border-white/10 px-4 py-2">
            <Text className="text-[11.5px] font-semibold text-white/60">
              {status === 'connecting' ? 'Dialling the customer…' : status === 'ended' ? 'Call ended — preparing summary' : speaking === 'ai' ? 'Assistant speaking' : speaking === 'customer' ? 'Customer speaking' : 'Listening'}
            </Text>
          </View>
        </View>

        {/* Transcript */}
        <View className="mt-5">
          <Text className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.08em] text-muted">Live transcript</Text>
          {lines.length === 0 ? (
            <View className="rounded-xl border border-dashed border-line-strong p-4">
              <Text className="text-center text-sm font-medium text-muted">The transcript appears here once the customer answers.</Text>
            </View>
          ) : (
            <View className="gap-2.5">
              {lines.map((l, i) => (
                <Line key={i} line={l} />
              ))}
            </View>
          )}
        </View>

        {escalated && (
          <Animated.View entering={SLIDE_UP} accessibilityRole="alert" className="mt-4 rounded-card border border-danger/30 bg-danger-soft p-4">
            <View className="flex-row items-center gap-2">
              <Icon as={TriangleAlert} className="size-4 text-danger" />
              <Text className="text-sm font-extrabold text-danger">Human Assistance Required</Text>
            </View>
            <Text className="mt-1 text-xs font-medium text-ink-2">{plan.summary.escalation} — outside what the assistant can handle.</Text>
            <View className="mt-3 flex-row gap-2">
              <Tappable
                onPress={() => void Linking.openURL(telHref(job.customer.phone)).catch(() => undefined)}
                className="h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-danger active:opacity-90"
              >
                <Icon as={Phone} className="size-4 text-white" />
                <Text className="text-sm font-extrabold text-white">Take over call</Text>
              </Tappable>
              <Tappable href={'/support' as Href} className="h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-danger/30 bg-card">
                <Icon as={Headset} className="size-4 text-danger" />
                <Text className="text-sm font-extrabold text-danger">Contact Support</Text>
              </Tappable>
            </View>
          </Animated.View>
        )}
      </Page>

      {/* Controls */}
      <ActionDock>
        <Tappable
          onPress={() => {
            setMuted((m) => !m)
            stop()
          }}
          disabled={status === 'ended'}
          accessibilityState={{ selected: muted, disabled: status === 'ended' }}
          className={cn(
            'h-14 flex-1 flex-row items-center justify-center gap-2 rounded-xl border-2',
            muted ? 'border-ink bg-ink' : 'border-line-strong bg-card',
            status === 'ended' && 'opacity-50'
          )}
        >
          <Icon as={muted ? MicOff : Mic} className={cn('size-5', muted ? 'text-white' : 'text-ink')} />
          <Text className={cn('text-[15px] font-extrabold', muted ? 'text-white' : 'text-ink')}>{muted ? 'Unmute' : 'Mute'}</Text>
        </Tappable>
        <Tappable
          disabled={status === 'ended'}
          onPress={() => finish(shown, shown < plan.lines.length)}
          className={cn('h-14 flex-[1.4] flex-row items-center justify-center gap-2 rounded-xl bg-danger active:opacity-90', status === 'ended' && 'opacity-50')}
        >
          <Icon as={PhoneOff} className="size-5 text-white" />
          <Text className="text-[15px] font-extrabold text-white">End Call</Text>
        </Tappable>
      </ActionDock>
    </>
  )
}

function StatusBadge({ status }: { status: Status }) {
  const tone = {
    connecting: { box: 'bg-warning/20', text: 'text-caution-soft', dot: 'bg-caution-soft' },
    connected: { box: 'bg-success/25', text: 'text-live-soft', dot: 'bg-live-soft' },
    ended: { box: 'bg-white/10', text: 'text-white/60', dot: 'bg-white/60' },
  }[status]
  return (
    <View className={cn('flex-row items-center gap-1.5 rounded-pill px-2.5 py-1', tone.box)}>
      {status !== 'ended' ? <Blink className={cn('size-1.5 rounded-full', tone.dot)} /> : <View className={cn('size-1.5 rounded-full', tone.dot)} />}
      <Text className={cn('text-[10.5px] font-extrabold tracking-[0.12em]', tone.text)}>{status.toUpperCase()}</Text>
    </View>
  )
}

/** Bars that move while someone is talking and rest flat in the pauses. */
const BARS = [0.5, 0.8, 0.4, 1, 0.6, 0.9, 0.35, 0.75, 0.55, 1, 0.45, 0.7, 0.3, 0.85, 0.5, 0.65]

function Waveform({ speaker }: { speaker: CallLine['speaker'] | null }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" className="h-10 flex-row items-center gap-[3px]">
      {BARS.map((h, i) => (
        <Bar key={i} height={h} index={i} speaker={speaker} />
      ))}
    </View>
  )
}

function Bar({ height, index, speaker }: { height: number; index: number; speaker: CallLine['speaker'] | null }) {
  const s = useSharedValue(1)
  useEffect(() => {
    if (!speaker) {
      cancelAnimation(s)
      s.value = 1
      return
    }
    // The web's `animate-wave`: scaleY 0.25 → 1 → 0.25, each bar on its own
    // beat so the row ripples rather than pumps.
    const duration = (700 + (index % 4) * 120) / 2
    s.value = 0.25
    s.value = withDelay(
      (index % 5) * 110,
      withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.ease), reduceMotion: ReduceMotion.System }), -1, true),
      ReduceMotion.System
    )
    return () => cancelAnimation(s)
  }, [speaker, index, s])
  const style = useAnimatedStyle(() => ({ transform: [{ scaleY: s.value }] }))
  return (
    <Animated.View
      className={cn('w-[3px] rounded-full', speaker === 'customer' ? 'bg-live-soft' : speaker === 'ai' ? 'bg-white' : 'bg-white/25')}
      style={[{ height: speaker ? height * 40 : 4 }, style]}
    />
  )
}

function Line({ line }: { line: CallLine }) {
  const ai = line.speaker === 'ai'
  return (
    <Animated.View entering={SLIDE_UP} className={cn('flex-row', ai ? 'justify-start' : 'justify-end')}>
      <View className={cn('max-w-[86%] rounded-2xl px-3.5 py-2.5', ai ? 'rounded-tl-md border border-line bg-card' : 'rounded-tr-md bg-success-soft')}>
        <Text className={cn('mb-0.5 text-[10.5px] font-extrabold uppercase tracking-[0.1em]', ai ? 'text-brand' : 'text-success')}>{ai ? 'AI assistant' : 'Customer'}</Text>
        <Text className="text-[14px] font-medium leading-relaxed text-ink">{line.text}</Text>
      </View>
    </Animated.View>
  )
}

/* ----------------------------------------------------------------- Summary */

function Summary({ job, record, onChange, onAgain }: { job: Job; record: CallRecord; onChange: (r: CallRecord) => void; onAgain: () => void }) {
  const store = useStore()
  const [editing, setEditing] = useState(false)
  const [showTranscript, setShowTranscript] = useState(false)
  const s = record.summary
  const tone =
    record.result === 'escalated'
      ? { box: 'bg-danger-soft', text: 'text-danger' }
      : record.result === 'reschedule_requested' || record.result === 'follow_up'
        ? { box: 'bg-warning-soft', text: 'text-warning' }
        : { box: 'bg-success-soft', text: 'text-success' }

  const set = (patch: Partial<CallRecord['summary']>) => onChange({ ...record, saved: false, summary: { ...s, ...patch } })

  return (
    <Page className="gap-4">
      <Card className="overflow-hidden">
        <View className="flex-row items-center justify-between gap-3 border-b border-line p-4">
          <View>
            <Text className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-faint">Call summary</Text>
            <Text className="num text-xs font-semibold text-muted">
              {time(record.at)} · {clock(record.durationSec)}
            </Text>
          </View>
          <View className={cn('rounded-md px-2 py-1', tone.box)}>
            <Text className={cn('text-[11px] font-extrabold uppercase tracking-wider', tone.text)}>{RESULT_LABEL[record.result]}</Text>
          </View>
        </View>
        <View>
          <Row first label="Customer" value={job.customer.name} />
          <Row label="Brand" value={BRAND_LABEL[job.brand]} />
          <Row label="Appliance" value={APPLIANCE_LABEL[job.appliance]} />
          <Row label="Purpose" value={PURPOSE_LABEL[record.purpose]} />
          <Row
            label="Result"
            value={
              editing ? (
                <TextInput
                  value={s.result}
                  onChangeText={(v) => set({ result: v })}
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                  placeholderTextColor={COLORS.faint}
                  className={cn(inputClass, 'py-2 text-sm')}
                />
              ) : (
                s.result
              )
            }
          />
          {s.eta ? <Row label="ETA" value={s.eta} /> : null}
          {s.request || editing ? (
            <Row
              label="Customer request"
              value={
                editing ? (
                  <TextInput value={s.request ?? ''} onChangeText={(v) => set({ request: v })} placeholder="None" placeholderTextColor={COLORS.faint} className={cn(inputClass, 'py-2 text-sm')} />
                ) : (
                  s.request
                )
              }
            />
          ) : null}
          {s.reschedule ? (
            <Row
              label="Reschedule"
              value={
                <View>
                  <View className="mb-1 self-start rounded-md bg-warning-soft px-2 py-0.5">
                    <Text className="text-[10.5px] font-extrabold tracking-wider text-warning">RESCHEDULING REQUESTED</Text>
                  </View>
                  <Text className="text-sm font-semibold">
                    {s.reschedule.date} · {s.reschedule.time}
                  </Text>
                  <Text className="text-xs font-medium text-muted">Reason: {s.reschedule.reason} · awaiting slot confirmation</Text>
                </View>
              }
            />
          ) : null}
          {s.satisfaction ? <Row label="Satisfaction" value={s.satisfaction} /> : null}
          {s.resolved !== undefined ? <Row label="Issue resolved" value={<YesNo yes={s.resolved} />} /> : null}
          {s.escalation ? <Row label="Escalation" value={<Text className="text-sm font-extrabold text-danger">{s.escalation}</Text>} /> : null}
          <Row
            label="Follow-up"
            value={editing ? <Toggle checked={s.followUp} onChange={(v) => set({ followUp: v })} label="Follow-up required" /> : s.followUp ? 'Required' : 'Not required'}
          />
        </View>
        <Tappable
          onPress={() => setShowTranscript((v) => !v)}
          accessibilityState={{ expanded: showTranscript }}
          className="w-full flex-row items-center justify-between border-t border-line px-4 py-3"
        >
          <Text className="text-sm font-extrabold text-brand">Transcript · {record.transcript.length} lines</Text>
          <View style={showTranscript ? { transform: [{ rotate: '180deg' }] } : undefined}>
            <Icon as={ChevronDown} className="size-4 text-brand" />
          </View>
        </Tappable>
        {showTranscript && (
          <View className="gap-2 border-t border-line bg-canvas/60 p-4">
            {record.transcript.map((l, i) => (
              <Line key={i} line={l} />
            ))}
          </View>
        )}
      </Card>

      {record.result === 'escalated' && (
        <View className="flex-row gap-2">
          <Tappable
            onPress={() => void Linking.openURL(telHref(job.customer.phone)).catch(() => undefined)}
            className="h-12 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-line-strong bg-card"
          >
            <Icon as={Phone} className="size-4 text-success" />
            <Text className="text-sm font-extrabold">Call customer</Text>
          </Tappable>
          <Tappable href={'/support' as Href} className="h-12 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-line-strong bg-card">
            <Icon as={Headset} className="size-4 text-brand" />
            <Text className="text-sm font-extrabold">Contact Support</Text>
          </Tappable>
        </View>
      )}

      <View className="flex-row gap-2">
        <Tappable onPress={() => setEditing((e) => !e)} className="h-12 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border-2 border-line-strong bg-card">
          <Icon as={Pencil} className="size-4 text-ink" />
          <Text className="text-sm font-extrabold">{editing ? 'Done' : 'Edit'}</Text>
        </Tappable>
        <Tappable
          onPress={() => {
            const saved = { ...record, saved: true }
            store.saveCall(saved)
            onChange(saved)
            setEditing(false)
          }}
          className={cn('h-12 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl', record.saved ? 'bg-success' : 'bg-brand active:bg-brand-deep active:opacity-100')}
        >
          {record.saved ? <Icon as={Check} className="size-4 text-white" /> : null}
          <Text className="text-sm font-extrabold text-white">{record.saved ? 'Saved' : 'Save to Job'}</Text>
        </Tappable>
        <Tappable onPress={onAgain} className="h-12 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border-2 border-line-strong bg-card">
          <Icon as={RotateCcw} className="size-4 text-ink" />
          <Text className="text-sm font-extrabold">Call Again</Text>
        </Tappable>
      </View>
      {record.saved && (
        <Tappable href={stepHref('detail', job.id)} className="items-center py-1">
          <Text className="text-center text-sm font-bold text-brand">Back to {applianceTitle(job.brand, job.appliance)}</Text>
        </Tappable>
      )}
    </Page>
  )
}

function Row({ label, value, first }: { label: string; value: React.ReactNode; first?: boolean }) {
  return (
    <View className={cn('flex-row gap-3 px-4 py-3', !first && 'border-t border-line')}>
      <Text className="w-[7.5rem] shrink-0 text-[11.5px] font-bold uppercase tracking-[0.06em] text-faint">{label}</Text>
      <View className="min-w-0 flex-1">{typeof value === 'string' ? <Text className="text-sm font-semibold">{value}</Text> : value}</View>
    </View>
  )
}

function YesNo({ yes }: { yes: boolean }) {
  return (
    <View className={cn('self-start rounded-md px-2 py-0.5', yes ? 'bg-success-soft' : 'bg-danger-soft')}>
      <Text className={cn('text-[11px] font-extrabold', yes ? 'text-success' : 'text-danger')}>{yes ? 'YES' : 'NO'}</Text>
    </View>
  )
}
