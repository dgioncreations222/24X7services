import { useCallback } from 'react'
import { View } from 'react-native'
import type { Href } from 'expo-router'
import { ChevronRight, FileText } from 'lucide-react-native'
import type { Invoice } from '@app/shared'

import { ProfileShell, SignInPrompt } from '@/components/ProfileShell'
import { Card } from '@/components/ui/Card'
import { ToneBadge , EmptyState , ErrorState } from '@/components/ui/States'


import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { Icon } from '@/components/ui/Icon'
import { Tappable } from '@/components/ui/Tappable'
import { Text } from '@/components/ui/Text'
import { fetchMyInvoices } from '@/lib/api/invoices'
import { formatDateTime, formatPaise } from '@/lib/format'
import { useAsync } from '@/lib/useAsync'
import { cn } from '@/lib/cn'

/**
 * Every invoice we have issued this customer, newest first.
 *
 * Called "Invoices" and not "Payments" because that is what is actually here: a
 * record of bills, not a wallet. There are no saved cards in this app — Razorpay
 * holds those — and a screen called Payments that cannot show a card is a screen
 * that disappoints everyone who opens it.
 */
export function PaymentsScreen() {
  return (
    <ProfileShell
      title="Invoices"
      signedOut={
        <SignInPrompt
          icon={FileText}
          title="Your invoices"
          description="Every bill we have issued you, with its GST breakdown, is here. Log in to open them."
        />
      }
    >
      {(user) => <InvoiceList uid={user.uid} />}
    </ProfileShell>
  )
}

function InvoiceList({ uid }: { uid: string }) {
  const load = useCallback((): Promise<Invoice[]> => fetchMyInvoices(uid), [uid])

  const invoices = useAsync(load)

  if (invoices.status === 'loading') {
    return (
      <SkeletonGroup label="Loading invoices" className="mt-6 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </SkeletonGroup>
    )
  }

  if (invoices.status === 'error') {
    return <ErrorState className="py-16" onRetry={invoices.reload} retrying={invoices.refreshing} />
  }

  const list = invoices.data ?? []
  if (list.length === 0) {
    return (
      <EmptyState
        className="py-16"
        icon={FileText}
        title="No invoices yet"
        description="A GST invoice is issued the moment a job is complete, and every one of them collects here."
      />
    )
  }

  return (
    <Card className="mt-5 overflow-hidden">
      {list.map((invoice, index) => (
        <Tappable
          key={invoice.id}
          href={`/bookings/invoice?id=${invoice.bookingId}` as Href}
          className={cn(
            'flex-row items-center gap-3 px-4 py-3.5 active:bg-surface active:opacity-100',
            index < list.length - 1 && 'border-b border-border'
          )}
        >
          <View className="min-w-0 flex-1">
            <Text numberOfLines={1} className="text-sm font-semibold text-ink">
              {invoice.number}
            </Text>
            <Text className="mt-0.5 text-xs text-muted">{formatDateTime(invoice.issuedAt)}</Text>
          </View>
          <View className="shrink-0 items-end">
            <Text className="text-sm font-bold tabular-nums text-ink">{formatPaise(invoice.price.total)}</Text>
            <ToneBadge
              className="mt-1"
              tone={invoice.price.due > 0 ? 'warning' : 'success'}
              label={invoice.price.due > 0 ? 'Due' : 'Paid'}
            />
          </View>
          <Icon as={ChevronRight} className="size-4 text-muted" />
        </Tappable>
      ))}
    </Card>
  )
}
