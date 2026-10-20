import { View } from 'react-native'
import type { PartnerJob, PartnerJobStatus } from '@/lib/data'
import { cn } from '@/lib/cn'
import { useT } from '@/lib/i18n'
import { clock } from '@/lib/when'
import { Text } from '../base/Text'

const STEPS: { status: PartnerJobStatus; label: string }[] = [
  { status: 'assigned', label: 'Accepted' },
  { status: 'en_route', label: 'On the way' },
  { status: 'arrived', label: 'Arrived' },
  { status: 'in_progress', label: 'Started' },
  { status: 'completed', label: 'Completed' },
]

const ORDER: PartnerJobStatus[] = ['assigned', 'en_route', 'arrived', 'in_progress', 'awaiting_approval', 'completed']

/** Where the job is, step by step, with the time each step happened. */
export function StatusTimeline({ job }: { job: PartnerJob }) {
  const t = useT()
  const at = ORDER.indexOf(job.status === 'awaiting_approval' ? 'in_progress' : job.status)
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={t('Job progress')} className="flex-row">
      {STEPS.map((s, i) => {
        const reached = at >= ORDER.indexOf(s.status)
        const when = job.timeline.find((e) => e.status === s.status)?.at
        return (
          <View key={s.status} className="flex-1 items-center">
            <View className="w-full flex-row items-center">
              <View className={cn('h-1 flex-1', i === 0 ? 'opacity-0' : reached ? 'bg-success' : 'bg-line')} />
              <View className={cn('size-4 rounded-full border-2', reached ? 'border-success bg-success' : 'border-line-strong bg-card')} />
              <View className={cn('h-1 flex-1', i === STEPS.length - 1 ? 'opacity-0' : at > ORDER.indexOf(s.status) ? 'bg-success' : 'bg-line')} />
            </View>
            <Text numberOfLines={1} className={cn('mt-1.5 text-[11px] font-bold', reached ? 'text-ink' : 'text-faint')}>
              {t(s.label)}
            </Text>
            <Text className="num text-[10px] font-semibold text-muted">{when ? clock(when) : ' '}</Text>
          </View>
        )
      })}
    </View>
  )
}
