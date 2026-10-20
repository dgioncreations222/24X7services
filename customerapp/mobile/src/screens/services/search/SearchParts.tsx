import { View } from 'react-native'
import { ChevronRight } from 'lucide-react-native'
import type { SearchHit } from '@app/shared'

import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { Tappable } from '@/components/ui/Tappable'
import { Text } from '@/components/ui/Text'
import { cn } from '@/lib/cn'

/** The grey band the rest of the app uses between unrelated blocks. */
export function Band() {
  return <View aria-hidden className="-mx-4 my-8 h-2 bg-surface" />
}

export function Heading({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <Text accessibilityRole="header" className={cn('text-lg font-semibold text-ink', className)}>
      {children}
    </Text>
  )
}

/**
 * Hits as a list of rows: a label, what it belongs to, and a chevron.
 *
 * The shape for a hit that is not a thing you buy — a symptom — and the
 * fallback for a service the catalog no longer has.
 */
export function HitRows({
  hits,
  onOpen,
  className,
}: {
  hits: readonly SearchHit[]
  onOpen: (href: string) => void
  className?: string
}) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      {hits.map((hit, index) => (
        <Tappable
          key={`${hit.kind}-${hit.label}-${hit.href}`}
          onPress={() => onOpen(hit.href)}
          className={cn(
            'w-full flex-row items-center gap-3 px-4 py-3 active:bg-surface active:opacity-100',
            index > 0 && 'border-t border-border'
          )}
        >
          <View className="min-w-0 flex-1">
            <Text numberOfLines={1} className="text-base font-medium text-ink">
              {hit.label}
            </Text>
            {hit.sublabel ? (
              <Text numberOfLines={1} className="mt-0.5 text-xs text-muted">
                {hit.sublabel}
              </Text>
            ) : null}
          </View>
          <Icon as={ChevronRight} className="size-4 text-muted" />
        </Tappable>
      ))}
    </Card>
  )
}
