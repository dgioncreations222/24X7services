import { useEffect, useState } from 'react'
import { ScrollView, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { Easing, FadeInDown, ReduceMotion, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated'
import { Check, CircleCheck, Receipt, Star, TriangleAlert } from 'lucide-react-native'
import { JobNotFound, useJobParam } from '@/components/JobParts'
import { SignaturePad } from '@/components/SignaturePad'
import { ActionDock, Button, Card, Icon, Label, Page, ScreenHeader, SectionTitle, Tappable, Text, inputClass } from '@/components/ui'
import { applianceTitle, inr } from '@/lib/catalog'
import { cn } from '@/lib/cn'
import { billTotal } from '@/lib/format'
import { stepHref } from '@/lib/routes'
import { useStore } from '@/lib/store'
import type { Job } from '@/lib/types'
import { COLORS } from '@/lib/theme'

const EASE = Easing.bezier(0.22, 0.61, 0.36, 1)

export default function Confirm() {
  const job = useJobParam()
  if (!job) return <JobNotFound />
  if (job.status === 'closed') return <Closed job={job} />
  return <ConfirmForm key={job.id} job={job} />
}

const TAGS = ['On time', 'Explained the problem', 'Clean work', 'Polite', 'Fair price']

function ConfirmForm({ job }: { job: Job }) {
  const store = useStore()
  const [agreed, setAgreed] = useState(false)
  const [signature, setSignature] = useState(job.confirmation?.signature ?? '')
  const [rating, setRating] = useState(job.confirmation?.rating ?? 0)
  const [review, setReview] = useState(job.confirmation?.review ?? '')
  const [tags, setTags] = useState<string[]>([])
  // The pad holds the touch while the customer signs; the page must not scroll under it.
  const [signing, setSigning] = useState(false)

  const paid = !!job.bill?.paid
  const ready = agreed && !!signature && rating > 0 && paid && job.status === 'confirmation'
  const missing = [!paid && 'payment', !agreed && 'confirmation', !signature && 'signature', !rating && 'rating'].filter(Boolean) as string[]

  return (
    <>
      <ScreenHeader back={stepHref('detail', job.id)} title="Customer confirmation" subtitle={`${job.id} · hand the phone to ${job.customer.name.split(' ')[0]}`} />
      <Page className="gap-5" scrollEnabled={!signing}>
        <View>
          <SectionTitle>Repair summary</SectionTitle>
          <Card className="p-4">
            <Text className="text-lg font-extrabold tracking-tight">{applianceTitle(job.brand, job.appliance)}</Text>
            <Text className="text-sm font-semibold text-muted">Reported: “{job.issue}”</Text>
            <View className="mt-4 gap-3 border-t border-line pt-4">
              <View>
                <Label>Problem found</Label>
                <Text className="mt-0.5 text-sm font-bold">{job.diagnosis?.problem ?? '—'}</Text>
              </View>
              <View>
                <Label>Work done</Label>
                <Text className="mt-0.5 text-sm font-semibold text-ink-2">{job.diagnosis?.repair ?? '—'}</Text>
              </View>
              {job.parts.length > 0 && (
                <View>
                  <Label>Parts replaced</Label>
                  <Text className="mt-0.5 text-sm font-semibold text-ink-2">{job.parts.map((p) => `${p.name} ×${p.qty}`).join(', ')}</Text>
                </View>
              )}
              <View>
                <Label>Service warranty</Label>
                <Text className="mt-0.5 text-sm font-semibold text-ink-2">30 days on labour · parts as per manufacturer</Text>
              </View>
            </View>
          </Card>
        </View>

        <Card className="flex-row items-center justify-between gap-3 p-4">
          <View>
            <Text className="text-sm font-bold text-muted">Total amount</Text>
            <Text className="num text-2xl font-extrabold tracking-tight">{inr(billTotal(job))}</Text>
          </View>
          {paid ? (
            <View className="flex-row items-center gap-1.5 rounded-lg bg-success-soft px-3 py-2">
              <Icon as={CircleCheck} className="size-4 text-success" />
              <Text className="text-sm font-extrabold text-success">Paid · {job.bill?.method === 'cash' ? 'Cash' : 'Online'}</Text>
            </View>
          ) : (
            <Tappable href={stepHref('bill', job.id)} className="flex-row items-center gap-1.5 rounded-lg bg-warning-soft px-3 py-2">
              <Icon as={Receipt} className="size-4 text-warning" />
              <Text className="text-sm font-extrabold text-warning">Payment pending</Text>
            </Tappable>
          )}
        </Card>

        <Tappable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: agreed }}
          onPress={() => setAgreed((v) => !v)}
          className={cn('flex-row items-start gap-3 rounded-card border-2 p-4 active:opacity-100', agreed ? 'border-success bg-success-soft' : 'border-line-strong bg-card')}
        >
          <View className={cn('mt-0.5 size-6 shrink-0 items-center justify-center rounded-md border-2', agreed ? 'border-success bg-success' : 'border-line-strong bg-card')}>
            {agreed && <Icon as={Check} className="size-4 text-white" strokeWidth={3} />}
          </View>
          <Text className="flex-1 text-sm font-semibold text-ink-2">
            I confirm my {applianceTitle(job.brand, job.appliance)} was repaired and tested in front of me, and I agree with the amount above.
          </Text>
        </Tappable>

        <View onTouchStart={() => setSigning(true)} onTouchEnd={() => setSigning(false)} onTouchCancel={() => setSigning(false)}>
          <SectionTitle>Customer signature</SectionTitle>
          <SignaturePad value={signature} onChange={setSignature} />
        </View>

        <View>
          <SectionTitle>Rate the service</SectionTitle>
          <Card className="p-4">
            <View className="flex-row justify-center gap-2" accessibilityRole="radiogroup" accessibilityLabel="Rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <Tappable
                  key={n}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: rating === n }}
                  accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`}
                  onPress={() => setRating(n)}
                  className="size-12 items-center justify-center"
                >
                  <Icon as={Star} className={cn('size-9', n <= rating ? 'text-warning' : 'text-line-strong')} fill={n <= rating ? COLORS.warning : undefined} strokeWidth={1.5} />
                </Tappable>
              ))}
            </View>
            <Text className="mt-1 h-5 text-center text-sm font-bold text-muted">{['', 'Poor', 'Below average', 'Okay', 'Good', 'Excellent'][rating]}</Text>
            <View className="mt-3 flex-row flex-wrap justify-center gap-2">
              {TAGS.map((t) => {
                const on = tags.includes(t)
                return (
                  <Tappable
                    key={t}
                    accessibilityState={{ selected: on }}
                    onPress={() => setTags((x) => (on ? x.filter((y) => y !== t) : [...x, t]))}
                    className={cn('h-9 items-center justify-center rounded-pill border px-3', on ? 'border-brand bg-brand-soft' : 'border-line-strong')}
                  >
                    <Text className={cn('text-xs font-bold', on ? 'text-brand' : 'text-ink-2')}>{t}</Text>
                  </Tappable>
                )
              })}
            </View>
            <TextInput
              value={review}
              onChangeText={setReview}
              multiline
              numberOfLines={2}
              textAlignVertical="top"
              placeholder="Anything else? (optional)"
              placeholderTextColor={COLORS.faint}
              className={cn(inputClass, 'mt-3 min-h-[64px] text-sm')}
            />
          </Card>
        </View>
      </Page>

      <ActionDock>
        <View className="w-full gap-2">
          {!ready && missing.length > 0 && (
            <View className="flex-row items-center gap-1.5">
              <Icon as={TriangleAlert} className="size-3.5 text-warning" />
              <Text className="text-xs font-bold text-warning">Needed to close: {missing.join(', ')}</Text>
            </View>
          )}
          <Button
            variant="success"
            size="lg"
            disabled={!ready}
            className="w-full"
            textClassName="font-extrabold"
            onPress={() => {
              const text = [tags.join(' · '), review.trim()].filter(Boolean).join(' — ')
              store.confirm(job.id, { signature, rating, review: text, at: new Date().toISOString() })
              store.advance(job.id, 'closed')
            }}
          >
            Close Job
          </Button>
        </View>
      </ActionDock>
    </>
  )
}

/** The web's `animate-pulse-ring`: a ring that swells out of the tick and fades. */
function PulseRing({ className }: { className?: string }) {
  const p = useSharedValue(0)
  useEffect(() => {
    p.value = withRepeat(withTiming(1, { duration: 1800, easing: EASE, reduceMotion: ReduceMotion.System }), -1)
    return () => cancelAnimation(p)
  }, [p])
  const style = useAnimatedStyle(() => ({ opacity: 0.7 * (1 - p.value), transform: [{ scale: 0.8 + 1.6 * p.value }] }))
  return <Animated.View pointerEvents="none" className={className} style={style} />
}

function Closed({ job }: { job: Job }) {
  const insets = useSafeAreaInsets()
  return (
    <ScrollView
      className="flex-1 bg-canvas"
      contentContainerClassName="grow items-center justify-center px-5"
      contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 96 }}
    >
      <Animated.View entering={FadeInDown.duration(280).easing(EASE.factory()).reduceMotion(ReduceMotion.System)} className="w-full max-w-sm items-center">
        <View className="size-24 items-center justify-center">
          <PulseRing className="absolute inset-3 rounded-full bg-success/30" />
          <View className="size-20 items-center justify-center rounded-full bg-success">
            <Icon as={Check} className="size-10 text-white" strokeWidth={3} />
          </View>
        </View>
        <Text accessibilityRole="header" className="mt-5 text-2xl font-extrabold tracking-tight">
          Job closed
        </Text>
        <Text className="mt-1 text-center text-sm font-medium text-muted">
          {job.id} · {applianceTitle(job.brand, job.appliance)}
        </Text>
        <Card className="mt-6 w-full">
          <View className="flex-row items-center justify-between p-4">
            <Text className="text-sm font-semibold text-muted">Amount</Text>
            <Text className="num font-extrabold">{inr(billTotal(job))}</Text>
          </View>
          <View className="flex-row items-center justify-between border-t border-line p-4">
            <Text className="text-sm font-semibold text-muted">Payment</Text>
            <Text className="font-extrabold text-success">{job.bill?.method === 'cash' ? 'Cash received' : 'Online received'}</Text>
          </View>
          {job.confirmation && (
            <View className="flex-row items-center justify-between border-t border-line p-4">
              <Text className="text-sm font-semibold text-muted">Customer rating</Text>
              <View className="flex-row items-center gap-1">
                <Text className="font-extrabold">{job.confirmation.rating}</Text>
                <Icon as={Star} className="size-4 text-warning" fill={COLORS.warning} />
              </View>
            </View>
          )}
        </Card>
        <View className="mt-6 w-full gap-2">
          <Button size="lg" textClassName="font-extrabold" href="/home" replace>
            Back to today’s jobs
          </Button>
          <Button variant="ghost" className="h-12" href={stepHref('bill', job.id)}>
            View service bill
          </Button>
        </View>
      </Animated.View>
    </ScrollView>
  )
}
