import Constants, { ExecutionEnvironment } from 'expo-constants'
import { demoMode } from './firebase'

/**
 * Turning on push notifications for this device, and receiving one.
 *
 * The permission prompt is asked for when the customer presses a button that
 * says what it is for, never on first launch — a prompt nobody has a reason
 * to say yes to gets a permanent no.
 *
 * DECISION NEEDED: delivery needs the real Firebase project's
 * google-services.json (FCM) and an EAS project id for the push token. Until
 * both exist the switch in Settings says push is not set up, rather than
 * asking for a permission it cannot use.
 */

const EAS_PROJECT_ID = process.env.EXPO_PUBLIC_EAS_PROJECT_ID

// Expo Go dropped remote push on Android in SDK 53, and merely importing
// expo-notifications there throws — so the module is only loaded when push
// can actually work, never at the top of a file every screen pulls in.
const IN_EXPO_GO =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient

export const PUSH_IS_CONFIGURED =
  !demoMode && Boolean(EAS_PROJECT_ID) && !IN_EXPO_GO

function notifications(): typeof import('expo-notifications') {
  // Loaded lazily so Expo Go, where push cannot work, never evaluates it.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo-notifications')
}

export type PushOutcome =
  | { kind: 'enabled'; token: string }
  | { kind: 'denied' }
  | { kind: 'unavailable'; reason: string }

export async function enablePushNotifications(): Promise<PushOutcome> {
  if (!PUSH_IS_CONFIGURED) {
    return {
      kind: 'unavailable',
      reason: 'Push is not switched on for this build yet.',
    }
  }

  const { status } = await notifications().requestPermissionsAsync()
  if (status !== 'granted') return { kind: 'denied' }

  try {
    const { data } = await notifications().getDevicePushTokenAsync()
    return { kind: 'enabled', token: String(data) }
  } catch {
    return {
      kind: 'unavailable',
      reason: 'We could not register this phone. Please try again.',
    }
  }
}

/**
 * A push that arrives while the app is open. The caller shows it as a toast
 * rather than a system banner over the screen it is about.
 */
export async function onPushWhileOpen(
  handler: (message: { title: string; body: string; href?: string }) => void
): Promise<() => void> {
  if (!PUSH_IS_CONFIGURED) return () => {}

  const subscription = notifications().addNotificationReceivedListener(
    (notification) => {
      const { title, body, data } = notification.request.content
      if (!title || !body) return
      const href = typeof data?.href === 'string' ? data.href : undefined
      handler({ title, body, ...(href ? { href } : {}) })
    }
  )
  return () => subscription.remove()
}
