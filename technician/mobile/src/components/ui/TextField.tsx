import { TextInput, View, type TextInputProps } from 'react-native'
import { cn } from '@/lib/cn'
import { COLORS } from '@/lib/theme'
import { Text } from '../base/Text'
import { inputClass } from './Field'

/**
 * A labelled text input with room for an error under it. At least 48px tall
 * so it takes a gloved thumb; the error is a sentence, not a code.
 */
export function TextField({
  label,
  error,
  hint,
  prefix,
  className,
  ...props
}: TextInputProps & { label: string; error?: string | null; hint?: string; prefix?: string; className?: string }) {
  return (
    <View className={className}>
      <Text className="mb-1.5 text-sm font-bold text-ink-2">{label}</Text>
      <View className={cn('min-h-12 flex-row items-center rounded-xl border bg-card', error ? 'border-danger' : 'border-line-strong')}>
        {prefix ? <Text className="pl-3.5 text-base font-semibold text-muted">{prefix}</Text> : null}
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={COLORS.faint}
          className={cn(inputClass, 'min-h-12 flex-1 border-0 bg-transparent', prefix && 'pl-2')}
          {...props}
        />
      </View>
      {error ? (
        <Text accessibilityLiveRegion="polite" className="mt-1.5 text-xs font-semibold text-danger">
          {error}
        </Text>
      ) : hint ? (
        <Text className="mt-1.5 text-xs text-muted">{hint}</Text>
      ) : null}
    </View>
  )
}
