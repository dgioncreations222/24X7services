import { useState } from 'react'
import { View } from 'react-native'
import { Inbox } from 'lucide-react-native'
import type { Booking } from '@app/shared'

import { BookingShell } from '@/components/BookingShell'
import { Button } from '@/components/ui/Button'
import { Text } from '@/components/ui/Text'
import { EmptyState } from '@/components/ui/States'
import { StickyCTA } from '@/components/Screen'
import { useRepairRequests } from '@/lib/useRepairRequests'
import { formatPaise } from '@/lib/format'
import { AnsweredRequest } from '@/screens/bookings/approval/AnsweredRequest'
import { approvedFor, extraFor, PendingRequest, type ApprovalUi } from '@/screens/bookings/approval/PendingRequest'

/**
 * "This also needs doing." The customer's answer.
 *
 * This screen is the promise the whole app is built on, so it is the one screen
 * that never nudges. Each item can be ticked or left, every price is broken
 * into the part and the work, and declining everything is offered as plainly as
 * approving everything — not buried, not greyed, not phrased as a mistake.
 *
 * What the customer is agreeing to is stated as a number before they agree to
 * it, and the server prices it again from the same items afterwards. Nothing
 * here computes what will be charged; this total is what they are about to say
 * yes to, and the one that comes back is what it actually costs.
 *
 * The pinned Approve bar is Screen's footer rather than part of the scroll, so
 * the ticks and the open dialog live here, above both, where the list and the
 * bar can share them.
 */

export function ApprovalScreen() {
  const [picked, setPicked] = useState<Record<string, string[]>>({})
  const [confirming, setConfirming] = useState<'approve' | 'decline' | null>(null)
  const ui: ApprovalUi = { picked, setPicked, confirming, setConfirming }

  return (
    <BookingShell title="Approve the repair" footer={({ booking }) => <ApprovalBar booking={booking} ui={ui} />}>
      {({ booking }) => <Approval booking={booking} ui={ui} />}
    </BookingShell>
  )
}

function Approval({ booking, ui }: { booking: Booking; ui: ApprovalUi }) {
  const { requests, loading } = useRepairRequests(booking.id)
  const pending = requests.find((request) => request.status === 'pending')
  const answered = requests.filter((request) => request.status !== 'pending')

  if (loading) return null

  return (
    <>
      {pending ? (
        <PendingRequest booking={booking} request={pending} ui={ui} />
      ) : answered.length > 0 ? (
        <>
          <Text className="mt-5 text-sm text-muted">Nothing is waiting on you. This is what you decided.</Text>
          <View className="mt-4 gap-3">
            {answered.map((request) => (
              <AnsweredRequest key={request.id} request={request} />
            ))}
          </View>
        </>
      ) : (
        <EmptyState
          className="py-16"
          icon={Inbox}
          title="Nothing to approve"
          description="If your expert finds something that needs doing beyond the inspection, the quote appears here."
        />
      )}
    </>
  )
}

/** The pinned bar: how much is ticked, and the one button that approves it. */
function ApprovalBar({ booking, ui }: { booking: Booking; ui: ApprovalUi }) {
  const { requests, loading } = useRepairRequests(booking.id)
  const pending = requests.find((request) => request.status === 'pending')
  if (loading || !pending) return null

  const approved = approvedFor(ui, pending)
  const extra = extraFor(pending, approved)

  return (
    <StickyCTA
      detail={
        <View>
          <Text className="text-xs text-muted">
            {approved.length} of {pending.items.length} approved
          </Text>
          <Text className="text-base font-bold text-ink">+ {formatPaise(extra)}</Text>
        </View>
      }
    >
      <Button onPress={() => ui.setConfirming('approve')} disabled={approved.length === 0}>
        Approve
      </Button>
    </StickyCTA>
  )
}
