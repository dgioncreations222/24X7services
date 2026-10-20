import { useCallback, useRef } from 'react'
import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { Href } from 'expo-router'

import { Header } from '@/components/Screen'

/**
 * Where every way in from this screen points. `next` is this screen's own
 * path, written out: it takes no query parameters, so a constant cannot come
 * back wrong.
 */
export const SIGN_IN = '/login?next=%2Fprofile%2Fwallet' as Href

/** Brings a y offset in the scroll content into view. */
export type ScrollTo = (y: number) => void

/** The header and the scroll the screen sits in. */
export function WalletFrame({ children }: { children: (scrollTo: ScrollTo) => React.ReactNode }) {
  const insets = useSafeAreaInsets()
  const scroller = useRef<ScrollView>(null)
  const scrollTo = useCallback<ScrollTo>((y) => {
    // A little headroom so the heading is not flush with the header.
    scroller.current?.scrollTo({ y: Math.max(0, y - 8), animated: true })
  }, [])

  return (
    <View className="flex-1 bg-bg">
      <Header title="Balance" showBack backFallback="/profile" />
      <ScrollView
        ref={scroller}
        className="flex-1"
        contentContainerClassName="px-4"
        contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
        keyboardShouldPersistTaps="handled"
      >
        {/* scrollTo reads the ref only when a press calls it, never while rendering. */}
        {/* eslint-disable-next-line react-hooks/refs */}
        {children(scrollTo)}
      </ScrollView>
    </View>
  )
}

/**
 * The full-width grey rule between blocks: the balance, the statement and the
 * questions are three unrelated things, and without a band between them they
 * read as one long list that happens to change subject twice.
 */
export function Band() {
  return <View aria-hidden className="-mx-4 my-6 h-2 bg-surface" />
}
