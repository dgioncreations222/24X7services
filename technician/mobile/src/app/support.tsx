import { useState } from 'react'
import { Linking, TextInput, View } from 'react-native'
import { Check, ChevronDown, CircleCheck, Flag, Headset, MessageCircle, Phone, Siren } from 'lucide-react-native'
import { Button, Card, Field, FilterChip, Icon, Page, ScreenHeader, SectionTitle, Sheet, Tappable, Text, inputClass } from '@/components/ui'
import { BRAND } from '@/lib/brand'
import { cn } from '@/lib/cn'
import { useStore } from '@/lib/store'
import { COLORS } from '@/lib/theme'

const FAQ = [
  ['A customer wants work outside the booked service', 'Record it in diagnosis and add it to the bill as a separate line before starting. Never do unbilled work — it isn’t covered by the service warranty.'],
  ['The part I need is not in my van', 'Select it in Parts — it is marked Not Available and requested from the Kondapur hub automatically. Agree a revisit slot with the customer and note it in technician notes.'],
  ['Customer is not at home when I arrive', 'Call twice, wait 10 minutes, then use Report Issue → “Customer not reachable”. Dispatch will reschedule and you are paid the visit fee.'],
  ['How are payouts calculated?', 'You keep 80% of the service bill (labour + parts + additional charges). Payouts settle daily at 11 PM; cash collected is deducted from that day’s payout.'],
  ['Can I reject an assigned job?', 'Requests can be rejected freely. An already accepted job must be released through Chat Support so dispatch can reassign it without a late-cancellation mark.'],
  ['Handling a gas leak or electrical hazard', 'Stop work, isolate power or gas, move people away, and use Emergency Support. Do not continue the repair until a supervisor clears it.'],
] as const

const ISSUES = ['Customer not reachable', 'Wrong address', 'Payment dispute', 'Part not available', 'App problem', 'Safety concern']

const open = (url: string) => void Linking.openURL(url).catch(() => undefined)

