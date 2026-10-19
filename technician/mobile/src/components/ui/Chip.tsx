import { View } from 'react-native'
import { Flame } from 'lucide-react-native'
import { cn } from '@/lib/cn'
import { STATUS, type Tone } from '@/lib/status'
import type { JobStatus, Priority } from '@/lib/types'
import { Icon } from '../base/Icon'
import { Tappable } from '../base/Tappable'
import { Inherit, Text } from '../base/Text'
import { Blink } from './Blink'
import { Labelled } from './Button'

const toneClass: Record<Tone, { chip: string; text: string; dot: string; rail: string }> = {
  brand: { chip: 'bg-brand-soft border-brand/15', text: 'text-brand', dot: 'bg-brand', rail: 'bg-brand' },
  warning: { chip: 'bg-warning-soft border-warning/20', text: 'text-warning', dot: 'bg-warning', rail: 'bg-warning' },
  info: { chip: 'bg-info-soft border-info/20', text: 'text-info', dot: 'bg-info', rail: 'bg-info' },
  violet: { chip: 'bg-violet-soft border-violet/20', text: 'text-violet', dot: 'bg-violet', rail: 'bg-violet' },
  success: { chip: 'bg-success-soft border-success/20', text: 'text-success', dot: 'bg-success', rail: 'bg-success' },
  danger: { chip: 'bg-danger-soft border-danger/20', text: 'text-danger', dot: 'bg-danger', rail: 'bg-danger' },
  neutral: { chip: 'bg-canvas border-line', text: 'text-muted', dot: 'bg-faint', rail: 'bg-line-strong' },
}

export function toneRail(tone: Tone) {
  return toneClass[tone].rail
}

/** The tone's text colour, for a word or icon that sits outside a chip. */
export function toneText(tone: Tone) {
  return toneClass[tone].text
}

export function Chip({ tone, children, live, className }: { tone: Tone; children: React.ReactNode; live?: boolean; className?: string }) {
  const t = toneClass[tone]
  return (
    <View className={cn('h-6 flex-row items-center gap-1.5 self-start rounded-pill border px-2', t.chip, className)}>
      {live ? <Blink className={cn('size-1.5 rounded-full', t.dot)} /> : <View className={cn('size-1.5 rounded-full', t.dot)} />}
      <Inherit className={cn('text-[11px] font-bold', t.text)}>
        <Labelled>{children}</Labelled>
      </Inherit>
    </View>
  )
}

export function StatusChip({ status, className }: { status: JobStatus; className?: string }) {
  const s = STATUS[status]
  const live = ['on_the_way', 'diagnosis', 'repair'].includes(status)
  return (
    <Chip tone={s.tone} live={live} className={className}>
      {s.label}
    </Chip>
  )
}

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  if (priority === 'emergency')
    return (
      <View className={cn('h-6 flex-row items-center gap-1 self-start rounded-md bg-danger px-2', className)}>
        <Icon as={Flame} className="size-3.5 text-white" strokeWidth={2.4} />
        <Text className="text-[10.5px] font-extrabold uppercase tracking-wider text-white">Emergency</Text>
      </View>
    )
  if (priority === 'high')
    return (
      <View className={cn('h-6 flex-row items-center self-start rounded-md border border-warning/30 bg-warning-soft px-2', className)}>
        <Text className="text-[10.5px] font-extrabold uppercase tracking-wider text-warning">High priority</Text>
      </View>
    )
  return (
    <View className={cn('h-6 flex-row items-center self-start rounded-md bg-canvas px-2', className)}>
      <Text className="text-[10.5px] font-bold uppercase tracking-wider text-muted">Normal</Text>
    </View>
  )
}

export function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Tappable
      accessibilityState={{ selected: active }}
      onPress={onClick}
      hitSlop={6}
      className={cn(
        'h-9 shrink-0 flex-row items-center gap-1.5 rounded-pill border px-3.5',
        active ? 'border-ink bg-ink' : 'border-line-strong bg-card'
      )}
    >
      <Inherit className={cn('text-[13px] font-bold', active ? 'text-white' : 'text-ink-2')}>
        <Labelled>{children}</Labelled>
      </Inherit>
    </Tappable>
  )
}
