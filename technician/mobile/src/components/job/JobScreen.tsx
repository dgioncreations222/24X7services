import { View } from 'react-native'
import { useLocalSearchParams, type Href } from 'expo-router'
import { SearchX } from 'lucide-react-native'
import { useJob, type PartnerJob } from '@/lib/data'
import { useT } from '@/lib/i18n'
import { Icon } from '../base/Icon'
import { Async } from '../ui/Async'
import { EmptyState } from '../ui/EmptyState'
import { ScreenHeader } from '../ui/Screen'
import { SkeletonList } from '../ui/Skeleton'

/**
 * The frame every job step screen shares: reads `?id=`, loads the job, and
 * shows a skeleton, an error with Try again, or "job not found" before the
 * screen's own content ever renders.
 */
export function JobScreen({
  title,
  back,
  children,
}: {
  title: (job: PartnerJob | null) => string
  back: (id: string) => Href
  children: (job: PartnerJob) => React.ReactNode
}) {
  const t = useT()
  const { id = '' } = useLocalSearchParams<{ id?: string }>()
  const query = useJob(id)
  const job = query.data ?? null
  return (
    <View className="flex-1 bg-canvas">
      <ScreenHeader back={back(id)} title={title(job)} subtitle={job ? `${job.displayId} · ${job.customer.name}` : undefined} />
      <Async
        query={query}
        loading={<SkeletonList className="p-4" rows={2} />}
        isEmpty={(j) => j === null}
        empty={
          <View className="p-4">
            <EmptyState icon={<Icon as={SearchX} className="size-6" />} title={t('Job not found')} body={t('It may have been cancelled or given to another technician.')} />
          </View>
        }
      >
        {(j) => children(j!)}
      </Async>
    </View>
  )
}
