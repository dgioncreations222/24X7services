import { ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { JobScreen } from '@/components/job/JobScreen'
import { PhotoSlots } from '@/components/job/PhotoSlots'
import { useAction } from '@/components/job/useAction'
import { ActionDock, Button, Card, Page, SectionTitle, Text } from '@/components/ui'
import { completeJob, type PartnerJob } from '@/lib/data'
import { useT } from '@/lib/i18n'
import { COLORS } from '@/lib/theme'

/**
 * After photos, then Complete. No signature, no rating on this phone, no
 * QR: the customer confirms, rates and pays in their own app.
 */
export default function CompleteJobScreen() {
  const t = useT()
  return (
    <JobScreen title={() => t('Complete job')} back={(id) => `/jobs/detail?id=${id}`}>
      {(job) => <Complete job={job} />}
    </JobScreen>
  )
}

function Complete({ job }: { job: PartnerJob }) {
  const t = useT()
  const { run, busy, error } = useAction()
  const count = job.photos.after.length
  const waiting = job.extras.some((e) => e.status === 'pending')
  const ready = job.status === 'in_progress' && count > 0 && !waiting

  const label = waiting ? t('Waiting for the customer to approve extras') : count ? t('Complete job') : t('Add an after photo to complete')

  return (
    <>
      <Page className="gap-5">
        <Card className="gap-1 p-4">
          <Text className="text-base font-extrabold">{t('Photos after the repair')}</Text>
          <Text className="text-sm text-muted">{t('The appliance working, and the replaced part if any. At least one.')}</Text>
        </Card>
        <SectionTitle count={count}>{t('After photos')}</SectionTitle>
        <PhotoSlots job={job} kind="after" />
        {error ? <Text className="text-center text-sm font-semibold text-danger">{error}</Text> : null}
      </Page>
      <ActionDock>
        <Button size="lg" variant="success" disabled={!ready || busy} onPress={() => run(() => completeJob(job.id), () => router.replace(`/jobs/summary?id=${job.id}`))} className="flex-1">
          {busy ? <ActivityIndicator color={COLORS.white} /> : label}
        </Button>
      </ActionDock>
    </>
  )
}
