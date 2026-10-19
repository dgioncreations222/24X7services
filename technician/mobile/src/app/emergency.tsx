import { useEffect } from 'react'
import { View } from 'react-native'
import Animated, { Easing, ReduceMotion, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated'
import { ShieldCheck, Siren } from 'lucide-react-native'
import { JobCard } from '@/components/JobCard'
import { Empty, Icon, Page, ScreenHeader, SectionTitle, Text } from '@/components/ui'
import { cn } from '@/lib/cn'
import { isActive } from '@/lib/status'
import { useStore, useTick } from '@/lib/store'

/**
 * The emergency desk: emergency requests only, with every action a technician
 * needs on the card itself — no detour through the detail screen.
 */
export default function EmergencyScreen() {
  const { jobs, online } = useStore()
  useTick(20_000)
  const open = jobs.filter((j) => j.priority === 'emergency' && j.status === 'request').sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
  const mine = jobs.filter((j) => j.priority === 'emergency' && isActive(j))

  return (
    <>
      <ScreenHeader back="/home" title="Emergency Jobs" subtitle="High-priority desk" />
      <Page className="gap-5">
        {/* Priority is carried by the rail, icon and numbers — the page stays white. */}
        <View className="relative overflow-hidden rounded-card border border-line bg-card shadow-card">
          <View className="absolute inset-y-0 left-0 w-1 bg-danger" />
          <View className="flex-row items-center gap-3 p-4 pl-5">
            <View className="relative size-11 shrink-0 items-center justify-center rounded-xl bg-danger-soft">
              {open.length > 0 && <PulseRing className="absolute inset-1 rounded-xl bg-danger/20" />}
              <Icon as={Siren} className="size-5 text-danger" />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-danger">Priority desk</Text>
              <Text className="text-sm font-medium text-muted">Accept within 2 min · arrive within 45 min</Text>
            </View>
          </View>
          <View className="flex-row border-t border-line">
            <View className="flex-1 px-4 py-3">
              <Text className="text-[10.5px] font-bold uppercase tracking-wider text-faint">Waiting</Text>
              <Text className={cn('num text-2xl font-extrabold leading-tight', open.length ? 'text-danger' : 'text-ink')}>{open.length}</Text>
            </View>
            <View className="flex-1 border-l border-line px-4 py-3">
              <Text className="text-[10.5px] font-bold uppercase tracking-wider text-faint">Your emergency jobs</Text>
              <Text className="num text-2xl font-extrabold leading-tight">{mine.length}</Text>
            </View>
          </View>
          {!online && (
            <Text className="border-t border-line bg-warning-soft px-4 py-2.5 text-xs font-bold text-warning">You’re offline — go online to take emergency jobs.</Text>
          )}
        </View>

        {mine.length > 0 && (
          <View>
            <SectionTitle count={mine.length}>Your emergency jobs</SectionTitle>
            <View className="gap-3">
              {mine.map((j) => (
                <JobCard key={j.id} job={j} />
              ))}
            </View>
          </View>
        )}

        <View>
          <SectionTitle count={open.length}>Waiting for a technician</SectionTitle>
          {open.length ? (
            <View className="gap-3">
              {open.map((j) => (
                <JobCard key={j.id} job={j} />
              ))}
            </View>
          ) : (
            <Empty icon={<Icon as={ShieldCheck} className="size-5" />} title="No open emergencies" body="You’ll get a full-screen alert the moment one comes in." />
          )}
        </View>
      </Page>
    </>
  )
}

/** The web's `animate-pulse-ring`: a ring that swells out of the tile and fades. */
function PulseRing({ className }: { className?: string }) {
  const p = useSharedValue(0)
  useEffect(() => {
    p.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.bezier(0.22, 0.61, 0.36, 1), reduceMotion: ReduceMotion.System }), -1)
    return () => cancelAnimation(p)
  }, [p])
  const style = useAnimatedStyle(() => ({ opacity: 0.7 * (1 - p.value), transform: [{ scale: 0.8 + 1.6 * p.value }] }))
  return <Animated.View pointerEvents="none" className={className} style={style} />
}
