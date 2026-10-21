import '@/global.css'

import { useEffect } from 'react'
import { View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router'
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/manrope'
import { StoreProvider } from '@/lib/store'
import { AppShell } from '@/components/AppShell'

SplashScreen.preventAutoHideAsync().catch(() => undefined)

const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: '#f3f5f8', card: '#ffffff', text: '#111827', border: '#e3e7ee', primary: '#2547d0' },
}

/**
 * The root: fonts, the on-device store, and the shell that sits around every
 * screen. The four tabs live in (tabs); everything else is pushed over them.
 */
export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  })
  const fontsReady = fontsLoaded || Boolean(fontError)

  useEffect(() => {
    if (fontsReady) SplashScreen.hideAsync().catch(() => undefined)
  }, [fontsReady])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={theme}>
          <StatusBar style="dark" />
          {!fontsReady ? (
            <View className="flex-1 bg-brand-ink" />
          ) : (
            <StoreProvider>
              <AppShell>
                <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: '#f3f5f8' } }}>
                  <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
                  <Stack.Screen name="index" options={{ animation: 'none' }} />
                  <Stack.Screen name="login" options={{ animation: 'fade' }} />
                </Stack>
              </AppShell>
            </StoreProvider>
          )}
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
