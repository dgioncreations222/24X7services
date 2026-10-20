import { useEffect, useRef, useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams } from 'expo-router'
import { MessagesSquare, Send, UserRound } from 'lucide-react-native'
import type { SupportMessage, SupportTicket } from '@app/shared'

import { Header, Screen } from '@/components/Screen'
import { SignInPrompt } from '@/components/ProfileShell'
import { Chip } from '@/components/ui/Chip'
import { Button } from '@/components/ui/Button'
import { Icon, useColor } from '@/components/ui/Icon'
import { Text } from '@/components/ui/Text'
import { ErrorState } from '@/components/ui/States'
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { useToast } from '@/components/Toast'
import { callFn, friendlyError } from '@/lib/callables'
import { useAuth } from '@/lib/auth'
import { subscribeTicket, subscribeTicketMessages } from '@/lib/api/support'
import { relativeTime } from '@/lib/format'
import { cn } from '@/lib/cn'

/**
 * One conversation.
 *
 * Every message is written by the server, including the customer's own — the
 * rules refuse client writes to the thread entirely. That is what lets a reply
 * land in the same operation as the question, and what stops anything posting
 * as an agent.
 *
 * "Talk to a person" is on screen from the first reply and never moves. The
 * fastest way to make an automated first answer infuriating is to make the way
 * past it hard to find.
 */
export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>()
  const ticketId = id || null
  const { user, ready } = useAuth()

  // Signed out, the screen offers the sign-in and comes back here after it,
  // rather than bouncing to the login screen the way the web does.
  if (ready && !user) {
    return (
      <Screen header={<Header title="Conversation" showBack backFallback="/support/tickets" />}>
        <SignInPrompt
          icon={MessagesSquare}
          title="Your conversations"
          description="Anything you ask us collects here, with everything that was said."
          next={ticketId ? `/support/tickets/detail?id=${ticketId}` : '/support/tickets'}
        />
      </Screen>
    )
  }

  return <Conversation ticketId={ticketId} signedIn={Boolean(user)} />
}

