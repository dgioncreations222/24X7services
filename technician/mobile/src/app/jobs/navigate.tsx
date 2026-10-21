import { ActivityIndicator, Linking, View } from 'react-native'
import { router } from 'expo-router'
import { MapPin, Navigation } from 'lucide-react-native'
import { JobScreen } from '@/components/job/JobScreen'
import { useAction } from '@/components/job/useAction'
import { ActionDock, Button, Card, Icon, Page, Text } from '@/components/ui'
import { markArrived, markOnTheWay, type PartnerJob } from '@/lib/data'
import { directionsHref } from '@/lib/format'
import { useT } from '@/lib/i18n'
import { COLORS } from '@/lib/theme'

/**
 * Getting there: open the route in Google Maps, tell the customer you're on
 * the way, and tap Arrived at the door — which leads straight to Start Job.
 */
export default function NavigateScreen() {
  const t = useT()
  return (
    <JobScreen title={() => t('Go to customer')} back={(id) => `/jobs/detail?id=${id}`}>
      {(job) => <Navigate job={job} />}
    </JobScreen>
  )
}

function Navigate({ job }: { job: PartnerJob }) {
  const t = useT()
  const { run, busy, error } = useAction()
  const geo = job.address.geo
  const maps = geo ? directionsHref(geo.lat, geo.lng) : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${job.address.flat}, ${job.address.area}, ${job.address.city}`)}`

  const step =
    job.status === 'assigned'
      ? { label: t('I’m on the way'), action: () => run(() => markOnTheWay(job.id)) }
      : job.status === 'en_route'
        ? { label: t('I’ve arrived'), action: () => run(() => markArrived(job.id), () => router.replace(`/jobs/start?id=${job.id}`)) }
        : null

  return (
    <>
      <Page className="gap-5">
        <Card className="gap-4 p-5">
          <View className="flex-row items-start gap-3">
            <View className="size-12 items-center justify-center rounded-full bg-brand-soft">
              <Icon as={MapPin} className="size-6 text-brand" />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-lg font-extrabold">{job.address.flat}</Text>
              <Text className="text-base text-ink-2">
                {job.address.area}, {job.address.city}
              </Text>
              {job.address.landmark ? <Text className="text-sm text-muted">{t('Near {place}', { place: job.address.landmark })}</Text> : null}
            </View>
          </View>
          <View className="flex-row gap-6 border-t border-line pt-4">
            <View>
              <Text className="text-xs font-bold uppercase text-faint">{t('Distance')}</Text>
              <Text className="num text-xl font-extrabold">{job.distanceKm} km</Text>
            </View>
            <View>
              <Text className="text-xs font-bold uppercase text-faint">{t('About')}</Text>
              <Text className="num text-xl font-extrabold">{t('{min} min', { min: job.etaMin })}</Text>
            </View>
          </View>
          <Button size="lg" variant="dark" onPress={() => Linking.openURL(maps)} className="w-full">
            <Icon as={Navigation} className="size-5" />
            {t('Open in Google Maps')}
          </Button>
        </Card>

        {job.status === 'en_route' ? (
          <Text className="text-center text-sm font-semibold text-muted">{t('The customer can see you’re on the way.')}</Text>
        ) : null}
        {error ? <Text className="text-center text-sm font-semibold text-danger">{error}</Text> : null}
      </Page>

      {step ? (
        <ActionDock>
          <Button size="lg" variant={job.status === 'en_route' ? 'success' : 'primary'} disabled={busy} onPress={step.action} className="flex-1">
            {busy ? <ActivityIndicator color={COLORS.white} /> : step.label}
          </Button>
        </ActionDock>
      ) : null}
    </>
  )
}
