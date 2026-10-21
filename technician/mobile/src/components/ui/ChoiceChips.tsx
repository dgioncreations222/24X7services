import { View } from 'react-native'
import { Check } from 'lucide-react-native'
import { cn } from '@/lib/cn'
import { Icon } from '../base/Icon'
import { Tappable } from '../base/Tappable'
import { Inherit, Text } from '../base/Text'

/**
 * Big tappable chips for picking one option (`multiple` false) or several.
 * 48px tall and wrapping, so a list of cities or skills fits any phone width.
 */
export function ChoiceChips<T extends string>({
  options,
  value,
  onChange,
  multiple = false,
  label,
}: {
  options: readonly { value: T; label: string }[]
  value: readonly T[]
  onChange: (next: T[]) => void
  multiple?: boolean
  label: string
}) {
  return (
    <View>
      <Text className="mb-2 text-sm font-bold text-ink-2">{label}</Text>
      <View accessibilityRole={multiple ? undefined : 'radiogroup'} className="flex-row flex-wrap gap-2">
        {options.map((o) => {
          const on = value.includes(o.value)
          return (
            <Tappable
              key={o.value}
              accessibilityRole={multiple ? 'checkbox' : 'radio'}
              accessibilityState={{ checked: on }}
              onPress={() => onChange(multiple ? (on ? value.filter((v) => v !== o.value) : [...value, o.value]) : [o.value])}
              className={cn('h-12 flex-row items-center gap-1.5 rounded-xl border-2 px-4', on ? 'border-brand bg-brand-soft' : 'border-line-strong bg-card')}
            >
              <Inherit className={cn('text-sm font-bold', on ? 'text-brand' : 'text-ink-2')}>
                {on ? <Icon as={Check} className="size-4" strokeWidth={3} /> : null}
                <Text>{o.label}</Text>
              </Inherit>
            </Tappable>
          )
        })}
      </View>
    </View>
  )
}
