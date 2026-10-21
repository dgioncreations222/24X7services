import { Stack } from 'expo-router'

/** Sign-in and password reset. No tabs, no menu, no job popups. */
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
}
