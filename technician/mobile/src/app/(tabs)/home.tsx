import { View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useIsFocused } from 'expo-router'
import { CalendarCheck } from 'lucide-react-native'
import { HomeHeader } from '@/components/home/HomeHeader'
import { JobCard } from '@/components/job/JobCard'
import { NEXT_STEP } from '@/components/job/nextStep'
import { OfferTimeLeft } from '@/components/job/OfferTimeLeft'
import { Async } from '@/components/ui/Async'
import { Button, Card, EmptyState, Icon, Page, SectionTitle, SkeletonCard } from '@/components/ui'
import { useJobs } from '@/lib/data'
import { useT } from '@/lib/i18n'
import { isToday } from '@/lib/when'

/**
 * Home: the online switch and today's numbers on top, then the job in hand
 * with its next step one tap away, then the rest of today.
 */
export default function HomeScreen() {
  const t = useT()
  const focused = useIsFocused()
  const ongoing = useJobs('ongoing')
  const offers = useJobs('offers')
  const upcoming = useJobs('upcoming')

  return (
    <Page className="gap-5 px-0 pt-0">
      {focused && <StatusBar style="light" />}
      <HomeHeader />

      <View className="gap-5 px-4">
        <Async query={ongoing} loading={<SkeletonCard />}>
          {(jobs) => {
            const job = jobs[0]!
            const next = NEXT_STEP[job.status]
            return (
              <View>
                <SectionTitle>{t('Job in hand')}</SectionTitle>
                <Card className="gap-3 border-brand/30 p-3">
                  <JobCard job={job} />
                  {next ? (
                    <Button size="lg" href={next.href(job.id)} className="w-full">
                      {t(next.label)}
                    </Button>
                  ) : null}
                </Card>
              </View>
            )
          }}
        </Async>

        {offers.data?.length ? (
          <View>
            <SectionTitle count={offers.data.length}>{t('New requests')}</SectionTitle>
            <View className="gap-3">
              {offers.data.map((j) => (
                <View key={j.id} className="gap-1.5">
                  <OfferTimeLeft id={j.id} />
                  <JobCard job={j} />
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View>
          <SectionTitle count={upcoming.data?.filter((j) => isToday(j.slotStart)).length}>{t('Today’s jobs')}</SectionTitle>
          <Async
            query={upcoming}
            isEmpty={(jobs) => !jobs.some((j) => isToday(j.slotStart))}
            empty={
              <EmptyState
                icon={<Icon as={CalendarCheck} className="size-6" />}
                title={t('No more jobs today')}
                body={t('Stay online — new requests pop up here.')}
              />
            }
          >
            {(jobs) => (
              <View className="gap-3">
                {jobs
                  .filter((j) => isToday(j.slotStart))
                  .map((j) => (
                    <JobCard key={j.id} job={j} />
                  ))}
              </View>
            )}
          </Async>
        </View>

        <Button variant="ghost" size="lg" href="/jobs" className="self-center">
          {t('All jobs')}
        </Button>
      </View>
    </Page>
  )
}
