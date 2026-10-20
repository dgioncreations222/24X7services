import { useEffect, useRef, useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, type Href } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { ArrowUp, Lightbulb, Sparkles, Wrench, type LucideIcon } from 'lucide-react-native'

import { Header } from '@/components/Screen'
import { Icon, useColor } from '@/components/ui/Icon'
import { Tappable } from '@/components/ui/Tappable'
import { Text } from '@/components/ui/Text'
import {
  answer,
  OPENING,
  type AssistantContext,
  type AssistantReply,
} from '@/lib/assistant'
import { cn } from '@/lib/cn'
import { useTokenColors } from '@/lib/useTokenColors'
import { brand } from '@/config/brand'

/**
 * A conversation with the assistant in lib/assistant.ts.
 *
 * Opened from the search screen, either empty or with the prompt the customer
 * tapped already sent (`?q=`). The conversation lives in this screen only:
 * leaving and coming back starts a fresh one, which is what someone asking
 * about a different appliance next week would want anyway.
 */

type Message =
  | { id: number; from: 'customer'; text: string }
  | { id: number; from: 'assistant'; reply: AssistantReply }

/** Long enough to read as an answer being put together, not as lag. */
const THINKING_MS = 600

/**
 * The brain's links are written for the web export, some with its trailing
 * slash (`/services/appliance/?a=ac`). The router wants them without.
 */
function routeOf(href: string): Href {
  return href.replace(/\/\?/, '?').replace(/(.)\/$/, '$1') as Href
}

export default function AssistantScreen() {
  const { q } = useLocalSearchParams<{ q?: string }>()
  const insets = useSafeAreaInsets()
  const placeholder = useColor('text-muted')
  const selection = useColor('text-brand')

  const [messages, setMessages] = useState<Message[]>([{ id: 0, from: 'assistant', reply: OPENING }])
  const [draft, setDraft] = useState('')
  const [thinking, setThinking] = useState(false)
  const [focused, setFocused] = useState(false)
  const context = useRef<AssistantContext>({})
  const nextId = useRef(1)
  const scroller = useRef<ScrollView>(null)
  const sentInitial = useRef(false)

  async function send(text: string): Promise<void> {
    const message = text.trim()
    if (!message || thinking) return

    setDraft('')
    setMessages((all) => [...all, { id: nextId.current++, from: 'customer', text: message }])
    setThinking(true)

    const started = Date.now()
    let reply: AssistantReply
    try {
      const result = await answer(message, context.current)
      context.current = result.context
      reply = result.reply
    } catch {
      reply = {
        text: 'I could not look that up just now. Check your connection and try again, or talk to our support team.',
        actions: [{ label: 'Talk to support', href: '/support' }],
      }
    }

    const wait = THINKING_MS - (Date.now() - started)
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))

    setMessages((all) => [...all, { id: nextId.current++, from: 'assistant', reply }])
    setThinking(false)
  }

  // The prompt tapped on the search screen, sent once on arrival.
  useEffect(() => {
    if (!q || sentInitial.current) return
    sentInitial.current = true
    void send(q)
    // `send` is stable enough for a run-once effect; re-running on its
    // identity would send the prompt twice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  const lastId = messages[messages.length - 1]?.id
  const canSend = draft.trim().length > 0 && !thinking

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-bg"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Header
        title={`${brand.name} Assistant`}
        subtitle="Answers from our technicians' repair guides"
        showBack
        backFallback="/search"
      />

      <ScrollView
        ref={scroller}
        className="flex-1"
        contentContainerClassName="gap-4 px-4 pb-6 pt-4"
        keyboardShouldPersistTaps="handled"
        // Every new message, and the typing dots, scroll into view.
        onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((message) =>
          message.from === 'customer' ? (
            <View
              key={message.id}
              className="max-w-[85%] self-end bg-brand px-4 py-2.5"
              style={{ borderRadius: 12, borderBottomRightRadius: 4 }}
            >
              <Text className="text-sm text-white">{message.text}</Text>
            </View>
          ) : (
            <AssistantBubble
              key={message.id}
              reply={message.reply}
              // Only the newest answer's quick replies are live; tapping an
              // old one would answer a question nobody is asking any more.
              {...(message.id === lastId ? { onQuickReply: (text: string) => void send(text) } : {})}
            />
          )
        )}

        {thinking ? <Typing /> : null}
      </ScrollView>

      <View className="border-t border-border bg-bg" style={{ paddingBottom: insets.bottom }}>
        <View className="flex-row items-center gap-2 px-4 py-3">
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Describe the problem…"
            accessibilityLabel="Describe the problem"
            autoComplete="off"
            autoCorrect
            enterKeyHint="send"
            returnKeyType="send"
            submitBehavior="submit"
            onSubmitEditing={() => void send(draft)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholderTextColor={placeholder}
            selectionColor={selection}
            cursorColor={selection}
            className={cn(
              'h-12 min-w-0 flex-1 rounded-pill border bg-bg px-4 font-normal text-base text-ink',
              focused ? 'border-brand' : 'border-border'
            )}
          />
          <Tappable
            onPress={() => void send(draft)}
            disabled={!canSend}
            accessibilityLabel="Send"
            accessibilityState={{ disabled: !canSend }}
            className={cn(
              'size-12 shrink-0 items-center justify-center rounded-full',
              canSend ? 'bg-brand' : 'bg-border'
            )}
          >
            <Icon as={ArrowUp} className={cn('size-5', canSend ? 'text-white' : 'text-muted')} />
          </Tappable>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

/** Three dots bouncing in turn, the web's `animate-bounce` staggered by 150ms. */
function Typing() {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="The assistant is typing"
      accessibilityLiveRegion="polite"
      className="flex-row items-center gap-1.5 self-start bg-surface px-4 py-3"
      style={{ borderRadius: 12, borderBottomLeftRadius: 4 }}
    >
      {[0, 150, 300].map((delay) => (
        <Dot key={delay} delay={delay} />
      ))}
    </View>
  )
}

function Dot({ delay }: { delay: number }) {
  const lift = useSharedValue(0)
  useEffect(() => {
    lift.value = withDelay(
      delay,
      withRepeat(
        withSequence(withTiming(-4, { duration: 300 }), withTiming(0, { duration: 300 })),
        -1,
        false,
        undefined,
        ReduceMotion.System
      ),
      ReduceMotion.System
    )
  }, [delay, lift])
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: lift.value }] }))
  return <Animated.View style={style} className="size-1.5 rounded-full bg-muted" />
}

