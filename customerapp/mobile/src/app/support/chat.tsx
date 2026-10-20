import { useState } from 'react'
import { KeyboardAvoidingView, Platform, View } from 'react-native'
import { router, useLocalSearchParams, type Href } from 'expo-router'
import { supportCategorySchema, type SupportCategory } from '@app/shared'

import { Header, Screen } from '@/components/Screen'
import { CardButton } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Field'
import { Text } from '@/components/ui/Text'
import { useToast } from '@/components/Toast'
import { callFn, friendlyError } from '@/lib/callables'

/**
 * Starting a conversation.
 *
 * The category is asked first because it decides who picks the thread up and
 * what the first reply can usefully say. Six options, each named as a customer
 * would describe their problem rather than as the business files it.
 *
 * A booking can be attached, and usually should be — almost every support
 * question is about a specific job, and a thread that names one saves the first
 * three messages of every conversation.
 */

const CATEGORIES: readonly {
  value: SupportCategory
  title: string
  detail: string
}[] = [
  {
    value: 'booking',
    title: 'A booking',
    detail: 'The time, the address, or nobody turned up',
  },
  {
    value: 'payment',
    title: 'A payment',
    detail: 'A charge, a refund, or an invoice',
  },
  {
    value: 'technician',
    title: 'The expert',
    detail: 'How the visit went, or who came',
  },
  {
    value: 'warranty',
    title: 'A warranty',
    detail: 'The same fault has come back',
  },
  {
    value: 'brand_not_listed',
    title: 'A brand you do not list',
    detail: 'Ask whether we can still help',
  },
  {
    value: 'account',
    title: 'Your account',
    detail: 'Signing in, your details, closing it',
  },
  {
    value: 'other',
    title: 'Something else',
    detail: 'Anything that does not fit above',
  },
]

const MAX = 2000

export default function ChatScreen() {
  const params = useLocalSearchParams<{ booking?: string; about?: string }>()
  const toast = useToast()

  // Arriving from a booking carries it through, so the thread knows which job
  // it is about without anyone typing a reference.
  const bookingId = params.booking || null
  const initialCategory = supportCategorySchema.safeParse(params.about)

  const [category, setCategory] = useState<SupportCategory | null>(
    initialCategory.success ? initialCategory.data : null
  )
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | undefined>(undefined)
  const [sending, setSending] = useState(false)

  async function start(): Promise<void> {
    if (!category) {
      setError('Pick what this is about')
      return
    }
    if (message.trim().length === 0) {
      setError('Tell us what happened')
      return
    }

    setSending(true)
    try {
      const result = await callFn('createSupportTicket', {
        category,
        message: message.trim(),
        ...(bookingId ? { bookingId } : {}),
      })
      router.replace(`/support/tickets/detail?id=${result.ticketId}` as Href)
    } catch (caught) {
      toast.show(friendlyError(caught), { tone: 'error' })
    } finally {
      setSending(false)
    }
  }

  return (
    // The message box sits under seven cards, so the keyboard would cover it
    // without the screen making room.
    <KeyboardAvoidingView
      className="flex-1 bg-bg"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Screen header={<Header title="Tell us what happened" showBack backFallback="/support" />}>
        <View className="mt-5" accessibilityRole="radiogroup" accessibilityLabel="What is this about?">
          <Text className="text-sm font-semibold text-muted">What is this about?</Text>
          <View className="mt-2 gap-2">
            {CATEGORIES.map((option) => (
              <CardButton
                key={option.value}
                onPress={() => {
                  setCategory(option.value)
                  setError(undefined)
                }}
                selected={category === option.value}
                className="p-4"
              >
                <Text className="text-sm font-semibold text-ink">{option.title}</Text>
                <Text className="mt-0.5 text-sm text-muted">{option.detail}</Text>
              </CardButton>
            ))}
          </View>
        </View>

        <View className="mt-6">
          <Textarea
            label="What happened?"
            required
            value={message}
            onChangeText={(next) => {
              setMessage(next.slice(0, MAX))
              setError(undefined)
            }}
            maxLength={MAX}
            error={error}
            hint={
              bookingId
                ? 'This conversation is attached to the booking you came from.'
                : `In your own words. ${MAX - message.length} characters left.`
            }
            placeholder="The expert was due between 11 and 1 and nobody arrived."
            rows={5}
          />
        </View>

        <Button className="mt-6" fullWidth size="lg" loading={sending} onPress={() => void start()}>
          Send
        </Button>

        <Text className="mt-4 text-center text-xs leading-[20px] text-muted">
          You will get a first answer straight away, and a person any time you
          ask for one.
        </Text>
      </Screen>
    </KeyboardAvoidingView>
  )
}
