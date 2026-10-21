import { ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { JobScreen } from '@/components/job/JobScreen'
import { PhotoSlots } from '@/components/job/PhotoSlots'
import { useAction } from '@/components/job/useAction'
import { ActionDock, Button, Card, Page, SectionTitle, Text } from '@/components/ui'
import { startJob, type PartnerJob } from '@/lib/data'
import { useT } from '@/lib/i18n'
import { COLORS } from '@/lib/theme'

/**
 * Before photos, then Start. Start stays disabled until at least one photo
 * is saved: the record of how the appliance was found protects the
 * technician as much as the customer.
 */
export default function StartJobScreen() {
  const t = useT()
  return (
    <JobScreen title={() => t('Start job')} back={(id) => `/jobs/detail?id=${id}`}>
      {(job) => <Start job={job} />}
    </JobScreen>
  )
}

function Start({ job }: { job: PartnerJob }) {
  const t = useT()
  const { run, busy, error } = useAction()
  const count = job.photos.before.length
  const ready = job.status === 'arrived' && count > 0

  return (
    <>
      <Page className="gap-5">
        <Card className="gap-1 p-4">
          <Text className="text-base font-extrabold">{t('Photos before you start')}</Text>
          <Text className="text-sm text-muted">{t('The appliance as you found it, and the model sticker. At least one.')}</Text>
        </Card>
        <SectionTitle count={count}>{t('Before photos')}</SectionTitle>
        <PhotoSlots job={job} kind="before" />
        {error ? <Text className="text-center text-sm font-semibold text-danger">{error}</Text> : null}
      </Page>
      <ActionDock>
        <Button size="lg" disabled={!ready || busy} onPress={() => run(() => startJob(job.id), () => router.replace(`/jobs/detail?id=${job.id}`))} className="flex-1">
          {busy ? <ActivityIndicator color={COLORS.white} /> : count ? t('Start job') : t('Add a before photo to start')}
        </Button>
      </ActionDock>
    </>
  )
}