function AssistantBubble({
  reply,
  onQuickReply,
}: {
  reply: AssistantReply
  onQuickReply?: (text: string) => void
}) {
  const avatar = useTokenColors(['art-violet', 'art-magenta'] as const)
  return (
    <View className="max-w-[92%] flex-row gap-2.5">
      <LinearGradient
        colors={avatar}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ width: 32, height: 32, borderRadius: 16, marginTop: 2, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon as={Sparkles} className="size-4 text-white" />
      </LinearGradient>

      <View className="min-w-0 flex-1">
        <View className="bg-surface px-4 py-3" style={{ borderRadius: 12, borderTopLeftRadius: 4 }}>
          {reply.issue ? (
            <Text className="mb-1 text-sm font-semibold text-ink">{reply.issue}</Text>
          ) : null}
          <Text className="text-sm leading-[22px] text-ink">{reply.text}</Text>

          {reply.causes?.length ? (
            <BulletSection icon={Wrench} title="Likely causes" items={reply.causes} />
          ) : null}

          {reply.tips?.length ? (
            <BulletSection icon={Lightbulb} title="Worth trying first" items={reply.tips} />
          ) : null}
        </View>

        {reply.actions?.length ? (
          <View className="mt-2 gap-2">
            {reply.actions.map((action) => (
              <Tappable
                key={action.href + action.label}
                href={routeOf(action.href)}
                className={cn(
                  'min-h-11 items-center justify-center rounded-pill px-4',
                  action.primary
                    ? 'bg-brand active:bg-brand-deep active:opacity-100'
                    : 'border border-border active:border-brand'
                )}
              >
                <Text
                  className={cn(
                    'text-center text-sm font-semibold',
                    action.primary ? 'text-white' : 'text-brand'
                  )}
                >
                  {action.label}
                </Text>
              </Tappable>
            ))}
          </View>
        ) : null}

        {onQuickReply && reply.quickReplies?.length ? (
          <View className="mt-2 flex-row flex-wrap gap-2">
            {reply.quickReplies.map((option) => (
              <Tappable
                key={option}
                onPress={() => onQuickReply(option)}
                className="min-h-10 justify-center rounded-card border border-border bg-bg px-3 active:border-brand"
              >
                <Text className="text-sm text-ink">{option}</Text>
              </Tappable>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  )
}

function BulletSection({ icon, title, items }: { icon: LucideIcon; title: string; items: readonly string[] }) {
  return (
    <View className="mt-3">
      <View className="flex-row items-center gap-1.5" accessibilityRole="header">
        <Icon as={icon} className="size-3.5 text-muted" />
        <Text className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</Text>
      </View>
      <View className="mt-1.5 gap-1" accessibilityRole="list">
        {items.map((item) => (
          <View key={item} className="flex-row gap-2 pl-1.5">
            <Text className="text-sm leading-[22px] text-ink">•</Text>
            <Text className="min-w-0 flex-1 text-sm leading-[22px] text-ink">{item}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}