function Conversation({ ticketId, signedIn }: { ticketId: string | null; signedIn: boolean }) {
  const toast = useToast()
  const insets = useSafeAreaInsets()
  const placeholder = useColor('text-muted')
  const selection = useColor('text-brand')

  const [ticket, setTicket] = useState<SupportTicket | null>(null)
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [loaded, setStatus] = useState<'loading' | 'ready' | 'missing'>('loading')
  // No id in the link means there is nothing to load: missing, without a round trip.
  const status = ticketId ? loaded : 'missing'
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [focused, setFocused] = useState(false)
  const scroller = useRef<ScrollView>(null)

  useEffect(() => {
    if (!signedIn || !ticketId) return

    const unsubscribeTicket = subscribeTicket(
      ticketId,
      (next) => {
        if (!next) {
          setStatus('missing')
          return
        }
        setTicket(next)
        setStatus('ready')
      },
      () => setStatus('missing')
    )

    const unsubscribeMessages = subscribeTicketMessages(ticketId, setMessages, () => setMessages([]))

    return () => {
      unsubscribeTicket()
      unsubscribeMessages()
    }
  }, [ticketId, signedIn])

  async function send(body: string): Promise<void> {
    if (!ticketId || body.trim().length === 0) return
    setSending(true)
    try {
      await callFn('sendSupportMessage', { ticketId, text: body.trim() })
      setText('')
    } catch (error) {
      toast.show(friendlyError(error), { tone: 'error' })
    } finally {
      setSending(false)
    }
  }

  async function escalate(): Promise<void> {
    if (!ticketId) return
    setSending(true)
    try {
      await callFn('escalateTicket', { ticketId })
    } catch (error) {
      toast.show(friendlyError(error), { tone: 'error' })
    } finally {
      setSending(false)
    }
  }

  const withAPerson = ticket?.assignee === 'human'
  const closed = ticket?.status === 'resolved'
  const lastReply = [...messages].reverse().find((m) => m.author !== 'user')
  const composer = status === 'ready' && !closed

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-bg"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Header
        title={ticket?.subject ?? 'Conversation'}
        {...(ticket ? { subtitle: closed ? 'Resolved' : withAPerson ? 'With a person' : 'Open' } : {})}
        showBack
        backFallback="/support/tickets"
      />

      <ScrollView
        ref={scroller}
        className="flex-1"
        contentContainerClassName="px-4 pb-4"
        contentContainerStyle={composer ? undefined : { paddingBottom: 16 + insets.bottom }}
        keyboardShouldPersistTaps="handled"
        // A new message should be visible without scrolling for it.
        onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: true })}
      >
        {status === 'loading' ? (
          <SkeletonGroup label="Loading" className="mt-6 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </SkeletonGroup>
        ) : status === 'missing' ? (
          <ErrorState
            className="py-20"
            kind="notFound"
            title="We could not find that conversation"
            description="It may have been removed, or the link may be out of date."
          />
        ) : (
          <>
            <View className="mt-5 gap-3">
              {messages.map((message) => (
                <Bubble key={message.id} message={message} />
              ))}
            </View>

            {/* Offered against the latest reply, so it reads as a response to
                what was just said rather than as a permanent escape hatch. */}
            {!withAPerson && !closed && lastReply ? (
              <View className="mt-3 flex-row flex-wrap gap-2">
                {lastReply.quickReplies.map((reply) =>
                  reply.toLowerCase().includes('person') ? (
                    <Chip key={reply} onPress={() => void escalate()}>
                      <Icon as={UserRound} className="size-3.5 text-ink" />
                      <Text numberOfLines={1} className="text-sm font-medium text-ink">
                        {reply}
                      </Text>
                    </Chip>
                  ) : (
                    <Chip key={reply} onPress={() => void send(reply)}>
                      {reply}
                    </Chip>
                  )
                )}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      {composer ? (
        <View
          className="border-t border-border bg-bg px-4 pt-3"
          style={{ paddingBottom: 12 + insets.bottom }}
        >
          <View className="flex-row items-end gap-2">
            <TextInput
              value={text}
              onChangeText={(next) => setText(next.slice(0, 2000))}
              maxLength={2000}
              placeholder="Type a message"
              accessibilityLabel="Your message"
              placeholderTextColor={placeholder}
              selectionColor={selection}
              cursorColor={selection}
              enterKeyHint="send"
              returnKeyType="send"
              submitBehavior="submit"
              onSubmitEditing={() => void send(text)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              className={cn(
                'min-h-12 flex-1 rounded-pill border bg-bg px-4 font-normal text-base text-ink',
                focused ? 'border-brand' : 'border-border'
              )}
            />
            <Button
              loading={sending}
              disabled={text.trim().length === 0}
              accessibilityLabel="Send"
              onPress={() => void send(text)}
              className="w-12 px-0"
            >
              <Icon as={Send} className="size-4 text-white" />
            </Button>
          </View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  )
}

function Bubble({ message }: { message: SupportMessage }) {
  const mine = message.author === 'user'
  const system = message.author === 'system'

  if (system) {
    return <Text className="py-1 text-center text-xs text-muted">{message.text}</Text>
  }

  return (
    <View className={cn('flex-row', mine ? 'justify-end' : 'justify-start')}>
      <View className="max-w-[85%]">
        <View
          className={cn(
            'rounded-card px-4 py-2.5',
            mine ? 'bg-ink' : 'border border-border bg-bg'
          )}
        >
          <Text className={cn('text-sm leading-[22px]', mine ? 'text-bg' : 'text-ink')}>
            {message.text}
          </Text>
        </View>
        <Text className={cn('mt-1 text-xs text-muted', mine ? 'text-right' : 'text-left')}>
          {/* Said plainly. A first reply that lets someone believe a person
              typed it is the thing they resent afterwards. */}
          {mine
            ? relativeTime(message.at)
            : `${message.author === 'agent' ? 'Support' : 'Automatic reply'} · ${relativeTime(message.at)}`}
        </Text>
      </View>
    </View>
  )
}
