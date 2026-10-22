import { useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { router } from 'expo-router'
import { Clock, MapPin } from 'lucide-react-native'
import { JobScreen } from '@/components/job/JobScreen'
import { answerOffer, OFFER_SECONDS, useOfferCountdown } from '@/components/job/useOfferCountdown'
import { ActionDock, Button, Card, Icon, Label, Page, SectionTitle, Text } from '@/components/ui'
import { acceptJob, rejectJob, type PartnerJob } from '@/lib/data'
import { cn } from '@/lib/cn'
import { useT } from '@/lib/i18n'
import { rupees } from '@/lib/money'
import { COLORS } from '@/lib/theme'
import { clock, day } from '@/lib/when'

/**
 * A new request in full: what, where, when, what it pays and what the
 * customer said — on the same 30-second clock as the popup.
 */
export default function RequestScreen() {
  const t = useT()
  return (
    <JobScreen title={() => t('New job request')} back={() => '/home'}>
      {(job) => (job.status === 'offered' ? <Offer job={job} /> : <Taken job={job} />)}
    </JobScreen>
  )
}

function Offer({ job }: { job: PartnerJob }) {
  const t = useT()
  const left = useOfferCountdown(job.id)
  const [busy, setBusy] = useState<'accept' | 'reject' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function answer(kind: 'accept' | 'reject') {
    setBusy(kind)
    setError(null)
    try {
      if (kind === 'accept') {
        await answerOffer(job.id, () => acceptJob(job.id))
        router.replace(`/jobs/detail?id=${job.id}`)
      } else {
        await answerOffer(job.id, () => rejectJob(job.id))
        router.replace('/home')
      }
    } catch {
      setError(t('Couldn’t reach the server. Try again.'))
      setBusy(null)
    }
  }

  return (
    <>
      <Page className="gap-5">
        <Card className={cn('gap-3 p-4', job.priority === 'emergency' ? 'border-danger/40' : 'border-brand/30')}>
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-bold uppercase tracking-wider text-muted">{job.priority === 'emergency' ? t('Emergency · respond now') : t('Answer within')}</Text>
            <Text className={cn('num text-2xl font-extrabold', left <= 10 ? 'text-danger' : 'text-ink')}>{left}s</Text>
          </View>
          <View className="h-2 overflow-hidden rounded-full bg-line">
            <View className={cn('h-full rounded-full', left <= 10 ? 'bg-danger' : 'bg-brand')} style={{ width: `${(left / OFFER_SECONDS) * 100}%` }} />
          </View>
          <Text className="text-xl font-extrabold">{job.service.name}</Text>
          <View className="flex-row items-center gap-1.5">
            <Icon as={MapPin} className="size-4 text-muted" />
            <Text className="text-base font-semibold">
              {job.address.area} · {job.distanceKm} km
            </Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <Icon as={Clock} className="size-4 text-muted" />
            <Text className="text-base font-semibold">
              {t(day(job.slotStart))}, {clock(job.slotStart)} · {t('{min} min', { min: job.durationMin })}
            </Text>
          </View>
          <View className="flex-row items-end justify-between border-t border-line pt-3">
            <Label>{t('You earn')}</Label>
            <Text className="num text-3xl font-extrabold text-success">{rupees(job.earning)}</Text>
          </View>
        </Card>

        <View>
          <SectionTitle>{t('What the customer told us')}</SectionTitle>
          <Card>
            {job.answers.map((a, i) => (
              <View key={a.questionId} className={`gap-0.5 px-4 py-3 ${i > 0 ? 'border-t border-line' : ''}`}>
                <Label>{a.label}</Label>
                <Text className="text-base font-semibold">{a.value}</Text>
              </View>
            ))}
          </Card>
        </View>
        <Text className="text-center text-xs text-muted">{t('The exact address and phone number show once you accept.')}</Text>
        {error ? <Text className="text-center text-sm font-semibold text-danger">{error}</Text> : null}
      </Page>
      <ActionDock>
        <Button size="lg" variant="secondary" className="flex-1" disabled={busy !== null} onPress={() => answer('reject')}>
          {busy === 'reject' ? <ActivityIndicator color={COLORS.ink} /> : t('Reject')}
        </Button>
        <Button size="lg" variant="success" className="flex-[2]" disabled={busy !== null || left === 0} onPress={() => answer('accept')}>
          {busy === 'accept' ? <ActivityIndicator color={COLORS.white} /> : t('Accept')}
        </Button>
      </ActionDock>
    </>
  )
}

/** Opened from an old link after the request was answered. */
function Taken({ job }: { job: PartnerJob }) {
  const t = useT()
  return (
    <Page className="gap-4">
      <Text className="text-center text-base font-semibold text-ink-2">{t('This request has been answered.')}</Text>
      <Button size="lg" href={`/jobs/detail?id=${job.id}`} replace>
        {t('Open the job')}
      </Button>
    </Page>
  )
}
