import { useEffect, useState } from 'react'
import { Modal, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, {
  Easing,
  FadeInDown,
  ReduceMotion,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import Svg, { Circle } from 'react-native-svg'
import { router, usePathname } from 'expo-router'
import { Clock, MapPin, Navigation, X } from 'lucide-react-native'
import { applianceTitle, inr } from '@/lib/catalog'
import { cn } from '@/lib/cn'
import { ago, time } from '@/lib/format'
import { jobHref, stepHref } from '@/lib/routes'
import type { Job } from '@/lib/types'
import { chime } from '@/lib/chime'
import { mayAlert } from '@/lib/availability'
import { useStore, useTick } from '@/lib/store'
import { ApplianceGlyph, BrandTag } from './glyphs'
import { Icon, PriorityBadge, Tappable, Text } from './ui'

const WINDOW = 30

/**
 * Requests already put in front of the technician this session. Held for the
 * life of the app process — the web kept them in sessionStorage so a reload
 * didn't throw the same alert up again; an app has no reload.
 */
const shown = new Set<string>()
const session = { primed: false }

function remember(id: string) {
  shown.add(id)
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle)
const EASE = Easing.bezier(0.22, 0.61, 0.36, 1)

/**
 * The takeover for a request that has just come in. It is the one thing in
 * the app allowed to interrupt: a request left unanswered goes to the next
 * technician, so it has to be impossible to miss and quick to answer — the
 * two answers are the two biggest targets on the screen.
 *
 * Letting the timer run out is not a rejection. The request stays in the
 * Jobs list until dispatch reassigns it.
 */
export function IncomingRequest() {
  const { jobs, online, settings } = useStore()
  const pathname = usePathname()
  // Mirrored into state: the React Compiler memoises what this renders from
  // its inputs, and a mutation of the module Set alone is not an input.
  const [seen, setSeen] = useState<ReadonlySet<string>>(() => new Set(shown))
  const see = (ids: string[]) => {
    ids.forEach(remember)
    setSeen(new Set(shown))
  }
  // Re-check each minute so a shift starting mid-session starts the alerts.
  const now = useTick(60_000)

  const byUrgency = (a: Job, b: Job) =>
    Number(b.priority === 'emergency') - Number(a.priority === 'emergency') || b.requestedAt.localeCompare(a.requestedAt)

  // On first load only the most urgent waiting request interrupts; the rest
  // are already on Home. Anything that arrives after that gets its own turn.
  // (The first render already shows the most urgent one, so this can wait
  // for an effect.)
  useEffect(() => {
    if (session.primed || !jobs.length) return
    session.primed = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    see(jobs.filter((j) => j.status === 'request').sort(byUrgency).slice(1).map((j) => j.id))
  }, [jobs])

  // Settings decide what may interrupt: each kind needs its notification
  // switch, and availability (online, working hours, not on break) — with
  // emergencies allowed through at any hour if the technician chose that.
  // Held-back requests still wait in Jobs.
  const at = new Date(now)
  const interrupts = (j: Job) =>
    j.priority === 'emergency' ? settings.notify.emergency && mayAlert(settings, online, true, at) : settings.notify.requests && mayAlert(settings, online, false, at)
  const pending = jobs.filter((j) => j.status === 'request' && !seen.has(j.id) && interrupts(j)).sort(byUrgency)
  const job = online && !pathname.startsWith('/request') ? pending[0] : undefined
  if (!job) return null

  return (
    <Takeover
      key={job.id}
      job={job}
      onDone={() => see([job.id])}
    />
  )
}

/** Keyed by job, so each request starts its own fresh countdown. */
function Takeover({ job, onDone }: { job: Job; onDone: () => void }) {
  const { accept, reject, settings } = useStore()
  const insets = useSafeAreaInsets()
  const [left, setLeft] = useState(WINDOW)
  const dismiss = onDone
  const sound = settings.notify.sound

  useEffect(() => {
    if (sound) chime(job.priority === 'emergency')
  }, [sound, job.priority])

  useEffect(() => {
    const i = setInterval(() => setLeft((l) => l - 1), 1000)
    return () => clearInterval(i)
  }, [])

  useEffect(() => {
    if (left <= 0) onDone()
  }, [left, onDone])

  const emergency = job.priority === 'emergency'
  const r = 22
  const c = 2 * Math.PI * r

  // The ring runs down smoothly between the once-a-second number ticks.
  const offset = useSharedValue(0)
  useEffect(() => {
    offset.value = withTiming(c * (1 - Math.max(left, 0) / WINDOW), { duration: 1000, easing: Easing.linear, reduceMotion: ReduceMotion.System })
  }, [left, c, offset])
  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: offset.value }))

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={dismiss}>
      <View className="flex-1 justify-end bg-ink/60">
        <Animated.View
          entering={FadeInDown.duration(280).easing(EASE.factory()).reduceMotion(ReduceMotion.System)}
          accessibilityRole="alert"
          accessibilityViewIsModal
          accessibilityLabel="New Service Request"
          className="w-full overflow-hidden rounded-t-3xl bg-card shadow-float"
        >
          <View className={cn('relative px-5 pb-5 pt-5', emergency ? 'bg-[#b3261e]' : 'bg-brand-ink')}>
            <Tappable
              onPress={dismiss}
              accessibilityLabel="Decide later"
              className="absolute right-3 top-3 z-10 size-10 items-center justify-center rounded-full active:bg-white/10 active:opacity-100"
            >
              <Icon as={X} className="size-5 text-white/70" />
            </Tappable>
            <View className="flex-row items-center gap-4">
              <View className="size-14 items-center justify-center">
                <PulseRing className="absolute inset-2 rounded-full bg-white/30" />
                <Svg viewBox="0 0 52 52" width={56} height={56} style={{ position: 'absolute', top: 0, left: 0, transform: [{ rotate: '-90deg' }] }}>
                  <Circle cx="26" cy="26" r={r} fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="3" />
                  <AnimatedCircle
                    cx="26"
                    cy="26"
                    r={r}
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={c}
                    animatedProps={ringProps}
                  />
                </Svg>
                <Text className="num text-lg font-extrabold text-white">{Math.max(left, 0)}</Text>
              </View>
              <View className="flex-1 pr-8">
                <Text className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/70">
                  {emergency ? 'Emergency · respond now' : 'Incoming'}
                </Text>
                <Text accessibilityRole="header" className="text-xl font-extrabold tracking-tight text-white">
                  New Service Request
                </Text>
                <Text className="text-xs font-semibold text-white/70">Received {ago(job.requestedAt)}</Text>
              </View>
            </View>
          </View>

          <View className="p-5" style={{ paddingBottom: 20 + insets.bottom }}>
            <View className="flex-row items-start gap-3">
              <View className={cn('size-12 shrink-0 items-center justify-center rounded-xl', emergency ? 'bg-danger-soft' : 'bg-brand-soft')}>
                <ApplianceGlyph appliance={job.appliance} className={cn('size-7', emergency ? 'text-danger' : 'text-brand')} />
              </View>
              <View className="min-w-0 flex-1">
                <View className="flex-row flex-wrap items-center gap-1.5">
                  <BrandTag brand={job.brand} />
                  <PriorityBadge priority={job.priority} />
                </View>
                <Text className="mt-1 text-lg font-extrabold leading-tight tracking-tight">{applianceTitle(job.brand, job.appliance)}</Text>
                <Text className="text-sm font-semibold text-ink-2">“{job.issue}”</Text>
              </View>
            </View>

            <View className="mt-4 flex-row rounded-xl border border-line bg-canvas">
              <View className="flex-1 items-center px-2 py-2.5">
                <Text className="text-[10.5px] font-bold uppercase tracking-wider text-faint">Distance</Text>
                <View className="mt-0.5 flex-row items-center justify-center gap-1">
                  <Icon as={Navigation} className="size-3.5 text-brand" />
                  <Text className="num text-[15px] font-extrabold">{job.distanceKm} km</Text>
                </View>
              </View>
              <View className="flex-1 items-center border-l border-line px-2 py-2.5">
                <Text className="text-[10.5px] font-bold uppercase tracking-wider text-faint">Requested</Text>
                <View className="mt-0.5 flex-row items-center justify-center gap-1">
                  <Icon as={Clock} className="size-3.5 text-brand" />
                  <Text className="num text-[15px] font-extrabold">{emergency ? 'ASAP' : time(job.scheduledAt)}</Text>
                </View>
              </View>
              <View className="flex-1 items-center border-l border-line px-2 py-2.5">
                <Text className="text-[10.5px] font-bold uppercase tracking-wider text-faint">Est. fee</Text>
                <Text className="num mt-0.5 text-[15px] font-extrabold text-success">{inr(job.estFee)}</Text>
              </View>
            </View>

            <View className="mt-3 flex-row items-center gap-1.5">
              <Icon as={MapPin} className="size-4 shrink-0 text-muted" />
              <Text numberOfLines={1} className="flex-1 text-sm font-semibold text-muted">
                <Text className="text-sm font-semibold text-ink">{job.customer.name}</Text> · {job.customer.area}
              </Text>
              <Tappable
                onPress={() => {
                  dismiss()
                  router.push(jobHref(job))
                }}
                hitSlop={8}
                className="shrink-0"
              >
                <Text className="text-xs font-bold text-brand">Full details</Text>
              </Tappable>
            </View>

            <View className="mt-5 flex-row gap-2.5">
              <Tappable
                onPress={() => {
                  reject(job.id)
                  dismiss()
                }}
                className="h-14 flex-1 items-center justify-center rounded-xl border-2 border-line-strong active:border-danger"
              >
                <Text className="text-[15px] font-extrabold text-ink-2">REJECT</Text>
              </Tappable>
              <Tappable
                onPress={() => {
                  accept(job.id)
                  dismiss()
                  router.push(stepHref('detail', job.id))
                }}
                className="h-14 flex-[1.6] items-center justify-center rounded-xl bg-success active:opacity-90"
              >
                <Text className="text-[15px] font-extrabold text-white">ACCEPT JOB</Text>
              </Tappable>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  )
}

/** The web's `animate-pulse-ring`: a ring that swells out from the timer and fades. */
function PulseRing({ className }: { className?: string }) {
  const p = useSharedValue(0)
  useEffect(() => {
    p.value = withRepeat(withTiming(1, { duration: 1800, easing: EASE, reduceMotion: ReduceMotion.System }), -1)
    return () => cancelAnimation(p)
  }, [p])
  const style = useAnimatedStyle(() => ({ opacity: 0.7 * (1 - p.value), transform: [{ scale: 0.8 + 1.6 * p.value }] }))
  return <Animated.View pointerEvents="none" className={className} style={style} />
}
