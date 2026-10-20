import { useCallback, useState } from 'react'
import { View } from 'react-native'
import { CalendarClock, XCircle } from 'lucide-react-native'
import type { Booking, SlotOption } from '@app/shared'

import { BottomSheet , ConfirmModal } from '@/components/ui/Overlay'

import { DateStrip } from '@/components/DateStrip'
import { TimeSlot } from '@/components/TimeSlot'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { Text } from '@/components/ui/Text'
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { useToast } from '@/components/Toast'
import { callFn, friendlyError } from '@/lib/callables'
import { formatPaise, relativeDateLabel, todayKey } from '@/lib/format'
import { useAsync } from '@/lib/useAsync'

/**
 * Moving a booking, and calling it off.
 *
 * Both are offered on the same row and neither is hidden. A cancel button
 * buried behind three taps does not stop cancellations; it produces phone calls
 * from people who have already decided.
 *
 * What cancelling costs is fetched from the server before the confirmation is
 * shown, not computed here. The customer sees the same figure the callable will
 * charge, because they are the same figure — a screen that estimated it would
 * eventually estimate wrong, and that argument is not worth winning.
 */

/** Up to the point somebody sets out. After that it is a conversation. */
const CHANGEABLE = ['pending_payment', 'confirmed', 'assigned']

const DAYS_AHEAD = 14

export function BookingActions({ booking }: { booking: Booking }) {
  const [sheet, setSheet] = useState<'reschedule' | null>(null)
  const [confirming, setConfirming] = useState(false)

  if (!CHANGEABLE.includes(booking.status)) return null

  return (
    <>
      <View className="mt-6 gap-3">
        <Button
          variant="secondary"
          onPress={() => setSheet('reschedule')}
          iconLeft={<Icon as={CalendarClock} className="size-4 text-brand" />}
        >
          Change the time
        </Button>
        <Button
          variant="ghost"
          onPress={() => setConfirming(true)}
          iconLeft={<Icon as={XCircle} className="size-4 text-ink" />}
        >
          Cancel booking
        </Button>
      </View>

      <RescheduleSheet booking={booking} open={sheet === 'reschedule'} onClose={() => setSheet(null)} />

      <CancelFlow booking={booking} open={confirming} onClose={() => setConfirming(false)} />
    </>
  )
}

// ---------------------------------------------------------------------------

function RescheduleSheet({
  booking,
  open,
  onClose,
}: {
  booking: Booking
  open: boolean
  onClose: () => void
}) {
  const toast = useToast()
  const [date, setDate] = useState('')
  const [chosen, setChosen] = useState<SlotOption | null>(null)
  const [saving, setSaving] = useState(false)

  const pincode = booking.address.pincode
  const load = useCallback(async () => {
    if (!open) return []
    const result = await callFn('getAvailableSlots', {
      pincode,
      fromDate: todayKey(),
      days: DAYS_AHEAD,
    })
    return result.days
  }, [pincode, open])

  const slots = useAsync(load)

  const days = (slots.data ?? []).map((day) => ({
    date: day.date,
    hasAvailability: day.windows.some((w) => w.availability !== 'unavailable'),
  }))
  const activeDate = date || days.find((day) => day.hasAvailability)?.date || days[0]?.date || ''
  const windows = slots.data?.find((day) => day.date === activeDate)?.windows ?? []

  async function move(): Promise<void> {
    if (!chosen || !activeDate) return
    setSaving(true)
    try {
      const result = await callFn('rescheduleBooking', {
        bookingId: booking.id,
        slot: { date: activeDate, start: chosen.start, end: chosen.end },
      })
      toast.show(
        result.reschedulesLeft === 0
          ? 'Moved. That was your last change on this booking.'
          : `Moved. You can change it ${result.reschedulesLeft} more time${
              result.reschedulesLeft === 1 ? '' : 's'
            }.`,
        { tone: 'success' }
      )
      onClose()
    } catch (error) {
      toast.show(friendlyError(error), { tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      dismissable={!saving}
      title="Pick a new time"
      description={`Currently ${relativeDateLabel(booking.slot.date)}, ${booking.slot.start}–${booking.slot.end}.`}
      footer={
        <Button fullWidth loading={saving} disabled={!chosen} onPress={() => void move()}>
          Move this booking
        </Button>
      }
    >
      {slots.status === 'loading' ? (
        <SkeletonGroup label="Loading times" className="gap-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-32 w-full" />
        </SkeletonGroup>
      ) : slots.status === 'error' ? (
        <Text className="py-6 text-sm text-muted">We could not load the available times. Please try again.</Text>
      ) : (
        <>
          <DateStrip
            days={days}
            value={activeDate}
            onChange={(next) => {
              setDate(next)
              setChosen(null)
            }}
          />
          <View className="mt-4 flex-row flex-wrap justify-between gap-y-3">
            {windows.map((window) => (
              <View key={`${window.start}-${window.end}`} className="w-[48.5%]">
                <TimeSlot
                  slot={window}
                  selected={chosen?.start === window.start && chosen?.end === window.end}
                  onSelect={setChosen}
                />
              </View>
            ))}
          </View>
        </>
      )}
    </BottomSheet>
  )
}

// ---------------------------------------------------------------------------

/**
 * Ask the server what this costs, show it, then do it.
 *
 * Two steps rather than one because the fee depends on the clock: a booking
 * that was free to cancel an hour ago may not be now, and the customer should
 * find that out in the dialog rather than in their bank statement.
 */
function CancelFlow({ booking, open, onClose }: { booking: Booking; open: boolean; onClose: () => void }) {
  const toast = useToast()
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!open) return null
    return callFn('previewCancellation', { bookingId: booking.id })
  }, [booking.id, open])

  const preview = useAsync(load)

  async function cancel(): Promise<void> {
    setSaving(true)
    try {
      const result = await callFn('cancelBooking', {
        bookingId: booking.id,
        reason: reason.trim(),
      })
      toast.show(
        result.refundPaise > 0 ? `Cancelled. ${formatPaise(result.refundPaise)} is on its way back.` : 'Cancelled.',
        { tone: 'success' }
      )
      onClose()
    } catch (error) {
      toast.show(friendlyError(error), { tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const outcome = preview.data

  return (
    <ConfirmModal
      open={open}
      onClose={onClose}
      onConfirm={() => void cancel()}
      loading={saving}
      destructive
      title="Cancel this booking?"
      description={
        preview.status === 'loading'
          ? 'Checking what this costs…'
          : outcome
            ? outcome.isFree
              ? 'You are cancelling in time, so there is no fee.'
              : `A cancellation fee of ${formatPaise(outcome.feeCharged)} applies at this notice.`
            : 'We could not check the cancellation fee. You can still cancel.'
      }
      confirmLabel="Cancel booking"
      cancelLabel="Keep it"
    >
      {outcome && outcome.refundPaise > 0 ? (
        <View className="mb-4 rounded-card bg-surface px-4 py-3">
          <Text className="text-sm text-ink">
            {formatPaise(outcome.refundPaise)} goes back to the account you paid from, usually within{' '}
            {outcome.refundDays} working days.
          </Text>
        </View>
      ) : null}

      <Textarea
        label="Why are you cancelling? (optional)"
        value={reason}
        onChangeText={(next) => setReason(next.slice(0, 500))}
        placeholder="It helps us fix whatever went wrong."
        rows={3}
      />
    </ConfirmModal>
  )
}
