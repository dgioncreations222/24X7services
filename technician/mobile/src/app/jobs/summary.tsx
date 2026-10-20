import { View } from 'react-native'
import { CircleCheck, Clock } from 'lucide-react-native'
import { JobScreen } from '@/components/job/JobScreen'
import { ActionDock, Button, Card, Icon, Label, Page, SectionTitle, Text } from '@/components/ui'
import type { PartnerJob } from '@/lib/data'
import { cn } from '@/lib/cn'
import { useT } from '@/lib/i18n'
import { rupees } from '@/lib/money'

/**
 * The finished job's bill and whether the customer has paid — status only.
 * Payment happens in the customer's app; nothing is collected here.
 */
export default function SummaryScreen() {
  const t = useT()
  return (
    <JobScreen title={() => t('Job summary')} back={() => '/jobs?tab=completed'}>
      {(job) => <Summary job={job} />}
    </JobScreen>
  )
}

function Summary({ job }: { job: PartnerJob }) {
  const t = useT()
  const approved = job.extras.filter((e) => e.status === 'approved')
  const service = job.payment.amount - approved.reduce((s, e) => s + e.amount, 0)
  const paid = job.payment.status === 'paid'

  return (
    <>
      <Page className="gap-5">
        <Card className={cn('flex-row items-center gap-3 p-4', paid ? 'border-success/30 bg-success-soft' : 'border-warning/30 bg-warning-soft')}>
          <Icon as={paid ? CircleCheck : Clock} className={cn('size-7', paid ? 'text-success' : 'text-warning')} />
          <View className="min-w-0 flex-1" accessibilityLiveRegion="polite">
            <Text className="text-base font-extrabold">{paid ? t('Customer has paid') : t('Waiting for the customer to pay')}</Text>
            <Text className="text-sm text-ink-2">{paid ? t('Your earning goes into this week’s payout.') : t('They pay in their app. This updates by itself.')}</Text>
          </View>
        </Card>

        <View>
          <SectionTitle>{t('Bill')}</SectionTitle>
          <Card>
            <Line label={job.service.name} value={rupees(service)} />
            {approved.map((e) => (
              <Line key={e.id} label={e.name} value={rupees(e.amount)} />
            ))}
            <View className="flex-row items-center justify-between border-t border-line px-4 py-3">
              <Text className="text-base font-extrabold">{t('Total')}</Text>
              <Text className="num text-xl font-extrabold">{rupees(job.payment.amount)}</Text>
            </View>
          </Card>
        </View>

        <Card className="flex-row items-center justify-between p-4">
          <View>
            <Label>{t('You earn')}</Label>
            <Text className="num text-2xl font-extrabold text-success">{rupees(job.earning)}</Text>
          </View>
          <View className="items-end">
            <Label>{t('Photos')}</Label>
            <Text className="text-sm font-semibold text-ink-2">
              {job.photos.before.length} {t('before')} · {job.photos.after.length} {t('after')}
            </Text>
          </View>
        </Card>
      </Page>
      <ActionDock>
        <Button size="lg" href="/home" replace className="flex-1">
          {t('Back to Home')}
        </Button>
      </ActionDock>
    </>
  )
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between gap-3 px-4 py-3">
      <Text className="min-w-0 flex-1 text-base text-ink-2">{label}</Text>
      <Text className="num text-base font-bold">{value}</Text>
    </View>
  )
}
