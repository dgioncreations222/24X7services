import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, {
  Easing,
  FadeInDown,
  ReduceMotion,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import { Coffee, Radar, ShieldAlert, SlidersHorizontal } from 'lucide-react-native'
import { DAYS, RADIUS_STEPS, WEEKDAYS, availability, range12, type Availability } from '@/lib/availability'
import { cn } from '@/lib/cn'
import { useStore, useTick } from '@/lib/store'
import type { DayKey, DayHours } from '@/lib/types'
import { TimeField } from './TimeField'
import { Blink, Card, Icon, SectionTitle, Tappable, Text, Toggle } from './ui'

export function useAvailability(): Availability {
  const { settings, online } = useStore()
  const now = useTick(60_000)
  return availability(settings, online, new Date(now))
}

/** Green when taking jobs, amber when online but held back, grey when off. */
export function tone(a: Availability) {
  if (a.state === 'online') return { dot: 'bg-success', text: 'text-success', soft: 'bg-success-soft', ring: 'border-success/30' }
  if (a.state === 'offline') return { dot: 'bg-faint', text: 'text-muted', soft: 'bg-canvas', ring: 'border-line-strong' }
  return { dot: 'bg-warning', text: 'text-warning', soft: 'bg-warning-soft', ring: 'border-warning/30' }
}

/** The web's `animate-pulse-ring`: a ring that swells out of the dot and fades. */
function PulseRing({ className }: { className?: string }) {
  const p = useSharedValue(0)
  useEffect(() => {
    p.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.bezier(0.22, 0.61, 0.36, 1), reduceMotion: ReduceMotion.System }), -1)
    return () => cancelAnimation(p)
  }, [p])
  const style = useAnimatedStyle(() => ({ opacity: 0.7 * (1 - p.value), transform: [{ scale: 0.8 + 1.6 * p.value }] }))
  return <Animated.View pointerEvents="none" className={className} style={style} />
}

/**
 * Settings → Availability & Schedule. Everything that decides whether new
 * work reaches the technician, in one place: the switch, the week, the break,
 * the radius. None of it touches jobs already accepted.
 */
