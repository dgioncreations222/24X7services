import { ActivityIndicator, View } from 'react-native'
import { RotateCcw, WifiOff } from 'lucide-react-native'
import { useT } from '@/lib/i18n'
import { COLORS } from '@/lib/theme'
import { Icon } from '../base/Icon'
import { Text } from '../base/Text'
import { Button } from './Button'

/**
 * Loading failed. Says so without blame — on a weak signal this is the usual
 * cause — and puts a full-width Retry under the thumb.
 */
export function ErrorState({
  title,
  body,
  onRetry,
  retrying = false,
}: {
  title?: string
  body?: string
  onRetry: () => void
  retrying?: boolean
}) {
  const t = useT()
  return (
    <View accessibilityRole="alert" className="items-center rounded-card border border-danger/20 bg-card px-6 py-10">
      <View className="mb-3 size-14 items-center justify-center rounded-full bg-danger-soft">
        <Icon as={WifiOff} className="size-6 text-danger" />
      </View>
      <Text accessibilityRole="header" className="text-center text-base font-extrabold">
        {title ?? t('Couldn’t load this')}
      </Text>
      <Text className="mt-1 max-w-xs text-center text-sm text-muted">{body ?? t('Check your internet and try again.')}</Text>
      <Button size="lg" className="mt-5 self-stretch" disabled={retrying} onPress={onRetry}>
        {retrying ? <ActivityIndicator color={COLORS.white} /> : <Icon as={RotateCcw} className="size-5" />}
        {retrying ? t('Trying again…') : t('Try again')}
      </Button>
    </View>
  )
}
