import { Linking, View } from 'react-native'
import { MessageSquare, Phone, Star } from 'lucide-react-native'
import type { TechnicianPublic } from '@app/shared'
import { Card, CardButton } from '@/components/ui/Card'
import { Tag } from '@/components/ui/Chip'
import { Icon } from '@/components/ui/Icon'
import { Img } from '@/components/ui/Img'
import { Tappable } from '@/components/ui/Tappable'
import { Text } from '@/components/ui/Text'
import { cn } from '@/lib/cn'

/**
 * The expert, as the customer sees them: name, rating, jobs done, the brands
 * they know. Nothing else about a technician reaches the client.
 *
 * The call button dials `maskedNumber`, which the backend hands over per
 * booking. The technician's real number is never in the document, so there is
 * nothing here to leak even if the rules were wrong.
 */

export interface TechnicianCardProps {
  technician: TechnicianPublic
  /** Brand names keyed by id, so the card can show "Samsung · LG". */
  brandNames?: Readonly<Record<string, string>>
  onSelect?: (technician: TechnicianPublic) => void
  selected?: boolean
  /** Only once a technician is assigned to a live booking. */
  maskedNumber?: string
  onMessage?: () => void
  className?: string
}

export function TechnicianCard({
  technician,
  brandNames,
  onSelect,
  selected = false,
  maskedNumber,
  onMessage,
  className,
}: TechnicianCardProps) {
  const specialisms = technician.specializations.map((id) => brandNames?.[id] ?? id.toUpperCase()).join(' · ')

  const body = (
    <View className="flex-row items-start gap-3 p-4">
      <View
        className={cn(
          'relative size-12 shrink-0 overflow-hidden rounded-full',
          technician.photo ? 'bg-plate' : 'bg-surface'
        )}
      >
        {technician.photo ? (
          <Img src={technician.photo} alt="" className="absolute inset-0" />
        ) : (
          <View className="size-full items-center justify-center">
            <Text className="text-base font-bold text-muted">{technician.name.charAt(0)}</Text>
          </View>
        )}
      </View>

      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-base font-semibold text-ink">
          {technician.name}
        </Text>
        <View className="mt-0.5 flex-row items-center gap-1.5">
          <Icon as={Star} className="size-3.5 text-ink" filled />
          <Text className="text-sm font-medium text-ink">{technician.rating.toFixed(1)}</Text>
          <Text aria-hidden className="text-sm text-muted">
            ·
          </Text>
          <Text className="text-sm text-muted">{technician.jobsCount} jobs</Text>
        </View>
        {specialisms ? <Tag className="mt-2">{specialisms}</Tag> : null}
      </View>
    </View>
  )

  if (onSelect) {
    return (
      <CardButton
        onPress={() => onSelect(technician)}
        selected={selected}
        ariaLabel={`${technician.name}, rated ${technician.rating.toFixed(1)}, ${technician.jobsCount} jobs`}
        {...(className ? { className } : {})}
      >
        {body}
      </CardButton>
    )
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      {body}
      {maskedNumber || onMessage ? (
        <View className="flex-row gap-2 border-t border-border p-3">
          {maskedNumber ? (
            <Tappable
              accessibilityRole="link"
              onPress={() => {
                void Linking.openURL(`tel:${maskedNumber}`)
              }}
              className="min-h-11 flex-1 flex-row items-center justify-center gap-2 rounded-pill border border-ink"
            >
              <Icon as={Phone} className="size-4 text-ink" />
              <Text className="text-sm font-semibold text-ink">Call</Text>
            </Tappable>
          ) : null}
          {onMessage ? (
            <Tappable
              onPress={onMessage}
              className="min-h-11 flex-1 flex-row items-center justify-center gap-2 rounded-pill border border-border"
            >
              <Icon as={MessageSquare} className="size-4 text-ink" />
              <Text className="text-sm font-semibold text-ink">Message</Text>
            </Tappable>
          ) : null}
        </View>
      ) : null}
      {maskedNumber ? (
        <Text className="px-3 pb-3 text-xs text-muted">
          Calls go through a masked number. Neither side sees the other&apos;s real phone number.
        </Text>
      ) : null}
    </Card>
  )
}
