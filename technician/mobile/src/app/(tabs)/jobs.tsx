import { useState } from 'react'
import { FlatList, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { BriefcaseBusiness } from 'lucide-react-native'
import { JobCard } from '@/components/job/JobCard'
import { Async } from '@/components/ui/Async'
import { EmptyState, Icon, ScreenHeader, Segmented, SkeletonList } from '@/components/ui'
import { useJobs, type JobsView } from '@/lib/data'
import { useT } from '@/lib/i18n'

type Tab = Exclude<JobsView, 'offers'>
const TABS: readonly Tab[] = ['upcoming', 'ongoing', 'completed']

/** `?tab=` picks the list; older links used `?chip=completed`. */
const tabFrom = (v?: string): Tab => (TABS.includes(v as Tab) ? (v as Tab) : 'upcoming')

const EMPTY: Record<Tab, { title: string; body: string }> = {
  upcoming: { title: 'No upcoming jobs', body: 'Accepted jobs wait here until you start the trip.' },
  ongoing: { title: 'Nothing in progress', body: 'A job moves here once you’re on the way.' },
  completed: { title: 'No finished jobs yet', body: 'Completed and cancelled jobs are kept here.' },
}

/** Jobs: Upcoming, Ongoing and Completed, each a scrolling list. */
export default function JobsScreen() {
  const t = useT()
  const params = useLocalSearchParams<{ tab?: string; chip?: string }>()
  const linked = params.tab ?? params.chip
  const [tab, setTab] = useState<Tab>(tabFrom(linked))
  // The tab stays mounted, so a later link to another list has to move it.
  const [seen, setSeen] = useState(linked)
  if (linked !== seen) {
    setSeen(linked)
    setTab(tabFrom(linked))
  }

  return (
    <View className="flex-1 bg-canvas">
      <ScreenHeader back="/home" title={t('Jobs')} />
      <View className="border-b border-line bg-card px-4 py-3">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'upcoming', label: t('Upcoming') },
            { value: 'ongoing', label: t('Ongoing') },
            { value: 'completed', label: t('Completed') },
          ]}
        />
      </View>
      <JobsList key={tab} tab={tab} />
    </View>
  )
}

function JobsList({ tab }: { tab: Tab }) {
  const t = useT()
  const query = useJobs(tab)
  return (
    <Async
      query={query}
      loading={<SkeletonList className="p-4" />}
      empty={
        <View className="p-4">
          <EmptyState icon={<Icon as={BriefcaseBusiness} className="size-6" />} title={t(EMPTY[tab].title)} body={t(EMPTY[tab].body)} />
        </View>
      }
    >
      {(jobs) => (
        <FlatList
          data={jobs}
          keyExtractor={(j) => j.id}
          renderItem={({ item }) => <JobCard job={item} />}
          contentContainerClassName="gap-3 p-4 pb-8"
          initialNumToRender={8}
          windowSize={7}
        />
      )}
    </Async>
  )
}
