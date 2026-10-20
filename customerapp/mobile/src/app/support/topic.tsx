import { useState } from 'react'
import { View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated'
import { ChevronDown, MessageSquare } from 'lucide-react-native'

import { Header, Screen } from '@/components/Screen'
import { ErrorState } from '@/components/ui/States'
import { Icon } from '@/components/ui/Icon'
import { Tappable } from '@/components/ui/Tappable'
import { Text } from '@/components/ui/Text'
import { supportTopic, type SupportQuestion } from '@/screens/support/topics'
import { cn } from '@/lib/cn'

/**
 * One help topic: its questions, answered in full.
 *
 * Answered here rather than linked to an article, because the whole reason
 * people open help is that they do not want to be sent somewhere else. Every
 * answer is checked against what the app actually does — see the note on the
 * topics file.
 *
 * The way to a person is at the bottom of every topic. Someone who has read
 * four answers and is still here has a question the list does not cover, and
 * making them walk back to find the chat is how a help centre earns its
 * reputation.
 *
 * Each question opens in place, like the web's `<details>`, and announces
 * whether it is open as its expanded state.
 */
export default function TopicScreen() {
  const { t } = useLocalSearchParams<{ t?: string }>()
  const topic = supportTopic(t ?? null)

  return (
    <Screen header={<Header title={topic?.label ?? 'Help'} showBack backFallback="/support" />}>
      {!topic ? (
        <ErrorState
          className="py-20"
          kind="notFound"
          title="We could not find that topic"
          description="It may have been renamed. The full list is on the support screen."
        />
      ) : (
        <>
          <Text accessibilityRole="header" className="mt-6 text-2xl font-bold leading-[30px] text-ink">
            {topic.label}
          </Text>
          <Text className="mt-1 text-sm text-muted">{topic.blurb}</Text>

          <View className="mt-4 border-y border-border">
            {topic.questions.map((item, index) => (
              <Question key={item.q} item={item} last={index === topic.questions.length - 1} />
            ))}
          </View>

          <View className="mt-8 rounded-card border border-border p-4">
            <Text className="text-base font-semibold text-ink">Still not answered?</Text>
            <Text className="mt-1 text-sm text-muted">
              Tell us what happened and we will sort it out. Most things are
              quicker to fix than to explain.
            </Text>
            <Tappable
              href="/support/chat"
              className="mt-3 min-h-11 flex-row items-center gap-2 self-start rounded-pill bg-ink px-5"
            >
              <Icon as={MessageSquare} className="size-4 text-bg" />
              <Text className="text-sm font-semibold text-bg">Start a conversation</Text>
            </Tappable>
          </View>
        </>
      )}
    </Screen>
  )
}

function Question({ item, last }: { item: SupportQuestion; last: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <View className={cn(!last && 'border-b border-border')}>
      <Tappable
        onPress={() => setOpen((was) => !was)}
        accessibilityState={{ expanded: open }}
        className="min-h-14 flex-row items-center justify-between gap-4 py-4"
      >
        <Text className="min-w-0 flex-1 text-base font-semibold text-ink">{item.q}</Text>
        <View style={open ? { transform: [{ rotate: '180deg' }] } : undefined}>
          <Icon as={ChevronDown} className="size-4 shrink-0 text-muted" />
        </View>
      </Tappable>
      {open ? (
        <Animated.View entering={FadeIn.duration(150).reduceMotion(ReduceMotion.System)}>
          <Text className="pb-4 text-sm leading-[22px] text-muted">{item.a}</Text>
        </Animated.View>
      ) : null}
    </View>
  )
}
