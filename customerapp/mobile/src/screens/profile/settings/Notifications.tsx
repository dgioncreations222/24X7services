import { useCallback, useState } from 'react'
import { View } from 'react-native'
import { Bell, BellRing, Lock } from 'lucide-react-native'
import { DEFAULT_NOTIFICATION_PREFS, type NotificationPrefs } from '@app/shared'

import { useSignInHref } from '@/components/ProfileShell'
import { SwitchRow } from '@/components/ui/Switch'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { Text } from '@/components/ui/Text'
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { useToast } from '@/components/Toast'
import { callFn } from '@/lib/callables'
import { fetchNotificationPrefs, saveNotificationPrefs } from '@/lib/api/notifications'
import { enablePushNotifications, PUSH_IS_CONFIGURED } from '@/lib/push'
import { useAsync } from '@/lib/useAsync'

/**
 * What we may send, and on which channel.
 *
 * Turning push on is two things, not one: a preference we store, and a
 * permission only the phone can grant. The switch asks for the permission
 * first and only stores the preference if it is given — storing "on" against a
 * phone that is blocking notifications would be a setting that reads as on and
 * sends nothing.
 */
export function Notifications({ uid }: { uid: string | null }) {
  const toast = useToast()
  const signIn = useSignInHref()
  const load = useCallback(async (): Promise<NotificationPrefs> => {
    if (!uid) return DEFAULT_NOTIFICATION_PREFS
    return fetchNotificationPrefs(uid)
  }, [uid])

  const prefs = useAsync(load)
  const [local, setLocal] = useState<NotificationPrefs | null>(null)
  const [saving, setSaving] = useState<keyof NotificationPrefs | null>(null)

  const current = local ?? prefs.data ?? DEFAULT_NOTIFICATION_PREFS

  async function set(key: keyof NotificationPrefs, next: boolean): Promise<void> {
    if (saving || !uid) return
    const before = current
    setLocal({ ...current, [key]: next })
    setSaving(key)

    try {
      if (key === 'push' && next) {
        const outcome = await enablePushNotifications()
        if (outcome.kind === 'enabled') {
          await callFn('registerFcmToken', { token: outcome.token })
        } else {
          setLocal(before)
          toast.show(
            outcome.kind === 'denied'
              ? 'Your phone is blocking notifications from this app. Turn them on in its settings.'
              : outcome.reason,
            { tone: 'warning' }
          )
          return
        }
      }

      await saveNotificationPrefs(uid, { ...current, [key]: next })
    } catch {
      setLocal(before)
      toast.show('We could not save that. Please try again.', { tone: 'error' })
    } finally {
      setSaving(null)
    }
  }

  if (prefs.status === 'loading') {
    return (
      <SkeletonGroup label="Loading settings" className="mt-6 gap-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </SkeletonGroup>
    )
  }

  return (
    <View className="mt-6">
      <Text accessibilityRole="header" className="text-lg font-bold text-ink">
        Notifications
      </Text>

      <View className="mt-1 border-y border-border">
        <SwitchRow
          icon={BellRing}
          label="Push notifications"
          description={
            PUSH_IS_CONFIGURED
              ? 'On this device, when a booking moves'
              : 'Needs the push key this build was made without'
          }
          checked={Boolean(uid) && current.push && PUSH_IS_CONFIGURED}
          onChange={(next) => void set('push', next)}
          busy={saving === 'push'}
          disabled={!PUSH_IS_CONFIGURED}
          {...(uid ? {} : { href: signIn })}
        />
        <View className="h-px bg-border" />
        <SwitchRow
          icon={Bell}
          label="In-app notifications"
          description="The list under Profile, Notifications"
          checked={Boolean(uid) && current.inApp}
          onChange={(next) => void set('inApp', next)}
          busy={saving === 'inApp'}
          {...(uid ? {} : { href: signIn })}
        />
      </View>

      {!uid ? (
        <Text className="mt-3 text-sm text-muted">
          Both belong to an account — pressing either one signs you in first, and brings you back here.
        </Text>
      ) : null}

      {/* The gap, named. Leaving it to be noticed is how a customer decides
          the switches above are not the whole story. */}
      <Card className="mt-3 bg-surface p-4">
        <View className="flex-row items-center gap-2">
          <Icon as={Lock} className="size-4 shrink-0 text-muted" />
          <Text className="flex-1 text-sm font-semibold text-ink">Messages about a booking cannot be turned off</Text>
        </View>
        <Text className="mt-1 text-sm leading-[22px] text-muted">
          When a technician is assigned, when they set off, and when a quote needs your answer. Those are the service
          itself — switching them off would mean somebody arriving at your door unannounced. We send nothing else: no
          offers, no reminders to book again.
        </Text>
      </Card>
    </View>
  )
}
