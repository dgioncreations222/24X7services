import { View } from 'react-native'
import { Clock } from 'lucide-react-native'
import { cn } from '@/lib/cn'
import { useT } from '@/lib/i18n'
import { Icon } from '../base/Icon'
import { Text } from '../base/Text'
import { useOfferCountdown } from './useOfferCountdown'

/**
 * How long is left to answer an offer, for a request waiting on Home rather
 * than popped up — the same clock as the pop-up, so it never vanishes unannounced.
 */
export function OfferTimeLeft({ id }: { id: string }) {
  const t = useT()
  const left = useOfferCountdown(id)
  const urgent = left <= 10
  return (
    // Not a live region: it changes twice a second and would talk over everything.
    <View className="flex-row items-center gap-1.5 self-start">
      <Icon as={Clock} className={cn('size-4', urgent ? 'text-danger' : 'text-muted')} />
      <Text className={cn('num text-sm font-bold', urgent ? 'text-danger' : 'text-ink-2')}>
        {t('Answer within')} {left}s
      </Text>
    </View>
  )
}
