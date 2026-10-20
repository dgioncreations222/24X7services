import { useCallback, useState } from 'react'
import { View } from 'react-native'
import type { Href } from 'expo-router'
import { Bell, CalendarCheck, ChevronRight, FileCheck2, ReceiptText, Truck, UserCheck } from 'lucide-react-native'
import type { AppNotification } from '@app/shared'

import { ProfileShell, SignInPrompt } from '@/components/ProfileShell'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { Tappable } from '@/components/ui/Tappable'
import { Text } from '@/components/ui/Text'
import { EmptyState , ErrorState } from '@/components/ui/States'

import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { fetchNotifications, markNotificationRead } from '@/lib/api/notifications'
import { relativeTime } from '@/lib/format'
import { useAsync } from '@/lib/useAsync'
import { cn } from '@/lib/cn'

/**
 * Everything we have sent this customer.
 *
 * Marking one as read is the only thing a client may write here, and the rules
 * say so field by field — `readAt` and nothing else. A notification is a record
 * of what we told someone and when; a client that could edit the text could
 * rewrite that.
 *
 * These are written by `onBookingStatusNotify`, which watches a booking's
 * status rather than being called from each path that moves one. The same call
 * pushes to the customer's devices where they have asked for it.
 */
export default function NotificationsScreen() {
  return (
    <ProfileShell
      title="Notifications"
      signedOut={
        <SignInPrompt
          icon={Bell}
          title="Stay on top of every visit"
          description="Log in and every update about your bookings lands here, the moment it happens."
          previewTitle="You will hear from us when"
          preview={[
            {
              icon: CalendarCheck,
              title: 'Your booking is confirmed',
              detail: 'With the date, the two-hour window and the address.',
            },
            {
              icon: UserCheck,
              title: 'A technician is assigned',
              detail: 'Their name, photo and rating, before they arrive.',
            },
            {
              icon: Truck,
              title: 'They are on the way',
              detail: 'So you know when to expect the knock at the door.',
            },
            {
              icon: FileCheck2,
              title: 'A quote needs your approval',
              detail: 'Nothing beyond the visit starts until you say yes.',
            },
            {
              icon: ReceiptText,
              title: 'The job is done',
              detail: 'Your GST invoice and warranty, ready to download.',
            },
          ]}
        />
      }
    >
      {(user) => <NotificationList uid={user.uid} />}
    </ProfileShell>
  )
}

function NotificationList({ uid }: { uid: string }) {
  const [read, setRead] = useState<Set<string>>(new Set())

  const load = useCallback((): Promise<AppNotification[]> => fetchNotifications(uid), [uid])

  const notifications = useAsync(load)

  const markRead = useCallback(
    async (item: AppNotification): Promise<void> => {
      if (item.readAt || read.has(item.id)) return
      // Marked locally straight away; a failed write is not worth a message
      // about something the customer has visibly just read.
      setRead((current) => new Set(current).add(item.id))
      try {
        await markNotificationRead(uid, item.id)
      } catch {
        // Left as read on screen. It will come back unread next time.
      }
    },
    [read, uid]
  )

  if (notifications.status === 'loading') {
    return (
      <SkeletonGroup label="Loading" className="mt-6 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </SkeletonGroup>
    )
  }

  if (notifications.status === 'error') {
    return <ErrorState className="py-16" onRetry={notifications.reload} retrying={notifications.refreshing} />
  }

  if ((notifications.data?.length ?? 0) === 0) {
    return (
      <EmptyState
        className="py-16"
        icon={Bell}
        title="Nothing here yet"
        description="Updates about your bookings — an expert assigned, a quote to approve, a job finished — collect here."
        action={{ label: 'See your bookings', href: '/bookings' }}
      />
    )
  }

  const items = notifications.data ?? []
  return (
    <Card className="mt-5 overflow-hidden">
      {items.map((item, index) => {
        const unread = !item.readAt && !read.has(item.id)
        return (
          <Tappable
            key={item.id}
            {...(item.href ? { href: item.href as Href } : {})}
            onPress={() => void markRead(item)}
            className={cn(
              'w-full flex-row items-start gap-3 px-4 py-3.5 active:bg-surface active:opacity-100',
              index < items.length - 1 && 'border-b border-border'
            )}
          >
            {unread ? (
              <View accessibilityLabel="Unread" className="mt-1.5 size-2 shrink-0 rounded-full bg-error" />
            ) : (
              <View className="w-2 shrink-0" />
            )}
            <View className="min-w-0 flex-1">
              <Text className={cn('text-sm', unread ? 'font-semibold text-ink' : 'font-medium text-muted')}>
                {item.title}
              </Text>
              <Text className="mt-0.5 text-sm leading-[22px] text-muted">{item.body}</Text>
              <Text className="mt-1 text-xs text-muted">{relativeTime(item.at)}</Text>
            </View>
            {item.href ? <Icon as={ChevronRight} className="mt-0.5 size-4 shrink-0 text-muted" /> : null}
          </Tappable>
        )
      })}
    </Card>
  )
}
