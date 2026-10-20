import { useState } from 'react'
import { View } from 'react-native'
import {
  ChevronDown,
  Headphones,
  ReceiptText,
  ShieldCheck,
  X,
  type LucideIcon,
} from 'lucide-react-native'
import type { CatalogService } from '@app/shared'

import { Icon } from '@/components/ui/Icon'
import { Tappable } from '@/components/ui/Tappable'
import { Text } from '@/components/ui/Text'
import { cn } from '@/lib/cn'
import { brand } from '@/config/brand'

/** What stands behind the work: warranty, fixed fee, support. */
export function PromiseSection({ warrantyDays }: { warrantyDays?: number }) {
  return (
    <>
      <Band />
      <View className="px-5 py-7">
        <Text accessibilityRole="header" className="text-2xl font-bold text-ink">
          <Text className="text-2xl font-bold text-brand">{brand.name}</Text>
          {' promise'}
        </Text>
        <View className="mt-5 gap-4">
          <PromiseLine icon={ShieldCheck}>
            {warrantyDays
              ? `Up to ${warrantyDays} days warranty`
              : 'Service warranty on the work'}
          </PromiseLine>
          <PromiseLine icon={ReceiptText}>
            Fixed visit fee, repairs quoted first
          </PromiseLine>
          <PromiseLine icon={Headphones}>Support at any hour</PromiseLine>
        </View>
      </View>
    </>
  )
}

/** "What is not included", one line per exclusion. */
export function ExcludesSection({
  excludes,
}: {
  excludes: NonNullable<CatalogService['excludes']>
}) {
  return (
    <>
      <Band />
      <View className="px-5 py-7">
        <Text accessibilityRole="header" className="text-2xl font-bold text-ink">
          What is not included
        </Text>
        <View className="mt-5 gap-3">
          {excludes.map((line) => (
            <View key={line} className="flex-row items-start gap-3">
              <Icon as={X} className="mt-1 size-4 text-error" />
              <Text className="flex-1 text-base leading-[26px] text-muted">{line}</Text>
            </View>
          ))}
        </View>
      </View>
    </>
  )
}

/** "Frequently asked questions", each folding open to its answer. */
export function FaqSection({ faqs }: { faqs: NonNullable<CatalogService['faqs']> }) {
  return (
    <>
      <Band />
      <View className="px-5 py-7">
        <Text accessibilityRole="header" className="text-xl font-bold text-ink">
          Frequently asked questions
        </Text>
        <View className="mt-3">
          {faqs.map((faq, index) => (
            <Faq key={faq.q} q={faq.q} a={faq.a} divided={index > 0} />
          ))}
        </View>
      </View>
    </>
  )
}

/** One question in the FAQ, folding open to its answer. */
function Faq({ q, a, divided }: { q: string; a: string; divided: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <View className={cn('py-1', divided && 'border-t border-border')}>
      <Tappable
        onPress={() => setOpen((was) => !was)}
        accessibilityState={{ expanded: open }}
        className="min-h-14 flex-row items-center gap-3"
      >
        <Text className="flex-1 text-base text-ink">{q}</Text>
        <View style={open ? { transform: [{ rotate: '180deg' }] } : undefined}>
          <Icon as={ChevronDown} className="size-5 text-muted" />
        </View>
      </Tappable>
      {open ? (
        <Text className="pb-4 text-sm leading-[22px] text-muted">{a}</Text>
      ) : null}
    </View>
  )
}

export function PromiseLine({
  icon,
  children,
}: {
  icon: LucideIcon
  children: React.ReactNode
}) {
  return (
    <View className="flex-row items-center gap-4">
      <Icon as={icon} className="size-6 text-ink" />
      <Text className="flex-1 text-lg text-ink">{children}</Text>
    </View>
  )
}

/** The grey band between unrelated blocks, as on the rest of the app. */
export function Band() {
  return <View className="h-2 bg-surface" />
}
