import { useState } from 'react'
import { View } from 'react-native'
import { ChevronDown } from 'lucide-react-native'

import { Icon } from '@/components/ui/Icon'
import { Tappable } from '@/components/ui/Tappable'
import { Text } from '@/components/ui/Text'
import { cn } from '@/lib/cn'
import { brand } from '@/config/brand'

/**
 * The questions a referral scheme raises by existing.
 *
 * Every answer here is a rule the server actually enforces — one code per
 * account, before the first booking, paid on completion. A scheme whose small
 * print is looser than its code is a scheme that pays people who read it
 * carefully.
 */
const FAQ = [
  {
    q: 'When exactly do I get paid?',
    a: 'When the person who used your code has had their first job finished. Not when they sign up, and not when they book — a booking that gets cancelled has cost nobody anything.',
  },
  {
    q: 'How many people can use my code?',
    a: 'As many as you like. You are paid once for each of them, the first time each one has a job finished.',
  },
  {
    q: 'Can I use my own code?',
    a: 'No. A code cannot be used on the account that owns it, and it only works on an account that has never booked with us.',
  },
  {
    q: 'Where does the money go?',
    a: `Onto your ${brand.name} balance as credits, which come off your next bill. Like the rest of the balance it never expires, and it can only be spent on ${brand.name} services.`,
  },
  {
    q: 'Can I use more than one code myself?',
    a: 'One per account. If you have already used one, the box on this screen is gone rather than waiting to refuse you.',
  },
] as const

export function Faq() {
  return (
    <View className="mt-8">
      <Text accessibilityRole="header" className="text-lg font-bold text-ink">
        Questions
      </Text>
      <View className="mt-2 border-y border-border">
        {FAQ.map((item, index) => (
          <FaqItem key={item.q} q={item.q} a={item.a} last={index === FAQ.length - 1} />
        ))}
      </View>
    </View>
  )
}

/** The web's <details>: a question that opens to its answer. */
function FaqItem({ q, a, last }: { q: string; a: string; last: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <View className={cn(!last && 'border-b border-border')}>
      <Tappable
        onPress={() => setOpen((was) => !was)}
        accessibilityState={{ expanded: open }}
        className="min-h-14 flex-row items-center justify-between gap-4 py-4"
      >
        <Text className="min-w-0 flex-1 text-base font-semibold text-ink">{q}</Text>
        <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
          <Icon as={ChevronDown} className="size-4 text-muted" />
        </View>
      </Tappable>
      {open ? <Text className="pb-4 text-sm leading-[22px] text-muted">{a}</Text> : null}
    </View>
  )
}
