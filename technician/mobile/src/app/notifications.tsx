import { useState } from 'react'
import { FlatList, View } from 'react-native'
import { router, type Href } from 'expo-router'
import { BellOff, BriefcaseBusiness, CalendarClock, CircleX, IndianRupee, MessageCircle, Siren, Star, Wallet, Zap, type LucideIcon } from 'lucide-react-native'
import { Async } from '@/components/ui/Async'
import { EmptyState, Icon, ScreenHeader, Segmented, SkeletonList, Tappable, Text } from '@/components/ui'
import {
  markAllNotificationsRead,
  markNotificationRead,
  useNotifications,
  useUnreadCount,
  type PartnerNotification,
  type PartnerNotificationKind,
} from '@/lib/data'
import { cn } from '@/lib/cn'
import { useT } from '@/lib/i18n'
import { ago } from '@/lib/when'

const KIND: Record<PartnerNotificationKind, { icon: LucideIcon; tone: string }> = {
  request: { icon: Zap, tone: 'bg-brand-soft text-brand' },
  emergency: { icon: Siren, tone: 'bg-danger-soft text-danger' },
  assigned: { icon: BriefcaseBusiness, tone: 'bg-brand-soft text-brand' },
  schedule: { icon: CalendarClock, tone: 'bg-warning-soft text-warning' },
  cancelled: { icon: CircleX, tone: 'bg-canvas text-muted' },
  customer: { icon: MessageCircle, tone: 'bg-info-soft text-info' },
  payment: { icon: IndianRupee, tone: 'bg-success-soft text-success' },
  payout: { icon: Wallet, tone: 'bg-success-soft text-success' },
  rating: { icon: Star, tone: 'bg-warning-soft text-warning' },
}

type Tab = 'all' | 'jobs' | 'money'
const MONEY: readonly PartnerNotificationKind[] = ['payment', 'payout', 'rating']
const inTab = (tab: Tab, n: PartnerNotification) => tab === 'all' || (tab === 'money') === MONEY.includes(n.kind)

/** Where tapping a notification goes: the request, the job, or Payouts. */
function target(n: PartnerNotification): Href | null {
  if (n.kind === 'payout') return '/payouts'
  if (!n.jobId) return null
  return n.kind === 'request' || n.kind === 'emergency' ? `/request?id=${n.jobId}` : `/jobs/detail?id=${n.jobId}`
}

/** Every update, newest first; unread ones are tinted until opened. */
export default function NotificationsScreen() {
  const t = useT()
  const [tab, setTab] = useState<Tab>('all')
  const query = useNotifications()
  const unread = useUnreadCount()

  return (
    <View className="flex-1 bg-canvas">
      <ScreenHeader
        back="/home"
        title={t('Notifications')}
        subtitle={unread ? t('{n} unread', { n: unread }) : t('All caught up')}
        right={
          unread > 0 ? (
            <Tappable onPress={() => void markAllNotificationsRead().catch(() => undefined)} className="h-11 justify-center rounded-xl px-3 active:bg-brand-soft">
              <Text className="text-sm font-bold text-brand">{t('Mark all read')}</Text>
            </Tappable>
          ) : null
        }
      />
      <View className="border-b border-line bg-card px-4 py-3">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'all', label: t('All') },
            { value: 'jobs', label: t('Jobs') },
            { value: 'money', label: t('Money') },
          ]}
        />
      </View>
      <Async
        query={query}
        loading={<SkeletonList className="p-4" />}
        isEmpty={(list) => !list.some((n) => inTab(tab, n))}
        empty={
          <View className="p-4">
            <EmptyState icon={<Icon as={BellOff} className="size-6" />} title={t('Nothing here yet')} body={t('New jobs, payments and ratings show up here.')} />
          </View>
        }
      >
        {(list) => (
          <FlatList
            data={list.filter((n) => inTab(tab, n))}
            keyExtractor={(n) => n.id}
            renderItem={({ item, index }) => <Row n={item} first={index === 0} />}
            className="bg-card"
            contentContainerClassName="pb-8"
            initialNumToRender={12}
          />
        )}
      </Async>
    </View>
  )
}

function Row({ n, first }: { n: PartnerNotification; first: boolean }) {
  const t = useT()
  const k = KIND[n.kind]
  const when = ago(n.at)
  const href = target(n)
  return (
    <Tappable
      onPress={() => {
        if (!n.read) void markNotificationRead(n.id).catch(() => undefined)
        if (href) router.push(href)
      }}
      accessibilityState={{ selected: !n.read }}
      className={cn('flex-row gap-3 px-4 py-3.5 active:bg-canvas active:opacity-100', !first && 'border-t border-line', !n.read && 'bg-brand-soft/40')}
    >
      <View className={cn('size-10 shrink-0 items-center justify-center rounded-full', k.tone)}>
        <Icon as={k.icon} className={cn('size-5', k.tone)} />
      </View>
      <View className="min-w-0 flex-1">
        <View className="flex-row items-baseline justify-between gap-2">
          <Text className={cn('shrink text-base', n.read ? 'font-semibold' : 'font-extrabold')}>{n.title}</Text>
          <Text className="shrink-0 text-xs font-semibold text-faint">{t(when.text, { n: when.n ?? '' })}</Text>
        </View>
        <Text className="mt-0.5 text-sm text-muted">{n.body}</Text>
      </View>
      {!n.read ? <View accessibilityLabel={t('Unread')} className="mt-2 size-2.5 shrink-0 rounded-full bg-brand" /> : null}
    </Tappable>
  )
}