export function AvailabilitySettings() {
  const store = useStore()
  const { settings: s, updateSettings } = store
  const a = useAvailability()
  const c = tone(a)
  const waiting = store.jobs.filter((j) => j.status === 'request').length

  const setDay = (key: DayKey, patch: Partial<DayHours>) => updateSettings((cur) => ({ schedule: { ...cur.schedule, [key]: { ...cur.schedule[key], ...patch } } }))
  const copyMonday = () =>
    updateSettings((cur) => ({
      schedule: { ...cur.schedule, ...Object.fromEntries(WEEKDAYS.map((k) => [k, { ...cur.schedule.mon }])) },
    }))
  const weekdaysMatch = WEEKDAYS.every((k) => {
    const d = s.schedule[k]
    return d.on === s.schedule.mon.on && d.start === s.schedule.mon.start && d.end === s.schedule.mon.end
  })

  return (
    <View className="gap-4">
      <SectionTitle className="mb-0">Availability & Schedule</SectionTitle>

      {/* Status */}
      <Card className={cn('overflow-hidden border', c.ring)}>
        <View className={cn('flex-row items-center gap-3 p-4', c.soft)}>
          <View className="size-3.5 shrink-0">
            {a.state === 'online' && <PulseRing className="absolute inset-0 rounded-full bg-success" />}
            <View className={cn('size-3.5 rounded-full', c.dot)} />
          </View>
          <View className="min-w-0 flex-1">
            <Text className={cn('text-lg font-extrabold uppercase leading-tight tracking-wide', c.text)}>{store.online ? 'Online' : 'Offline'}</Text>
            <Text className="text-sm font-semibold text-ink-2">{a.detail}</Text>
          </View>
          <Toggle checked={store.online} onChange={store.setOnline} label="Online for new jobs" tone="success" size="lg" />
        </View>
        <View className="flex-row flex-wrap justify-between gap-y-px bg-line">
          <Summary label="Working today" value={a.today} className="w-[49.85%]" />
          <Summary label="Break" value={s.breakTime.on ? range12(s.breakTime.start, s.breakTime.end) : 'No break'} className="w-[49.85%]" />
          <Summary label="Service radius" value={`${s.radiusKm} km`} className="w-[49.85%]" />
          <Summary
            label="Jobs"
            value={a.accepting ? 'Accepting new requests' : 'Not accepting new requests'}
            tone={a.accepting ? 'text-success' : 'text-muted'}
            className="w-[49.85%]"
          />
        </View>
      </Card>

      {/* Week */}
      <Card>
        <View className="flex-row items-center justify-between gap-3 border-b border-line px-4 py-3">
          <Text className="text-sm font-extrabold">Working schedule</Text>
          <Tappable onPress={copyMonday} disabled={weekdaysMatch} hitSlop={8} className="shrink">
            <Text className={cn('text-right text-xs font-bold', weekdaysMatch ? 'text-faint' : 'text-brand')}>
              {weekdaysMatch ? 'Weekdays match' : 'Apply Monday to all weekdays'}
            </Text>
          </Tappable>
        </View>
        <View>
          {DAYS.map((d, i) => {
            const day = s.schedule[d.key]
            return (
              <View key={d.key} className={cn('gap-2 px-4 py-2.5', i > 0 && 'border-t border-line')}>
                <View className="flex-row items-center gap-2">
                  <Text className="w-11 shrink-0 text-sm font-extrabold">{d.short}</Text>
                  <View className="shrink-0 flex-row rounded-lg bg-ink/[0.06] p-0.5" accessibilityLabel={`${d.label} working or off`}>
                    {(['Working', 'Off'] as const).map((opt) => {
                      const active = (opt === 'Working') === day.on
                      return (
                        <Tappable
                          key={opt}
                          accessibilityState={{ selected: active }}
                          onPress={() => setDay(d.key, { on: opt === 'Working' })}
                          className={cn('h-8 items-center justify-center rounded-md px-2.5', active && 'bg-card shadow-card')}
                        >
                          <Text className={cn('text-[12px] font-bold', active ? 'text-ink' : 'text-muted')}>{opt}</Text>
                        </Tappable>
                      )
                    })}
                  </View>
                  {!day.on && <Text className="flex-1 text-right text-sm font-semibold text-faint">Day off</Text>}
                </View>
                {day.on && (
                  // Times drop to their own full-width line on a phone.
                  <View className="min-w-0 flex-row items-center gap-1.5">
                    <View className="flex-1">
                      <TimeField compact label={`${d.label} start`} value={day.start} onChange={(v) => setDay(d.key, { start: v })} />
                    </View>
                    <Text className="text-xs font-bold text-faint">–</Text>
                    <View className="flex-1">
                      <TimeField compact label={`${d.label} end`} value={day.end} onChange={(v) => setDay(d.key, { end: v })} />
                    </View>
                  </View>
                )}
              </View>
            )
          })}
        </View>
      </Card>

      {/* Break */}
      <Card className="p-4">
        <View className="flex-row items-center gap-3">
          <View className="size-9 shrink-0 items-center justify-center rounded-lg bg-canvas">
            <Icon as={Coffee} className="size-4 text-ink-2" />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-sm font-extrabold">Break time</Text>
            <Text className="text-xs font-medium text-muted">{s.breakTime.on ? 'Not accepting new jobs during your break' : 'No daily break set'}</Text>
          </View>
          <Toggle checked={s.breakTime.on} onChange={(v) => updateSettings((cur) => ({ breakTime: { ...cur.breakTime, on: v } }))} label="Daily break" />
        </View>
        {s.breakTime.on && (
          <View className="mt-3 flex-row items-center gap-2">
            <View className="flex-1">
              <TimeField compact label="Break start" value={s.breakTime.start} onChange={(v) => updateSettings((cur) => ({ breakTime: { ...cur.breakTime, start: v } }))} />
            </View>
            <Text className="text-xs font-bold text-faint">–</Text>
            <View className="flex-1">
              <TimeField compact label="Break end" value={s.breakTime.end} onChange={(v) => updateSettings((cur) => ({ breakTime: { ...cur.breakTime, end: v } }))} />
            </View>
          </View>
        )}
        <Text className="mt-3 text-[11.5px] font-medium text-faint">Appointments you’ve already accepted are not affected.</Text>
      </Card>

      {/* Radius */}
      <Card className="p-4">
        <View className="flex-row items-center gap-3">
          <View className="size-9 shrink-0 items-center justify-center rounded-lg bg-canvas">
            <Icon as={Radar} className="size-4 text-ink-2" />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-sm font-extrabold">Service radius</Text>
            <Text className="text-xs font-medium text-muted">You may receive service requests within your selected radius.</Text>
          </View>
          <Text className="num text-lg font-extrabold text-brand">{s.radiusKm} km</Text>
        </View>
        <View className="mt-3 flex-row gap-1.5" accessibilityRole="radiogroup" accessibilityLabel="Service radius">
          {RADIUS_STEPS.map((km) => {
            const on = s.radiusKm === km
            return (
              <Tappable
                key={km}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => updateSettings({ radiusKm: km })}
                className={cn(
                  'h-11 flex-1 items-center justify-center rounded-xl border',
                  on ? 'border-brand bg-brand' : 'border-line-strong bg-card active:border-brand'
                )}
              >
                <Text className={cn('num text-sm font-extrabold', on ? 'text-white' : 'text-ink-2')}>{km} km</Text>
              </Tappable>
            )
          })}
        </View>
        <Text className="num mt-2.5 text-xs font-semibold text-muted">
          {waiting === 0 ? `No requests waiting within ${s.radiusKm} km` : `${waiting} request${waiting === 1 ? '' : 's'} waiting within ${s.radiusKm} km`}
        </Text>
      </Card>

      {/* Preferences */}
      <Card className="flex-row items-center gap-3 p-4">
        <View className="size-9 shrink-0 items-center justify-center rounded-lg bg-canvas">
          <Icon as={ShieldAlert} className="size-4 text-ink-2" />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-sm font-extrabold">Emergencies outside hours</Text>
          <Text className="text-xs font-medium text-muted">
            {s.emergencyAnyTime ? 'Emergency requests reach you on breaks and days off while online' : 'Emergencies follow your working hours too'}
          </Text>
        </View>
        <Toggle checked={s.emergencyAnyTime} onChange={(v) => updateSettings({ emergencyAnyTime: v })} label="Emergencies outside working hours" />
      </Card>
    </View>
  )
}