export default function SupportScreen() {
  const { jobs } = useStore()
  const [expanded, setExpanded] = useState<number | null>(0)
  const [report, setReport] = useState(false)
  const [sent, setSent] = useState<number | null>(null)
  const [kind, setKind] = useState(ISSUES[0])
  const recent = jobs.filter((j) => j.status !== 'request').slice(0, 6)
  // The web's <select>: the related job, chosen from a short list.
  const [related, setRelated] = useState<string>(recent[0]?.id ?? '')
  const [picking, setPicking] = useState(false)
  const [details, setDetails] = useState('')
  const relatedJob = recent.find((j) => j.id === related)
  const relatedLabel = relatedJob ? `${relatedJob.id} · ${relatedJob.customer.name}` : 'Not about a job'

  return (
    <>
      <ScreenHeader back="/profile" title="Help & Support" subtitle="Partner desk · open round the clock" />
      <Page className="gap-5">
        <Tappable
          accessibilityRole="link"
          onPress={() => open('tel:+914068241111')}
          className="flex-row items-center gap-4 rounded-card bg-danger p-4"
        >
          <View className="size-12 items-center justify-center rounded-full bg-white/15">
            <Icon as={Siren} className="size-6 text-white" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-extrabold text-white">Emergency Support</Text>
            <Text className="text-sm font-medium text-white/80">Accident, safety hazard or threat on site</Text>
          </View>
          <Icon as={Phone} className="size-5 text-white" />
        </Tappable>

        <View className="flex-row gap-3">
          <Tile
            icon={Phone}
            bg="bg-success-soft"
            fg="text-success"
            title="Call Support"
            sub="~1 min wait"
            role="link"
            onPress={() => open('tel:+914068241000')}
          />
          <Tile
            icon={MessageCircle}
            bg="bg-brand-soft"
            fg="text-brand"
            title="Chat Support"
            sub="Replies in ~3 min"
            role="link"
            onPress={() => open('https://wa.me/914068241000')}
          />
          <Tile icon={Flag} bg="bg-warning-soft" fg="text-warning" title="Report Issue" sub="About a job" onPress={() => setReport(true)} />
        </View>

        <View>
          <SectionTitle>FAQ</SectionTitle>
          <Card>
            {FAQ.map(([q, a], i) => (
              <View key={q} className={cn(i > 0 && 'border-t border-line')}>
                <Tappable
                  accessibilityState={{ expanded: expanded === i }}
                  onPress={() => setExpanded(expanded === i ? null : i)}
                  className="w-full flex-row items-center gap-3 p-4"
                >
                  <Text className="flex-1 text-sm font-extrabold">{q}</Text>
                  <View style={expanded === i ? { transform: [{ rotate: '180deg' }] } : undefined}>
                    <Icon as={ChevronDown} className="size-4 shrink-0 text-muted" />
                  </View>
                </Tappable>
                {expanded === i && <Text className="-mt-1 px-4 pb-4 text-sm font-medium leading-relaxed text-muted">{a}</Text>}
              </View>
            ))}
          </Card>
        </View>

        <View className="flex-row items-center justify-center gap-2">
          <Icon as={Headset} className="size-4 text-faint" />
          <Text className="shrink text-xs font-semibold text-faint">Partner desk 040 6824 1000 · partners@{BRAND.domain}</Text>
        </View>
      </Page>

      <Sheet
        open={report && !picking}
        onClose={() => {
          setReport(false)
          setSent(null)
          setDetails('')
        }}
        title="Report an issue"
      >
        {sent !== null ? (
          <View className="items-center py-4">
            <Icon as={CircleCheck} className="size-12 text-success" />
            <Text className="mt-3 text-center font-extrabold">Ticket raised · #SUP-{sent}</Text>
            <Text className="mt-1 text-center text-sm text-muted">The partner desk will call you back within 15 minutes.</Text>
            <Button
              className="mt-5 w-full"
              onPress={() => {
                setReport(false)
                setSent(null)
                setDetails('')
              }}
            >
              Done
            </Button>
          </View>
        ) : (
          <View className="gap-4">
            <View>
              <Text className="mb-2 text-sm font-bold text-ink-2">What happened?</Text>
              <View className="flex-row flex-wrap gap-2">
                {ISSUES.map((i) => (
                  <FilterChip key={i} active={kind === i} onClick={() => setKind(i)}>
                    {i}
                  </FilterChip>
                ))}
              </View>
            </View>
            <Field label="Related job">
              <Tappable
                accessibilityRole="button"
                accessibilityLabel={`Related job: ${relatedLabel}`}
                onPress={() => setPicking(true)}
                className={cn(inputClass, 'flex-row items-center gap-2')}
              >
                <Text numberOfLines={1} className="flex-1 text-base">
                  {relatedLabel}
                </Text>
                <Icon as={ChevronDown} className="size-4 text-muted" />
              </Tappable>
            </Field>
            <Field label="Details">
              <TextInput
                multiline
                numberOfLines={3}
                value={details}
                onChangeText={setDetails}
                textAlignVertical="top"
                className={cn(inputClass, 'min-h-[88px]')}
                placeholder="Tell us what happened"
                placeholderTextColor={COLORS.faint}
              />
            </Field>
            <Button
              size="lg"
              className="w-full"
              // The web form's `required` on the details box.
              disabled={!details.trim()}
              onPress={() => setSent(Math.floor(Date.now() / 1000) % 100000)}
            >
              Submit report
            </Button>
          </View>
        )}
      </Sheet>

      <Sheet open={picking} onClose={() => setPicking(false)} title="Related job">
        <View className="-mx-4 -my-4">
          {[...recent.map((j) => ({ id: j.id, label: `${j.id} · ${j.customer.name}` })), { id: '', label: 'Not about a job' }].map((o, i) => (
            <Tappable
              key={o.id || 'none'}
              accessibilityRole="radio"
              accessibilityState={{ checked: related === o.id }}
              onPress={() => {
                setRelated(o.id)
                setPicking(false)
              }}
              className={cn('flex-row items-center gap-3 p-4 active:bg-canvas active:opacity-100', i > 0 && 'border-t border-line')}
            >
              <Text numberOfLines={1} className={cn('num flex-1 text-sm', related === o.id ? 'font-extrabold text-brand' : 'font-semibold')}>
                {o.label}
              </Text>
              {related === o.id && <Icon as={Check} className="size-4 text-brand" />}
            </Tappable>
          ))}
        </View>
      </Sheet>
    </>
  )
}

function Tile({
  icon,
  bg,
  fg,
  title,
  sub,
  role = 'button',
  onPress,
}: {
  icon: typeof Phone
  bg: string
  fg: string
  title: string
  sub: string
  role?: 'button' | 'link'
  onPress: () => void
}) {
  return (
    <Tappable
      accessibilityRole={role}
      onPress={onPress}
      className="flex-1 items-center gap-2 rounded-card border border-line bg-card p-4 shadow-card active:border-line-strong"
    >
      <View className={cn('size-11 items-center justify-center rounded-full', bg)}>
        <Icon as={icon} className={cn('size-5', fg)} />
      </View>
      <Text className="text-center text-sm font-extrabold">{title}</Text>
      <Text className="text-center text-[11px] font-semibold text-muted">{sub}</Text>
    </Tappable>
  )
}
