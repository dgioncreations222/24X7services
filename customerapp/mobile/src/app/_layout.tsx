import '@/global.css'

import { useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router'
import { useCSSVariable, useUniwind } from 'uniwind'
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/manrope'
import { useDemoData } from '@/lib/api/startup'
import { useAuth } from '@/lib/auth'
import { onPushWhileOpen } from '@/lib/push'
import { useOnline } from '@/lib/useOnline'
import { OfflineBanner } from '@/components/ui/States'
import { ToastProvider, useToast } from '@/components/Toast'
import { Text } from '@/components/ui/Text'
import { useColor } from '@/components/ui/Icon'

SplashScreen.preventAutoHideAsync().catch(() => undefined)

/**
 * The root: fonts, the demo catalog, the theme, and the three things that sit
 * outside every screen — the offline bar, the toast viewport, and the handler
 * for a push that lands while the app is open.
 */
export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  })
  const demo = useDemoData()
  const fontsReady = fontsLoaded || Boolean(fontError)

  useEffect(() => {
    if (fontsReady && demo !== 'loading') SplashScreen.hideAsync().catch(() => undefined)
  }, [fontsReady, demo])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Themed>
          <ToastProvider>
            {!fontsReady || demo === 'loading' ? (
              <Loading />
            ) : demo === 'failed' ? (
              <View className="flex-1 items-center justify-center bg-bg px-6">
                <Text className="max-w-sm text-center text-sm text-muted">
                  The demo could not load. Close the app and open it again.
                </Text>
              </View>
            ) : (
              <>
                <OfflineBar />
                <PushWhileOpen />
                <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
                  <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
                  <Stack.Screen name="index" options={{ animation: 'none' }} />
                </Stack>
              </>
            )}
          </ToastProvider>
        </Themed>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

/** Navigation's own colours (screen backgrounds behind transitions) follow the theme. */
function Themed({ children }: { children: React.ReactNode }) {
  const { theme } = useUniwind()
  const [bg, ink, border, brand] = useCSSVariable([
    '--color-bg',
    '--color-ink',
    '--color-border',
    '--color-brand',
  ]) as string[]
  const dark = theme === 'dark'
  const base = dark ? DarkTheme : DefaultTheme
  return (
    <ThemeProvider
      value={{
        ...base,
        colors: {
          ...base.colors,
          background: bg ?? base.colors.background,
          card: bg ?? base.colors.card,
          text: ink ?? base.colors.text,
          border: border ?? base.colors.border,
          primary: brand ?? base.colors.primary,
        },
      }}
    >
      <StatusBar style={dark ? 'light' : 'dark'} />
      <View className="flex-1 bg-bg">{children}</View>
    </ThemeProvider>
  )
}

function Loading() {
  const brand = useColor('text-brand')
  return (
    <View accessibilityLabel="Loading" className="flex-1 items-center justify-center bg-bg">
      <ActivityIndicator color={brand} />
    </View>
  )
}

function OfflineBar() {
  const online = useOnline()
  if (online) return null
  return (
    <View className="absolute inset-x-0 bottom-0 z-50">
      <OfflineBanner />
    </View>
  )
}

/** A push that arrives while the app is open becomes a toast, not a banner. */
function PushWhileOpen() {
  const { user } = useAuth()
  const toast = useToast()

  useEffect(() => {
    if (!user) return
    let stop: (() => void) | undefined
    let live = true
    void onPushWhileOpen((message) => {
      toast.show(`${message.title} — ${message.body}`, { duration: 8000 })
    }).then((unsubscribe) => {
      if (live) stop = unsubscribe
      else unsubscribe()
    })
    return () => {
      live = false
      stop?.()
    }
  }, [user, toast])

  return null
}