function Summary({ label, value, tone: t, className }: { label: string; value: string; tone?: string; className?: string }) {
  return (
    <View className={cn('bg-card px-4 py-3', className)}>
      <Text className="text-[10.5px] font-bold uppercase tracking-wider text-faint">{label}</Text>
      <Text className={cn('num mt-0.5 text-[13.5px] font-extrabold', t)}>{value}</Text>
    </View>
  )
}

/** The compact read-only card for Profile, with a way into Settings. */
export function AvailabilitySummary() {
  const store = useStore()
  const a = useAvailability()
  const c = tone(a)
  const s = store.settings
  return (
    <Card className="overflow-hidden">
      <View className="flex-row items-center gap-3 p-4">
        {a.state === 'online' ? (
          <Blink className={cn('size-3 shrink-0 rounded-full', c.dot)} />
        ) : (
          <View className={cn('size-3 shrink-0 rounded-full', c.dot)} />
        )}
        <View className="min-w-0 flex-1">
          <Text className={cn('text-sm font-extrabold uppercase tracking-wide', c.text)}>{a.headline}</Text>
          <Text className="text-xs font-medium text-muted">{a.detail}</Text>
        </View>
        <Toggle checked={store.online} onChange={store.setOnline} label="Online for new jobs" tone="success" size="lg" />
      </View>
      <View className="flex-row gap-px border-t border-line bg-line">
        <Summary label="Today" value={a.today} className="flex-1 px-3" />
        <Summary label="Break" value={s.breakTime.on ? range12(s.breakTime.start, s.breakTime.end) : 'None'} className="flex-1 px-3" />
        <Summary label="Radius" value={`${s.radiusKm} km`} className="flex-1 px-3" />
      </View>
      <Tappable
        href="/settings"
        className="flex-row items-center justify-center gap-1.5 border-t border-line py-3 active:bg-brand-soft active:opacity-100"
      >
        <Icon as={SlidersHorizontal} className="size-4 text-brand" />
        <Text className="text-sm font-extrabold text-brand">Manage availability</Text>
      </Tappable>
    </Card>
  )
}

/**
 * Confirms every switch between online and offline, wherever it was flipped
 * — dashboard, drawer, Settings or Profile. Mounted once in the app shell.
 */
export function AvailabilityToast() {
  const { online } = useStore()
  const insets = useSafeAreaInsets()
  const [prev, setPrev] = useState(online)
  const [msg, setMsg] = useState<{ text: string; off: boolean } | null>(null)

  if (online !== prev) {
    setPrev(online)
    setMsg(
      online
        ? { text: 'You’re online and receiving new jobs.', off: false }
        : { text: 'You’re now offline and will not receive new service requests. Accepted jobs stay with you.', off: true }
    )
  }

  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(null), 3500)
    return () => clearTimeout(t)
  }, [msg])

  if (!msg) return null
  return (
    <View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      className="absolute inset-x-0 z-[85] items-center px-4"
      style={{ top: insets.top + 12, elevation: 85 }}
    >
      <Animated.View
        key={msg.text}
        entering={FadeInDown.duration(280).easing(Easing.bezier(0.22, 0.61, 0.36, 1).factory()).reduceMotion(ReduceMotion.System)}
        accessibilityRole="alert"
        className="max-w-md flex-row items-start gap-2.5 rounded-xl bg-ink px-4 py-3 shadow-float"
      >
        <View className={cn('mt-1.5 size-2 shrink-0 rounded-full', msg.off ? 'bg-white/50' : 'bg-live-bright')} />
        <Text className="shrink text-sm font-bold text-white">{msg.text}</Text>
      </Animated.View>
    </View>
  )
}
