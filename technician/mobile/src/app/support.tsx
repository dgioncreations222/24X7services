import { useState } from 'react'
import { Linking, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { ChevronDown, MessageSquarePlus, Phone, Ticket } from 'lucide-react-native'
import { RaiseTicketSheet, TOPIC_LABEL } from '@/components/account/RaiseTicketSheet'
import { Async } from '@/components/ui/Async'
import { Button, Card, Chip, EmptyState, Icon, Page, ScreenHeader, SectionTitle, SkeletonList, Tappable, Text } from '@/components/ui'
import { useFaqs, useTickets, type SupportTicket, type TicketTopic } from '@/lib/data'
import { cn } from '@/lib/cn'
import type { Tone } from '@/lib/status'
import { useT } from '@/lib/i18n'
import { shortDate } from '@/lib/when'

const DESK_PHONE = '+914068241000'

const STATUS: Record<SupportTicket['status'], { label: string; tone: Tone }> = {
  open: { label: 'Open', tone: 'warning' },
  in_progress: { label: 'In progress', tone: 'info' },
  resolved: { label: 'Resolved', tone: 'success' },
}

/** Help: call the desk, raise a ticket, see earlier tickets, read the FAQ. */
export default function SupportScreen() {
  const t = useT()
  // `?raise=payment` (from Payouts or Documents) opens the form on that topic.
  const { raise } = useLocalSearchParams<{ raise?: string }>()
  const preset = raise && raise in TOPIC_LABEL ? (raise as TicketTopic) : undefined
  const [open, setOpen] = useState(Boolean(preset))

  return (
    <View className="flex-1 bg-canvas">
      <ScreenHeader back="/profile" title={t('Help & Support')} />
      <Page className="gap-5">
        <View className="flex-row gap-2.5">
          <Button size="lg" className="flex-1" onPress={() => setOpen(true)}>
            <Icon as={MessageSquarePlus} className="size-5" />
            {t('Raise a ticket')}
          </Button>
          <Button
            size="lg"
            variant="secondary"
            className="flex-1"
            accessibilityRole="link"
            onPress={() => void Linking.openURL(`tel:${DESK_PHONE}`).catch(() => undefined)}
          >
            <Icon as={Phone} className="size-5" />
            {t('Call the desk')}
          </Button>
        </View>

        <Tickets />
        <Faqs />
      </Page>
      <RaiseTicketSheet open={open} onClose={() => setOpen(false)} topic={preset} />
    </View>
  )
}

function Tickets() {
  const t = useT()
  const query = useTickets()
  return (
    <View>
      <SectionTitle>{t('Your tickets')}</SectionTitle>
      <Async
        query={query}
        loading={<SkeletonList rows={1} />}
        empty={<EmptyState icon={<Icon as={Ticket} className="size-6" />} title={t('No tickets yet')} body={t('Anything you raise shows here with the desk’s reply.')} />}
      >
        {(list) => (
          <Card>
            {list.map((tk, i) => {
              const s = STATUS[tk.status]
              return (
                <View key={tk.id} className={cn('gap-1 px-4 py-3.5', i > 0 && 'border-t border-line')}>
                  <View className="flex-row items-center justify-between gap-3">
                    <Text className="shrink text-base font-bold">{t(TOPIC_LABEL[tk.topic])}</Text>
                    <Chip tone={s.tone}>{t(s.label)}</Chip>
                  </View>
                  <Text className="num text-sm text-muted">
                    {tk.id} · {shortDate(tk.createdAt)}
                  </Text>
                  <Text numberOfLines={2} className="text-base text-ink-2">
                    {tk.details}
                  </Text>
                  {tk.reply ? (
                    <View className="mt-1 rounded-xl bg-canvas p-3">
                      <Text className="text-xs font-bold text-muted">{t('Reply from the desk')}</Text>
                      <Text className="mt-0.5 text-sm text-ink-2">{tk.reply}</Text>
                    </View>
                  ) : null}
                </View>
              )
            })}
          </Card>
        )}
      </Async>
    </View>
  )
}

function Faqs() {
  const t = useT()
  const query = useFaqs()
  const [expanded, setExpanded] = useState<string | null>(null)
  return (
    <View>
      <SectionTitle>{t('Common questions')}</SectionTitle>
      <Async query={query} loading={<SkeletonList rows={2} />}>
        {(faqs) => (
          <Card>
            {faqs.map((f, i) => {
              const on = expanded === f.id
              return (
                <View key={f.id} className={cn(i > 0 && 'border-t border-line')}>
                  <Tappable
                    accessibilityState={{ expanded: on }}
                    onPress={() => setExpanded(on ? null : f.id)}
                    className="min-h-14 w-full flex-row items-center gap-3 px-4 py-3"
                  >
                    <Text className="flex-1 text-base font-bold">{t(f.question)}</Text>
                    <View style={on ? { transform: [{ rotate: '180deg' }] } : undefined}>
                      <Icon as={ChevronDown} className="size-5 text-muted" />
                    </View>
                  </Tappable>
                  {on ? <Text className="-mt-1 px-4 pb-4 text-base text-ink-2">{t(f.answer)}</Text> : null}
                </View>
              )
            })}
          </Card>
        )}
      </Async>
    </View>
  )
}
