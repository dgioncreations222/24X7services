import { View } from 'react-native'
import type { Href } from 'expo-router'
import { ShieldCheck, ShieldX } from 'lucide-react-native'
import type { Warranty } from '@app/shared'
import { CardLink } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { Text } from '@/components/ui/Text'
import { ToneBadge } from '@/components/ui/States'
import { daysUntil, formatDateKey } from '@/lib/format'
import { cn } from '@/lib/cn'

/**
 * A service warranty. The headline is how long is left, not when it started —
 * that is the only part a customer is checking when they open this.
 *
 * Expiry is computed against the stored `expiresAt` each render rather than
 * being stored as a flag, so a warranty that lapses while the app is open stops
 * claiming to be active.
 */

export interface WarrantyCardProps {
  warranty: Pick<Warranty, 'id' | 'bookingId' | 'serviceKey' | 'startsAt' | 'expiresAt'>
  /** The service name, resolved from the catalog by the caller. */
  serviceName: string
  applianceName: string
  className?: string
}

export function WarrantyCard({ warranty, serviceName, applianceName, className }: WarrantyCardProps) {
  const remaining = daysUntil(warranty.expiresAt)
  const active = remaining > 0
  const expiringSoon = active && remaining <= 7

  return (
    <CardLink
      href={`/bookings/warranty?id=${warranty.bookingId}` as Href}
      ariaLabel={`${serviceName} warranty, ${active ? `${remaining} days left` : 'expired'}`}
      className={cn('p-4', className)}
    >
      <View className="flex-row items-start gap-3">
        <View
          className={cn(
            'size-10 shrink-0 items-center justify-center rounded-full',
            active ? 'bg-success-soft' : 'bg-surface'
          )}
        >
          {active ? (
            <Icon as={ShieldCheck} className="size-5 text-success" />
          ) : (
            <Icon as={ShieldX} className="size-5 text-muted" />
          )}
        </View>

        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="text-sm font-semibold text-ink">
            {serviceName}
          </Text>
          <Text className="mt-0.5 text-xs text-muted">{applianceName}</Text>
          <Text className="mt-2 text-sm text-ink">
            {active
              ? `Valid until ${formatDateKey(toDateKey(warranty.expiresAt))}`
              : `Expired on ${formatDateKey(toDateKey(warranty.expiresAt))}`}
          </Text>
        </View>

        <ToneBadge
          tone={active ? (expiringSoon ? 'warning' : 'success') : 'neutral'}
          label={active ? (remaining === 1 ? '1 day left' : `${remaining} days left`) : 'Expired'}
        />
      </View>
    </CardLink>
  )
}

/**
 * formatDateKey takes the stored YYYY-MM-DD form that slots use. Built from the
 * IST wall clock by hand: Hermes' Intl does not reliably honour a timeZone.
 */
function toDateKey(epochMs: number): string {
  const ist = new Date(epochMs + 330 * 60_000)
  const y = ist.getUTCFullYear()
  const m = String(ist.getUTCMonth() + 1).padStart(2, '0')
  const d = String(ist.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
