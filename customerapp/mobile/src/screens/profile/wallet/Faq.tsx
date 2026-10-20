import { useState } from 'react'
import { View } from 'react-native'
import { ChevronDown } from 'lucide-react-native'

import { Icon } from '@/components/ui/Icon'
import { Tappable } from '@/components/ui/Tappable'
import { Text } from '@/components/ui/Text'
import { cn } from '@/lib/cn'
import { brand } from '@/config/brand'

/**
 * The questions this screen raises by existing.
 *
 * Every limit stated here is a limit the code actually enforces, and they are
 * the three that keep this balance a closed-loop instrument rather than a
 * regulated one: it buys only our own services, it cannot be transferred, and
 * it cannot be taken as cash. If any of those answers ever stops being true,
 * it stops being true in the schema first — see `shared/wallet.ts`.
 *
 * NEXT: "How do I use it?" says a person takes the balance off the bill,
 * because today a person does. When spending at checkout lands, this answer
 * becomes "you do not have to do anything".
 */
const FAQ = [
  {
    q: `What is my ${brand.name} balance?`,
    a: 'Two things in one number. Credits we gave you — for a visit we reached late, a job we had to cancel, a referral — and money you added yourself. Both are spent the same way, and the activity list above says which is which on every line.',
  },
  {
    q: 'How do I add money?',
    a: 'Add money on the card above, pick an amount, and pay the way you would pay for a booking. It goes to the same payment provider; we never see your card.',
  },
  {
    q: 'How do I use it?',
    a: 'There is nothing to redeem and no code to enter. Tell us which booking you want it against and we take it off what you owe before you pay.',
  },
  {
    q: 'Does it expire?',
    a: 'No. Nothing on this screen expires — neither the credits we gave you nor the money you added. It stays until you use it.',
  },
  {
    q: 'Can I get money I added back?',
    a: 'Yes. Ask support and we refund it to the card or account it came from. Credits we issued are not refundable in cash, because no cash came in for them.',
  },
  {
    q: 'Can I send it to someone else, or withdraw it?',
    a: `No. Your balance can only be spent on ${brand.name} services, on this account. It is not a wallet you can pay other people from, and there is no cash withdrawal.`,
  },
  {
    q: 'Why does my balance not match what I expected?',
    a: 'Every change to it is in the activity list above, newest first, with the balance after each one. If a line looks wrong, contact support with the date and we will check it.',
  },
] as const

export function Faq() {
  return (
    <View className="pb-4">
      <Text accessibilityRole="header" className="text-xl font-bold text-ink">
        Frequently asked questions
      </Text>
      <View className="mt-1 border-b border-border">
        {FAQ.map((item, index) => (
          <FaqItem key={item.q} q={item.q} a={item.a} first={index === 0} />
        ))}
      </View>
    </View>
  )
}

/** The web's native <details>: a question that opens to its answer. */
function FaqItem({ q, a, first }: { q: string; a: string; first: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <View className={cn(!first && 'border-t border-border')}>
      <Tappable
        onPress={() => setOpen((value) => !value)}
        accessibilityState={{ expanded: open }}
        className="min-h-11 flex-row items-center justify-between gap-4 py-4"
      >
        <Text className="min-w-0 flex-1 text-sm font-semibold text-ink">{q}</Text>
        <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
          <Icon as={ChevronDown} className="size-4 text-muted" />
        </View>
      </Tappable>
      {open ? <Text className="pb-4 text-sm text-muted">{a}</Text> : null}
    </View>
  )
}
