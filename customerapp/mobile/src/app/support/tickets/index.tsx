import { useCallback } from 'react'
import { View } from 'react-native'
import type { Href } from 'expo-router'
import { ChevronRight, MessagesSquare } from 'lucide-react-native'
import type { SupportTicket } from '@app/shared'

import { ProfileShell, SignInPrompt } from '@/components/ProfileShell'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { Tappable } from '@/components/ui/Tappable'
import { Text } from '@/components/ui/Text'
import { ToneBadge , EmptyState , ErrorState } from '@/components/ui/States'


import { TicketListSkeleton } from '@/components/ui/Skeleton'
import { fetchTickets } from '@/lib/api/support'
import { relativeTime } from '@/lib/format'
import { useAsync } from '@/lib/useAsync'
import { cn } from '@/lib/cn'

/**
 * Past and open conversations, most recently answered first.
 *
 * Ordered by last message rather than by when it was opened, because a thread
 * somebody replied to an hour ago is the one being looked for.
 *
 * Signed out, the screen says what it holds and offers the sign-in, rather
 * than bouncing straight to the login screen the way the web does — the same
 * as every other screen that is only this customer's own records.
 */
export default function TicketsScreen() {
  return (
    <ProfileShell
      title="Your conversations"
      backFallback="/support"
      signedOut={
        <SignInPrompt
          icon={MessagesSquare}
          title="Your conversations"
          description="Anything you ask us collects here, with everything that was said."
        />
      }
    >
      {(user) => <Tickets uid={user.uid} />}
    </ProfileShell>
  )
}

function Tickets({ uid }: { uid: string }) {
  const load = useCallback((): Promise<SupportTicket[]> => fetchTickets(uid), [uid])

  const tickets = useAsync(load)

  if (tickets.status === 'loading') {
    return (
      <View className="mt-5">
        <TicketListSkeleton />
      </View>
    )
  }
  if (tickets.status === 'error') {
    return <ErrorState className="py-16" onRetry={tickets.reload} retrying={tickets.refreshing} />
  }
  const list = tickets.data ?? []
  if (list.length === 0) {
    return (
      <EmptyState
        className="py-16"
        icon={MessagesSquare}
        title="No conversations yet"
        description="Anything you ask us collects here, with everything that was said."
        action={{ label: 'Start a conversation', href: '/support/chat' }}
      />
    )
  }

  return (
    <Card className="mt-5 overflow-hidden">
      {list.map((ticket, index) => (
        <Tappable
          key={ticket.id}
          href={`/support/tickets/detail?id=${ticket.id}` as Href}
          className={cn(
            'flex-row items-start gap-3 px-4 py-3.5 active:bg-surface active:opacity-100',
            index < list.length - 1 && 'border-b border-border'
          )}
        >
          <View className="min-w-0 flex-1">
            <View className="flex-row flex-wrap items-center gap-2">
              <Text className="text-sm font-semibold text-ink">{ticket.subject}</Text>
              <ToneBadge
                tone={
                  ticket.status === 'resolved'
                    ? 'success'
                    : ticket.assignee === 'human'
                      ? 'warning'
                      : 'neutral'
                }
                label={
                  ticket.status === 'resolved'
                    ? 'Resolved'
                    : ticket.assignee === 'human'
                      ? 'With a person'
                      : 'Open'
                }
              />
            </View>
            {ticket.lastMessagePreview ? (
              <Text numberOfLines={2} className="mt-1 text-sm text-muted">
                {ticket.lastMessagePreview}
              </Text>
            ) : null}
            <Text className="mt-1 text-xs text-muted">{relativeTime(ticket.lastMessageAt)}</Text>
          </View>
          <Icon as={ChevronRight} className="mt-0.5 size-4 shrink-0 text-muted" />
        </Tappable>
      ))}
    </Card>
  )
}
