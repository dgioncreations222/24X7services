import { useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Bell, Star } from 'lucide-react-native'
import { setOnline, useEarnings, useJobs, useProfile } from '@/lib/data'
import { cn } from '@/lib/cn'
import { useT } from '@/lib/i18n'
import { rupees } from '@/lib/money'
import { COLORS } from '@/lib/theme'
import { isToday } from '@/lib/when'
import { MenuButton } from '../menu'
import { Icon } from '../base/Icon'
import { Tappable } from '../base/Tappable'
import { Text } from '../base/Text'
import { Avatar } from '../ui/Avatar'
import { Skeleton } from '../ui/Skeleton'
import { Toggle } from '../ui/Field'

/**
 * The navy top of Home: who you are, the one switch that matters (online
 * gets requests, offline does not) and today in three numbers.
 */
export function HomeHeader() {
  const t = useT()
  const insets = useSafeAreaInsets()
  const profile = useProfile()
  const earnings = useEarnings('today')
  const upcoming = useJobs('upcoming')
  const ongoing = useJobs('ongoing')
  const done = useJobs('completed')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  const p = profile.data
  const online = p?.online ?? false
  const todayCount = [...(upcoming.data ?? []), ...(ongoing.data ?? []), ...(done.data ?? [])].filter((j) => j.status !== 'cancelled' && isToday(j.slotStart)).length
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  async function toggle(next: boolean) {
    setBusy(true)
    setError(false)
    try {
      await setOnline(next)
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <View className="gap-4 bg-brand-ink px-4 pb-5" style={{ paddingTop: insets.top + 12 }}>
      <View className="flex-row items-center gap-3">
        <MenuButton inverted />
        <Tappable href="/profile" accessibilityLabel={t('Profile')} className="shrink-0">
          {p ? <Avatar name={p.name} photo={p.photo} size={44} /> : <Skeleton className="size-11 rounded-full bg-white/20" />}
        </Tappable>
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="text-base font-extrabold text-white">
            {p?.name ?? ' '}
          </Text>
          <Text className="text-xs font-semibold text-white/60">{t(greeting)}</Text>
        </View>
        <Tappable href="/notifications" accessibilityLabel={t('Notifications')} className="size-12 items-center justify-center rounded-full bg-white/10">
          <Icon as={Bell} className="size-5 text-white" />
        </Tappable>
      </View>

      <View className={cn('flex-row items-center gap-3 rounded-card border p-4', online ? 'border-live/30 bg-live/[0.12]' : 'border-white/10 bg-white/[0.06]')}>
        <View className="min-w-0 flex-1">
          <Text className={cn('text-lg font-extrabold', online ? 'text-live-soft' : 'text-white')}>{online ? t('You’re online') : t('You’re offline')}</Text>
          <Text className="text-sm font-medium text-white/70">{error ? t('Couldn’t change it. Try again.') : online ? t('New requests will reach you') : t('Go online to get new requests')}</Text>
        </View>
        {busy ? <ActivityIndicator color={COLORS.white} /> : <Toggle size="lg" tone="success" checked={online} onChange={toggle} label={t('Online')} />}
      </View>

      <View className="flex-row">
        <Stat label={t('Earned today')} value={earnings.data ? rupees(earnings.data.net) : null} href="/earnings" />
        <Stat label={t('Jobs today')} value={upcoming.data && ongoing.data && done.data ? String(todayCount) : null} href="/jobs" divider />
        <Stat
          label={t('Rating')}
          value={p ? p.rating.toFixed(2) : null}
          icon={<Icon as={Star} className="size-4 text-star" fill={COLORS.star} />}
          href="/profile"
          divider
        />
      </View>
    </View>
  )
}

function Stat({ label, value, icon, href, divider }: { label: string; value: string | null; icon?: React.ReactNode; href: '/earnings' | '/jobs' | '/profile'; divider?: boolean }) {
  return (
    <Tappable href={href} className={cn('min-h-12 flex-1 px-3', divider && 'border-l border-white/10')}>
      <Text className="text-xs font-semibold text-white/60">{label}</Text>
      {value === null ? (
        <Skeleton className="mt-1.5 h-6 w-16 bg-white/20" />
      ) : (
        <View className="mt-0.5 flex-row items-center gap-1">
          <Text className="num text-xl font-extrabold text-white">{value}</Text>
          {icon}
        </View>
      )}
    </Tappable>
  )
}
