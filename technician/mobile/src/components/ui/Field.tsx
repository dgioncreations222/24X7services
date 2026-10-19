import { Pressable, View } from 'react-native'
import { cn } from '@/lib/cn'
import { Tappable } from '../base/Tappable'
import { Inherit, Text } from '../base/Text'
import { Labelled } from './Button'

export function Toggle({
  checked,
  onChange,
  label,
  tone = 'brand',
  size = 'md',
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  tone?: 'brand' | 'success'
  size?: 'md' | 'lg'
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={() => onChange(!checked)}
      hitSlop={8}
      className={cn(
        'shrink-0 justify-center rounded-full',
        size === 'lg' ? 'h-8 w-14' : 'h-6 w-11',
        checked ? (tone === 'success' ? 'bg-success' : 'bg-brand') : 'bg-line-strong'
      )}
    >
      <View
        className={cn(
          'absolute rounded-full bg-white shadow-card',
          size === 'lg' ? 'left-1 size-6' : 'left-0.5 size-5',
          checked && (size === 'lg' ? 'translate-x-6' : 'translate-x-5')
        )}
      />
    </Pressable>
  )
}

/** The web's input look, for a TextInput (focus ring dropped: phones show the caret). */
export const inputClass = 'w-full rounded-xl border border-line-strong bg-card px-3.5 py-3 text-base text-ink font-normal'

export function Field({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <View>
      <Text className="mb-1.5 text-sm font-bold text-ink-2">{label}</Text>
      {children}
      {hint ? typeof hint === 'string' ? <Text className="mt-1.5 text-xs text-muted">{hint}</Text> : <View className="mt-1.5">{hint}</View> : null}
    </View>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  size = 'md',
}: {
  value: T
  onChange: (v: T) => void
  options: readonly { value: T; label: React.ReactNode }[]
  className?: string
  size?: 'sm' | 'md'
}) {
  return (
    <View accessibilityRole="tablist" className={cn('flex-row rounded-xl bg-ink/[0.06] p-1', className)}>
      {options.map((o) => {
        const on = value === o.value
        return (
          <Tappable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            className={cn(
              'flex-1 flex-row items-center justify-center gap-1.5 rounded-lg px-2',
              size === 'sm' ? 'h-8' : 'h-10',
              on && 'bg-card shadow-card'
            )}
          >
            <Inherit className={cn('font-bold', size === 'sm' ? 'text-xs' : 'text-sm', on ? 'text-ink' : 'text-muted')}>
              <Labelled>{o.label}</Labelled>
            </Inherit>
          </Tappable>
        )
      })}
    </View>
  )
}
