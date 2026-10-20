import { useState } from 'react'
import { View } from 'react-native'
import { router, type Href } from 'expo-router'
import { Check, Wrench } from 'lucide-react-native'
import { repairItemTotal, type Booking, type RepairItem, type RepairRequest } from '@app/shared'

import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Tappable } from '@/components/ui/Tappable'
import { Text } from '@/components/ui/Text'
import { ConfirmModal } from '@/components/ui/Overlay'
import { useToast } from '@/components/Toast'
import { callFn, friendlyError } from '@/lib/callables'
import { formatPaise, relativeTime } from '@/lib/format'
import { cn } from '@/lib/cn'
import { BlockTitle } from '@/screens/bookings/parts'

export interface ApprovalUi {
  /** Ticked item ids per request. A request not in here has everything ticked. */
  picked: Record<string, string[]>
  setPicked: React.Dispatch<React.SetStateAction<Record<string, string[]>>>
  confirming: 'approve' | 'decline' | null
  setConfirming: (next: 'approve' | 'decline' | null) => void
}

export function approvedFor(ui: ApprovalUi, request: RepairRequest): string[] {
  return ui.picked[request.id] ?? request.items.map((item) => item.id)
}

export function extraFor(request: RepairRequest, approved: string[]): number {
  return request.items
    .filter((item) => approved.includes(item.id))
    .reduce((total, item) => total + repairItemTotal(item), 0)
}

export function PendingRequest({ booking, request, ui }: { booking: Booking; request: RepairRequest; ui: ApprovalUi }) {
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  const approved = approvedFor(ui, request)
  const extra = extraFor(request, approved)
  const { confirming, setConfirming } = ui

  function toggle(id: string): void {
    ui.setPicked((all) => {
      const current = all[request.id] ?? request.items.map((item) => item.id)
      return {
        ...all,
        [request.id]: current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
      }
    })
  }

  async function respond(ids: string[]): Promise<void> {
    setSaving(true)
    try {
      await callFn('respondToRepairRequest', {
        bookingId: booking.id,
        requestId: request.id,
        approvedItemIds: ids,
      })
      toast.show(ids.length === 0 ? 'Declined. Only the visit fee applies.' : 'Approved. Your expert can carry on.', {
        tone: 'success',
      })
      router.replace(`/bookings/progress?id=${booking.id}` as Href)
    } catch (error) {
      toast.show(friendlyError(error), { tone: 'error' })
    } finally {
      setSaving(false)
      setConfirming(null)
    }
  }

  return (
    <>
      <View className="mt-5">
        <View className="flex-row items-start gap-3">
          <Icon as={Wrench} className="mt-0.5 size-5 text-warning" />
          <View className="min-w-0 flex-1">
            <Text accessibilityRole="header" className="text-lg font-bold text-ink">
              Your expert found something else
            </Text>
            <Text className="mt-0.5 text-xs text-muted">Quoted {relativeTime(request.createdAt)}</Text>
          </View>
        </View>

        <Card className="mt-4 p-4">
          <Text className="text-sm leading-[22px] text-ink">{request.reason}</Text>
        </Card>
      </View>

      <View className="mt-6">
        <BlockTitle className="mb-2">Tick what you want done</BlockTitle>

        <View className="gap-2">
          {request.items.map((item) => (
            <ItemRow key={item.id} item={item} checked={approved.includes(item.id)} onToggle={() => toggle(item.id)} />
          ))}
        </View>

        <Card className="mt-4 p-4">
          <Text className="text-sm leading-[22px] text-muted">
            You can approve some of it, all of it, or none of it. Whatever you leave unticked will not be done and will
            not be charged. The visit fee of {formatPaise(booking.price.visitFee)} applies either way, because your
            expert has already come out and inspected it.
          </Text>
        </Card>

        <Button className="mt-4" variant="ghost" fullWidth onPress={() => setConfirming('decline')}>
          Decline everything
        </Button>
      </View>

      <ConfirmModal
        open={confirming === 'approve'}
        onClose={() => setConfirming(null)}
        onConfirm={() => void respond(approved)}
        loading={saving}
        title={
          approved.length === request.items.length
            ? 'Approve the whole repair?'
            : `Approve ${approved.length} of ${request.items.length} items?`
        }
        description={`This adds ${formatPaise(
          extra
        )} to your bill, on top of the visit fee. Your expert starts as soon as you confirm.`}
        confirmLabel="Yes, go ahead"
      />

      <ConfirmModal
        open={confirming === 'decline'}
        onClose={() => setConfirming(null)}
        onConfirm={() => void respond([])}
        loading={saving}
        destructive
        title="Decline the repair?"
        description="Nothing further will be done. You still pay the visit fee for the inspection, and your expert will put the appliance back as they found it."
        confirmLabel="Decline"
      />
    </>
  )
}

function ItemRow({ item, checked, onToggle }: { item: RepairItem; checked: boolean; onToggle: () => void }) {
  return (
    <Tappable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      className={cn(
        'w-full flex-row items-start gap-3 rounded-card p-4 active:opacity-100',
        checked ? 'border-2 border-brand' : 'border border-border active:border-brand'
      )}
    >
      <View
        className={cn(
          'mt-0.5 size-5 shrink-0 items-center justify-center rounded border-2',
          checked ? 'border-brand bg-brand' : 'border-border'
        )}
      >
        {checked ? <Icon as={Check} className="size-3.5 text-white" strokeWidth={3} /> : null}
      </View>

      <View className="min-w-0 flex-1">
        <Text className="text-sm font-semibold text-ink">{item.label}</Text>
        {/* Split out, because "₹1,100" and "₹850 of parts plus ₹250 of work"
            are the same number and only one of them can be argued with. */}
        <Text className="mt-1 text-xs text-muted">
          Parts {formatPaise(item.partPaise)} · Labour {formatPaise(item.labourPaise)}
        </Text>
      </View>

      <Text className="shrink-0 text-sm font-bold tabular-nums text-ink">{formatPaise(repairItemTotal(item))}</Text>
    </Tappable>
  )
}
