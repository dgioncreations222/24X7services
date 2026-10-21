import { View } from 'react-native'
import { Clock, MapPin } from 'lucide-react-native'
import type { PartnerJob } from '@/lib/data'
import { cn } from '@/lib/cn'
import { useT } from '@/lib/i18n'
import { rupees } from '@/lib/money'
import { clock, day } from '@/lib/when'
import { Icon } from '../base/Icon'
import { Tappable } from '../base/Tappable'
import { Text } from '../base/Text'
import { Chip } from '../ui/Chip'
import { JOB_STATUS, jobRoute } from './status'

/**
 * A job in a list, readable at arm's length: service, status, when, where
 * and what it pays. The whole card is the tap target.
 */
export function JobCard({ job }: { job: PartnerJob }) {
  const t = useT()
  const s = JOB_STATUS[job.status]
  const done = job.status === 'completed' || job.status === 'cancelled'
  return (
    <Tappable
      href={jobRoute(job.id, job.status)}
      accessibilityLabel={`${job.service.name}, ${t(s.label)}, ${day(job.slotStart)} ${clock(job.slotStart)}, ${job.address.area}`}
      className={cn('gap-3 rounded-card border bg-card p-4 shadow-card active:opacity-90', job.priority === 'emergency' && !done ? 'border-danger/40' : 'border-line')}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="text-base font-extrabold">
            {job.service.name}
          </Text>
          <Text className="text-xs font-semibold text-muted">
            {job.displayId} · {job.customer.name}
          </Text>
        </View>
        <Chip tone={job.priority === 'emergency' && !done ? 'danger' : s.tone} live={s.live}>
          {job.priority === 'emergency' && !done ? t('Emergency') : t(s.label)}
        </Chip>
      </View>
      <View className="flex-row flex-wrap items-center gap-x-4 gap-y-1">
        <View className="flex-row items-center gap-1.5">
          <Icon as={Clock} className="size-4 text-muted" />
          <Text className="text-sm font-semibold text-ink-2">
            {t(day(job.slotStart))}, {clock(job.slotStart)}
          </Text>
        </View>
        <View className="min-w-0 flex-row items-center gap-1.5">
          <Icon as={MapPin} className="size-4 text-muted" />
          <Text numberOfLines={1} className="shrink text-sm font-semibold text-ink-2">
            {job.address.area}
            {!done ? ` · ${job.distanceKm} km` : ''}
          </Text>
        </View>
        <Text className="num ml-auto text-base font-extrabold text-success">{rupees(job.earning)}</Text>
      </View>
    </Tappable>
  )
}
