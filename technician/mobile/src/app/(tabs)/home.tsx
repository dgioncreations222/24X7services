import { useEffect, useState } from 'react'
import { Linking, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { Easing, ReduceMotion, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated'
import { StatusBar } from 'expo-status-bar'
import { useIsFocused, type Href } from 'expo-router'
import { Bell, ChevronRight, MessageCircle, Navigation, Phone, PowerOff, Search, SearchX, Siren, Star, X } from 'lucide-react-native'
import { useAvailability } from '@/components/Availability'
import { ApplianceGlyph } from '@/components/glyphs'
import { JobCard } from '@/components/JobCard'
import { MenuButton } from '@/components/menu'
import { FlowBar } from '@/components/Timeline'
import { Avatar, Blink, Card, Empty, Icon, Inherit, Page, SectionTitle, StatusChip, Tappable, Text, Toggle } from '@/components/ui'
import { applianceTitle, inr } from '@/lib/catalog'
import { cn } from '@/lib/cn'
import { dayLabel, directionsHref, earned, isToday, matchesQuery, telHref, time } from '@/lib/format'
import { jobHref, stepHref } from '@/lib/routes'
import { IN_PROGRESS, NEXT_ACTION } from '@/lib/status'
import { useStore, useTick } from '@/lib/store'
import type { Job } from '@/lib/types'

export default function HomeScreen() {
  const store = useStore()
  useTick(30_000)
  const { jobs, tech, online } = store
  const avail = useAvailability()
  const [query, setQuery] = useState('')
  const insets = useSafeAreaInsets()
  // The navy header wants light status-bar icons, but only while Home is on screen.
  const focused = useIsFocused()

  const requests = jobs
    .filter((j) => j.status === 'request')
    .sort((a, b) => Number(b.priority === 'emergency') - Number(a.priority === 'emergency') || b.requestedAt.localeCompare(a.requestedAt))
  const today = jobs.filter((j) => isToday(j.scheduledAt) && j.status !== 'request' && j.status !== 'rejected')
  const schedule = [...today].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
  const current =
    jobs.find((j) => IN_PROGRESS.includes(j.status)) ?? jobs.find((j) => j.status === 'on_the_way') ?? schedule.find((j) => j.status === 'accepted')
  const unread = store.notices.filter((n) => !n.read).length
  const emergencies = requests.filter((j) => j.priority === 'emergency')
  const emergencyWaiting = emergencies[0]
  // The next visit after the one in hand, and the last one finished.
  const upcoming = schedule.find((j) => (j.status === 'accepted' || j.status === 'assigned') && j.id !== current?.id)
  const recent = [...jobs].filter((j) => j.status === 'closed').sort((a, b) => (b.log.closed ?? b.scheduledAt).localeCompare(a.log.closed ?? a.scheduledAt))[0]

  const stats = {
    today: today.filter((j) => j.status !== 'cancelled').length,
    pending: jobs.filter((j) => j.status === 'assigned').length + requests.length,
    accepted: jobs.filter((j) => j.status === 'accepted').length,
    progress: jobs.filter((j) => j.status === 'on_the_way' || IN_PROGRESS.includes(j.status)).length,
    done: today.filter((j) => j.status === 'closed').length,
    earnings: today.reduce((s, j) => s + earned(j), 0),
  }
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <Page className="px-0 pt-0">
      {focused && <StatusBar style="light" />}
      {/* Header */}
      <View className="bg-brand-ink px-4 pb-4 pt-3" style={{ paddingTop: insets.top + 12 }}>
        <View className="flex-row items-center gap-3">
          <MenuButton inverted />
          <Tappable href="/profile" className="relative shrink-0">
            <Avatar name={tech.name} photo={tech.photo} size={42} className="border-2 border-white/15" />
            <View className={cn('absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-brand-ink', online ? 'bg-[#22c55e]' : 'bg-faint')} />
          </Tappable>
          <View className="min-w-0 flex-1">
            <Text numberOfLines={1} className="text-[15px] font-extrabold leading-tight text-white">
              {tech.name}
            </Text>
            <Text numberOfLines={1} className="num mt-0.5 text-[11.5px] font-semibold text-white/55">
              {tech.id} · {greeting}
            </Text>
          </View>
          <Tappable
            href="/notifications"
            accessibilityLabel={`Notifications, ${unread} unread`}
            className="relative size-10 shrink-0 items-center justify-center rounded-full bg-white/10 active:bg-white/15 active:opacity-100"
          >
            <Icon as={Bell} className="size-[18px] text-white" />
            {unread > 0 && (
              <View className="absolute -right-1 -top-1 h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-brand-ink bg-danger px-1">
                <Text className="num text-[10px] font-extrabold leading-none text-white">{unread}</Text>
              </View>
            )}
          </Tappable>
        </View>

        {/* Your availability: status, today's hours, radius — one tap to switch. */}
        <View
          className={cn(
            'mt-3.5 rounded-xl border',
            avail.state === 'online' ? 'border-[#22c55e]/25 bg-[#22c55e]/[0.12]' : avail.state === 'offline' ? 'border-white/10 bg-white/[0.06]' : 'border-[#f59e0b]/25 bg-[#f59e0b]/[0.12]'
          )}
        >
          <View className="flex-row items-center gap-3 px-3 pb-2 pt-2.5">
            {avail.state === 'online' ? (
              <Blink className="size-2 shrink-0 rounded-full bg-[#4ade80]" />
            ) : (
              <View className={cn('size-2 shrink-0 rounded-full', avail.state === 'offline' ? 'bg-white/40' : 'bg-[#fbbf24]')} />
            )}
            <View className="min-w-0 flex-1">
              <Text className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-white/45">Your availability</Text>
              <Inherit
                className={cn(
                  'text-[13px] font-extrabold leading-tight',
                  avail.state === 'online' ? 'text-[#86efac]' : avail.state === 'offline' ? 'text-white/70' : 'text-[#fcd34d]'
                )}
              >
                {/* A nested Text starts from the base style, so the colour reaches it through Inherit. */}
                <Text numberOfLines={1}>
                  {avail.headline.toUpperCase()} · <Text className="font-semibold">{avail.detail}</Text>
                </Text>
              </Inherit>
            </View>
            <Toggle checked={online} onChange={store.setOnline} label="Availability" tone="success" />
          </View>
          <View className="flex-row items-center gap-3 border-t border-white/10 px-3 py-2">
            <Text numberOfLines={1} className="num min-w-0 shrink text-[11.5px] font-semibold text-white/60">
              Today {avail.today} · {store.settings.radiusKm} km radius
            </Text>
            <Tappable href={'/settings' as Href} className="ml-auto shrink-0">
              <Text className="text-[11.5px] font-extrabold text-white/85">Manage</Text>
            </Tappable>
          </View>
        </View>

        <View className="mt-4 flex-row">
          <Tappable href="/earnings" className="flex-1 pr-3">
            <Text className="text-[11px] font-semibold text-white/55">Earned today</Text>
            <Text className="num mt-0.5 text-[19px] font-extrabold leading-tight tracking-tight text-white">{inr(stats.earnings)}</Text>
          </Tappable>
          <Tappable href="/profile" className="flex-1 border-l border-white/10 px-3">
            <Text className="text-[11px] font-semibold text-white/55">Rating</Text>
            <View className="mt-0.5 flex-row items-center gap-1">
              <Text className="num text-[19px] font-extrabold leading-tight tracking-tight text-white">{tech.rating.toFixed(2)}</Text>
              <Icon as={Star} className="size-3.5 text-[#fbbf24]" fill="#fbbf24" />
            </View>
          </Tappable>
          <Tappable href="/jobs?chip=completed" className="flex-1 border-l border-white/10 pl-3">
            <Text className="text-[11px] font-semibold text-white/55">Completed</Text>
            <Text className="num mt-0.5 text-[19px] font-extrabold leading-tight tracking-tight text-white">
              {stats.done}
              <Text className="text-[13px] font-bold text-white/45"> / {stats.today}</Text>
            </Text>
          </Tappable>
        </View>

        <View className="relative mt-4 justify-center">
          <View pointerEvents="none" className="absolute left-3.5 z-10">
            <Icon as={Search} className="size-[18px] text-faint" />
          </View>
          <TextInput
            value={query}
            onChangeText={setQuery}
            accessibilityLabel="Search jobs"
            placeholder="Search customer, area, job ID, appliance…"
            placeholderTextColor="#8a93a3"
            returnKeyType="search"
            className="h-12 w-full rounded-xl bg-card pl-11 pr-11 text-[15px] font-medium text-ink shadow-card"
          />
          {query ? (
            <Tappable
              onPress={() => setQuery('')}
              accessibilityLabel="Clear search"
              className="absolute right-1.5 size-9 items-center justify-center rounded-lg active:bg-canvas active:opacity-100"
            >
              <Icon as={X} className="size-4 text-muted" />
            </Tappable>
          ) : null}
        </View>
      </View>

      <View className="gap-6 px-4 pt-4">
        {query.trim() ? (
          <SearchResults jobs={jobs.filter((j) => j.status !== 'rejected' && matchesQuery(j, query))} query={query.trim()} />
        ) : (
          <>
            {/* Today's pipeline */}
            <View className="flex-row flex-wrap gap-2">
              {(
                [
                  ["Today's jobs", stats.today, 'bg-ink', '/jobs'],
                  ['Pending', stats.pending, 'bg-warning', '/jobs'],
                  ['Accepted', stats.accepted, 'bg-brand', '/jobs'],
                  ['In progress', stats.progress, 'bg-violet', '/jobs'],
                  ['Completed', stats.done, 'bg-success', '/jobs?chip=completed'],
                  ["Today's earnings", inr(stats.earnings), 'bg-success', '/earnings'],
                ] as const
              ).map(([label, value, bar, href]) => (
                <Tappable
                  key={label}
                  href={href}
                  className="grow basis-[30%] overflow-hidden rounded-xl border border-line bg-card px-2.5 pb-2.5 pt-3 shadow-card"
                >
                  <View className={cn('absolute inset-x-0 top-0 h-[3px]', bar)} />
                  <Text numberOfLines={1} className="num text-[22px] font-extrabold leading-none">
                    {value}
                  </Text>
                  <Text numberOfLines={1} className="mt-1.5 text-[11.5px] font-semibold text-muted">
                    {label}
                  </Text>
                </Tappable>
              ))}
            </View>

            {!online && (
              <View className="flex-row items-center gap-3 rounded-card border border-line-strong bg-card p-4">
                <View className="size-10 items-center justify-center rounded-full bg-canvas">
                  <Icon as={PowerOff} className="size-5 text-muted" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-extrabold">You’re offline</Text>
                  <Text className="text-xs font-medium text-muted">Dispatch won’t send new requests. Assigned jobs stay on your list.</Text>
                </View>
                <Tappable onPress={() => store.setOnline(true)} className="h-10 items-center justify-center rounded-lg bg-success px-3">
                  <Text className="text-sm font-extrabold text-white">Go online</Text>
                </Tappable>
              </View>
            )}

            {emergencyWaiting && <EmergencyAlert job={emergencyWaiting} count={emergencies.length} />}
            {current && <CurrentJob job={current} />}
            {(upcoming || recent) && (
              <View className="gap-3">
                {upcoming && <MiniJob kicker="Upcoming service" job={upcoming} meta={`${dayLabel(upcoming.scheduledAt)}, ${time(upcoming.scheduledAt)}`} />}
                {recent && <MiniJob kicker="Recent job" job={recent} meta={`Completed · ${inr(earned(recent))}`} done />}
              </View>
            )}

            {/* New requests */}
            {requests.length > 0 && (
              <View>
                <SectionTitle
                  count={requests.length}
                  action={
                    <Tappable href="/jobs?chip=emergency" className="flex-row items-center gap-1">
                      <Icon as={Siren} className="size-4 text-danger" />
                      <Text className="text-xs font-bold text-danger">Emergency desk</Text>
                    </Tappable>
                  }
                >
                  <View className="size-2.5">
                    <PulseRing className="absolute inset-0 rounded-full bg-brand" />
                    <View className="size-2.5 rounded-full bg-brand" />
                  </View>
                  New requests
                </SectionTitle>
                <View className="gap-3">
                  {requests.map((j) => (
                    <JobCard key={j.id} job={j} />
                  ))}
                </View>
              </View>
            )}

            {/* Today's schedule */}
            <View>
              <SectionTitle
                count={schedule.length}
                action={
                  <Tappable href="/jobs" className="flex-row items-center">
                    <Text className="text-xs font-bold text-brand">All jobs</Text>
                    <Icon as={ChevronRight} className="size-4 text-brand" />
                  </Tappable>
                }
              >
                Today’s Service Jobs
              </SectionTitle>
              {schedule.length ? (
                <View className="gap-3">
                  {schedule.map((j) => (
                    <JobCard key={j.id} job={j} />
                  ))}
                </View>
              ) : (
                <Empty icon={<Icon as={Bell} className="size-5" />} title="No jobs scheduled today" body="Stay online — new requests will appear here." />
              )}
            </View>
          </>
        )}
      </View>
    </Page>
  )
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

/** The job in hand, with its next step one tap away. */
function CurrentJob({ job }: { job: Job }) {
  const next = NEXT_ACTION[job.status]
  const store = useStore()
  const needsScreen = job.status === 'diagnosis' ? stepHref('diagnosis', job.id) : job.status === 'repaired' ? stepHref('bill', job.id) : job.status === 'confirmation' ? stepHref('confirm', job.id) : null
  return (
    <View>
      <SectionTitle>Current job</SectionTitle>
      <Card className="overflow-hidden border-brand/30">
        <Tappable href={jobHref(job)} className="p-4 active:bg-canvas/60 active:opacity-100">
          <View className="flex-row items-center justify-between gap-2">
            <StatusChip status={job.status} />
            <Text className="num text-xs font-bold text-muted">
              {job.id} · {time(job.scheduledAt)}
            </Text>
          </View>
          <View className="mt-3 flex-row items-start gap-3">
            <View className="size-12 shrink-0 items-center justify-center rounded-xl bg-brand">
              <ApplianceGlyph appliance={job.appliance} className="size-7 text-white" />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-lg font-extrabold leading-tight tracking-tight">{applianceTitle(job.brand, job.appliance)}</Text>
              <Text className="text-sm font-semibold text-ink-2">“{job.issue}”</Text>
              <Text numberOfLines={1} className="mt-1 text-xs font-semibold text-muted">
                {job.customer.name} · {job.customer.address}
              </Text>
            </View>
          </View>
          <FlowBar job={job} className="mt-4" />
        </Tappable>
        <View className="flex-row border-t border-line">
          <Tappable
            onPress={() => Linking.openURL(telHref(job.customer.phone))}
            className="h-12 flex-1 flex-row items-center justify-center gap-1.5 active:bg-canvas active:opacity-100"
          >
            <Icon as={Phone} className="size-4 text-ink-2" />
            <Text className="text-sm font-bold text-ink-2">Call</Text>
          </Tappable>
          <Tappable
            onPress={() => Linking.openURL(`sms:${job.customer.phone.replace(/\s/g, '')}`)}
            className="h-12 flex-1 flex-row items-center justify-center gap-1.5 border-x border-line active:bg-canvas active:opacity-100"
          >
            <Icon as={MessageCircle} className="size-4 text-ink-2" />
            <Text className="text-sm font-bold text-ink-2">Chat</Text>
          </Tappable>
          <Tappable
            onPress={() => Linking.openURL(directionsHref(job.customer.lat, job.customer.lng))}
            className="h-12 flex-1 flex-row items-center justify-center gap-1.5 active:bg-canvas active:opacity-100"
          >
            <Icon as={Navigation} className="size-4 text-ink-2" />
            <Text className="text-sm font-bold text-ink-2">Navigate</Text>
          </Tappable>
        </View>
        {next && (
          <View className="border-t border-line p-3">
            {needsScreen ? (
              <Tappable href={needsScreen} className="h-14 items-center justify-center rounded-xl bg-brand active:bg-brand-deep active:opacity-100">
                <Text className="text-base font-extrabold text-white">{job.status === 'diagnosis' ? 'Record diagnosis' : next.label}</Text>
              </Tappable>
            ) : (
              <Tappable
                onPress={() => store.advance(job.id, next.to)}
                className="h-14 w-full items-center justify-center rounded-xl bg-brand active:bg-brand-deep active:opacity-100"
              >
                <Text className="text-base font-extrabold text-white">{next.label}</Text>
              </Tappable>
            )}
          </View>
        )}
      </Card>
    </View>
  )
}

/** Everything the technician has on record that matches, newest work first. */
function SearchResults({ jobs, query }: { jobs: Job[]; query: string }) {
  const sorted = [...jobs].sort(
    (a, b) => Number(b.status === 'request') - Number(a.status === 'request') || b.scheduledAt.localeCompare(a.scheduledAt)
  )
  return (
    <View>
      <SectionTitle count={sorted.length}>Results for “{query}”</SectionTitle>
      {sorted.length ? (
        <View className="gap-3">
          {sorted.slice(0, 30).map((j) => (
            <JobCard key={j.id} job={j} />
          ))}
        </View>
      ) : (
        <Empty icon={<Icon as={SearchX} className="size-5" />} title="No jobs found" body="Try a customer name, area, job ID, brand or appliance." />
      )}
    </View>
  )
}

/**
 * A waiting emergency, flagged without turning the dashboard red: a red rail
 * and label carry the priority, the card itself stays white.
 */
function EmergencyAlert({ job, count }: { job: Job; count: number }) {
  return (
    <Tappable
      href={`/request?id=${job.id}` as Href}
      className="relative flex-row items-center gap-3 overflow-hidden rounded-card border border-danger/30 bg-card p-4 pl-5 shadow-card active:border-danger/60 active:opacity-100"
    >
      <View className="absolute inset-y-0 left-0 w-1 bg-danger" />
      <View className="size-11 shrink-0 items-center justify-center rounded-xl bg-danger-soft">
        <Icon as={Siren} className="size-5 text-danger" />
      </View>
      <View className="min-w-0 flex-1">
        <View className="flex-row items-center gap-2">
          <Blink className="size-1.5 rounded-full bg-danger" />
          <Text className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-danger">
            Emergency request{count > 1 ? ` · ${count} waiting` : ''}
          </Text>
        </View>
        <Text numberOfLines={1} className="mt-0.5 text-[15px] font-extrabold">
          {applianceTitle(job.brand, job.appliance)}
        </Text>
        <Text numberOfLines={1} className="text-xs font-medium text-muted">
          {job.customer.area} · {job.distanceKm} km · “{job.issue}”
        </Text>
      </View>
      <View className="shrink-0 rounded-lg bg-danger px-3 py-2">
        <Text className="text-xs font-extrabold text-white">Respond</Text>
      </View>
    </Tappable>
  )
}

function MiniJob({ kicker, job, meta, done }: { kicker: string; job: Job; meta: string; done?: boolean }) {
  return (
    <Tappable
      href={jobHref(job)}
      className="flex-row items-center gap-3 rounded-card border border-line bg-card p-3.5 shadow-card active:border-line-strong active:opacity-100"
    >
      <View className={cn('size-11 shrink-0 items-center justify-center rounded-xl', done ? 'bg-success-soft' : 'bg-brand-soft')}>
        <ApplianceGlyph appliance={job.appliance} className={cn('size-6', done ? 'text-success' : 'text-brand')} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-faint">{kicker}</Text>
        <Text numberOfLines={1} className="text-sm font-extrabold">
          {applianceTitle(job.brand, job.appliance)}
        </Text>
        <Text numberOfLines={1} className="text-xs font-medium text-muted">
          {job.customer.name} · <Text className="num text-xs font-medium text-muted">{meta}</Text>
        </Text>
      </View>
      <Icon as={ChevronRight} className="size-4 shrink-0 text-faint" />
    </Tappable>
  )
}
