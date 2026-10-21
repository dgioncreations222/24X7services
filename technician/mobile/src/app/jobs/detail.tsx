import { Linking, View } from 'react-native'
import { MapPin, MessageSquareText, Phone, Plus } from 'lucide-react-native'
import { JobScreen } from '@/components/job/JobScreen'
import { NEXT_STEP } from '@/components/job/nextStep'
import { JOB_STATUS } from '@/components/job/status'
import { StatusTimeline } from '@/components/job/StatusTimeline'
import { ActionDock, Button, Card, Chip, Icon, Label, Page, SectionTitle, Tappable, Text } from '@/components/ui'
import type { PartnerJob } from '@/lib/data'
import { telHref } from '@/lib/format'
import { useT } from '@/lib/i18n'
import { rupees } from '@/lib/money'
import { clock, day } from '@/lib/when'

/**
 * One job: where it stands, the customer, the address, what they asked for
 * (their answers to the booking questions) and notes — with the next step
 * as the one big button at the bottom.
 */
export default function JobDetailScreen() {
  const t = useT()
  return (
    <JobScreen title={(j) => j?.service.name ?? t('Job')} back={() => '/jobs'}>
      {(job) => <Detail job={job} />}
    </JobScreen>
  )
}

function Detail({ job }: { job: PartnerJob }) {
  const t = useT()
  const next = NEXT_STEP[job.status]
  const working = job.status === 'in_progress' || job.status === 'awaiting_approval'
  const closed = job.status === 'completed' || job.status === 'cancelled'

  return (
    <>
      <Page className="gap-5">
        <Card className="gap-4 p-4">
          <View className="flex-row items-center justify-between">
            <Chip tone={job.priority === 'emergency' && !closed ? 'danger' : JOB_STATUS[job.status].tone} live={JOB_STATUS[job.status].live}>
              {job.priority === 'emergency' && !closed ? t('Emergency') : t(JOB_STATUS[job.status].label)}
            </Chip>
            <Text className="text-sm font-bold text-ink-2">
              {t(day(job.slotStart))}, {clock(job.slotStart)} · {t('{min} min', { min: job.durationMin })}
            </Text>
          </View>
          {job.status !== 'cancelled' ? <StatusTimeline job={job} /> : null}
        </Card>

        <View>
          <SectionTitle>{t('Customer')}</SectionTitle>
          <Card className="flex-row items-center gap-3 p-4">
            <View className="min-w-0 flex-1">
              <Text className="text-base font-extrabold">{job.customer.name}</Text>
              <Text className="text-sm text-muted">{t('Number is masked for privacy')}</Text>
            </View>
            {!closed ? (
              <>
                <RoundAction label={t('Call customer')} icon={Phone} onPress={() => Linking.openURL(telHref(job.customer.phone))} />
                <RoundAction label={t('Message customer')} icon={MessageSquareText} onPress={() => Linking.openURL(`sms:${job.customer.phone.replace(/\s/g, '')}`)} />
              </>
            ) : null}
          </Card>
        </View>

        <View>
          <SectionTitle>{t('Address')}</SectionTitle>
          <Card className="flex-row items-start gap-3 p-4">
            <Icon as={MapPin} className="mt-0.5 size-5 text-brand" />
            <View className="min-w-0 flex-1">
              <Text className="text-base font-bold">{job.address.flat}</Text>
              <Text className="text-sm text-ink-2">
                {job.address.area}, {job.address.city} {job.address.pincode}
              </Text>
              {job.address.landmark ? <Text className="text-sm text-muted">{t('Near {place}', { place: job.address.landmark })}</Text> : null}
              {!closed ? <Text className="mt-1 text-sm font-semibold text-muted">{t('{km} km away · about {min} min', { km: job.distanceKm, min: job.etaMin })}</Text> : null}
            </View>
          </Card>
        </View>

        <View>
          <SectionTitle>{t('What the customer told us')}</SectionTitle>
          <Card>
            {job.answers.map((a, i) => (
              <View key={a.questionId} className={`gap-0.5 px-4 py-3 ${i > 0 ? 'border-t border-line' : ''}`}>
                <Label>{a.label}</Label>
                <Text className="text-base font-semibold">{a.value}</Text>
              </View>
            ))}
            {job.notes ? (
              <View className="gap-0.5 border-t border-line bg-warning-soft px-4 py-3">
                <Label>{t('Note from customer')}</Label>
                <Text className="text-base font-semibold">{job.notes}</Text>
              </View>
            ) : null}
          </Card>
        </View>

        {job.extras.length ? (
          <View>
            <SectionTitle>{t('Extra parts & charges')}</SectionTitle>
            <Card>
              {job.extras.map((e, i) => (
                <View key={e.id} className={`flex-row items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-line' : ''}`}>
                  <Text className="min-w-0 flex-1 text-base font-semibold">{e.name}</Text>
                  <Chip tone={e.status === 'approved' ? 'success' : e.status === 'rejected' ? 'danger' : 'warning'}>{t(e.status === 'pending' ? 'Waiting' : e.status === 'approved' ? 'Approved' : 'Declined')}</Chip>
                  <Text className="num text-base font-extrabold">{rupees(e.amount)}</Text>
                </View>
              ))}
            </Card>
          </View>
        ) : null}

        <Card className="flex-row items-center justify-between p-4">
          <View>
            <Text className="text-sm font-bold text-muted">{t('You earn')}</Text>
            <Text className="num text-2xl font-extrabold text-success">{rupees(job.earning)}</Text>
          </View>
          <View className="items-end">
            <Text className="text-sm font-bold text-muted">{t('Customer pays')}</Text>
            <Text className="num text-lg font-extrabold">{rupees(job.payment.amount)}</Text>
          </View>
        </Card>
      </Page>

      {next || working ? (
        <ActionDock>
          {working ? (
            <Button size="lg" variant="secondary" href={`/jobs/parts?id=${job.id}`} className="flex-1">
              <Icon as={Plus} className="size-5" />
              {t('Add part')}
            </Button>
          ) : null}
          {next ? (
            <Button size="lg" href={next.href(job.id)} className="flex-[2]">
              {t(next.label)}
            </Button>
          ) : null}
        </ActionDock>
      ) : null}
    </>
  )
}

function RoundAction({ label, icon, onPress }: { label: string; icon: typeof Phone; onPress: () => void }) {
  return (
    <Tappable accessibilityLabel={label} onPress={onPress} className="size-12 items-center justify-center rounded-full bg-success-soft active:opacity-80">
      <Icon as={icon} className="size-5 text-success" />
    </Tappable>
  )
}
