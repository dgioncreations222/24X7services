import { useState } from 'react'
import { TextInput, View } from 'react-native'
import { router } from 'expo-router'
import { Banknote, CircleCheck, Clock, Pencil, Smartphone } from 'lucide-react-native'
import { JobNotFound, useJobParam } from '@/components/JobParts'
import { Logo } from '@/components/Logo'
import { QrCode, upiLink } from '@/components/UpiQr'
import { ActionDock, Button, Card, Icon, Inherit, Label, Page, ScreenHeader, SectionTitle, Tappable, Text, inputClass } from '@/components/ui'
import { APPLIANCE_LABEL, BRAND_LABEL, LABOUR_RATE, inr } from '@/lib/catalog'
import { BRAND } from '@/lib/brand'
import { cn } from '@/lib/cn'
import { shortDate, time } from '@/lib/format'
import { stepHref } from '@/lib/routes'
import { useStore } from '@/lib/store'
import type { Bill, Job, PaymentMethod } from '@/lib/types'

export default function BillScreen() {
  const job = useJobParam()
  if (!job) return <JobNotFound />
  return <BillForm key={job.id} job={job} />
}

function BillForm({ job }: { job: Job }) {
  const store = useStore()
  const readOnly = job.status === 'closed'
  const [bill, setBill] = useState<Bill>(
    job.bill ?? { labour: LABOUR_RATE[job.appliance], additional: 0, additionalNote: '', paid: false, method: null }
  )
  const [editLabour, setEditLabour] = useState(false)

  const parts = job.parts.reduce((s, p) => s + p.qty * p.price, 0)
  const legacy = readOnly && !job.bill && job.amount !== undefined
  const total = legacy ? job.amount! : bill.labour + parts + bill.additional
  const gst = Math.round(total - total / 1.18)

  const patch = (p: Partial<Bill>) => setBill((b) => ({ ...b, ...p }))

  return (
    <>
      <ScreenHeader back={stepHref('detail', job.id)} title="Service bill" subtitle={`${job.id} · ${job.customer.name}`} />
      <Page className="gap-5">
        {/* The document */}
        <Card className="overflow-hidden">
          <View className="flex-row items-start justify-between gap-3 border-b border-line bg-canvas/60 p-4">
            <Logo />
            <View className="items-end">
              <Text className="text-[11px] font-bold uppercase tracking-wider text-faint">Service summary</Text>
              <Text className="num text-sm font-extrabold">INV-{job.id.slice(3)}</Text>
              <Text className="num text-xs font-semibold text-muted">
                {shortDate(job.log.repaired ?? job.scheduledAt)} · {time(job.log.repaired ?? job.scheduledAt)}
              </Text>
            </View>
          </View>

          <View className="flex-row flex-wrap gap-y-3 p-4">
            <View className="w-1/2 pr-4">
              <Label>Appliance</Label>
              <Text className="mt-0.5 text-sm font-bold">{APPLIANCE_LABEL[job.appliance]}</Text>
            </View>
            <View className="w-1/2">
              <Label>Brand</Label>
              <Text className="mt-0.5 text-sm font-bold">{BRAND_LABEL[job.brand]}</Text>
            </View>
            <View className="w-full">
              <Label>Diagnosis</Label>
              <Text className="mt-0.5 text-sm font-semibold text-ink-2">
                {job.diagnosis ? (
                  <>
                    <Text className="text-sm font-bold text-ink">{job.diagnosis.problem}.</Text> {job.diagnosis.repair}
                  </>
                ) : (
                  job.issue
                )}
              </Text>
            </View>
          </View>

          <View className="border-t border-line px-4 py-3">
            <Row
              label="Labour / service charge"
              sub={`${job.service} · ${APPLIANCE_LABEL[job.appliance]}`}
              value={legacy ? '—' : inr(bill.labour)}
              action={
                !readOnly && (
                  <Tappable
                    onPress={() => setEditLabour((v) => !v)}
                    accessibilityLabel="Edit labour"
                    className="size-8 items-center justify-center rounded-md active:bg-canvas active:opacity-100"
                  >
                    <Icon as={Pencil} className="size-3.5 text-muted" />
                  </Tappable>
                )
              }
            />
            {editLabour && (
              <TextInput
                keyboardType="number-pad"
                autoFocus
                value={String(bill.labour)}
                onChangeText={(v) => patch({ labour: Number(v.replace(/\D/g, '')) || 0 })}
                className={cn(inputClass, 'num mb-2 font-bold')}
              />
            )}
            <Row label="Parts charge" sub={job.parts.length ? `${job.parts.length} item${job.parts.length > 1 ? 's' : ''}` : 'No parts used'} value={legacy ? '—' : inr(parts)} />
            {job.parts.map((p) => (
              <View key={p.sku} className="flex-row justify-between gap-3 py-1 pl-3">
                <Text className="flex-1 text-xs font-semibold text-muted">
                  {p.name} × {p.qty}
                </Text>
                <Text className="num text-xs font-semibold text-muted">{inr(p.qty * p.price)}</Text>
              </View>
            ))}
            <Row label="Additional charges" sub={bill.additionalNote || 'Transport, consumables, after-hours'} value={legacy ? '—' : inr(bill.additional)} />
            {!readOnly && (
              <View className="mt-1 flex-row gap-2 pb-2">
                <TextInput
                  keyboardType="number-pad"
                  accessibilityLabel="Additional amount"
                  value={bill.additional ? String(bill.additional) : ''}
                  placeholder="₹ 0"
                  placeholderTextColor="#8a93a3"
                  onChangeText={(v) => patch({ additional: Number(v.replace(/\D/g, '')) || 0 })}
                  className={cn(inputClass, 'num w-[110px] py-2.5 font-bold')}
                />
                <TextInput
                  accessibilityLabel="Reason for additional charge"
                  value={bill.additionalNote}
                  placeholder="Reason (e.g. copper pipe 3 ft)"
                  placeholderTextColor="#8a93a3"
                  onChangeText={(v) => patch({ additionalNote: v })}
                  className={cn(inputClass, 'w-auto flex-1 py-2.5 text-sm')}
                />
              </View>
            )}
          </View>

          <View className="border-t-2 border-ink bg-canvas/60 px-4 py-4">
            <View className="flex-row items-baseline justify-between">
              <Text className="text-base font-extrabold">Total amount</Text>
              <Text className="num text-2xl font-extrabold tracking-tight">{inr(total)}</Text>
            </View>
            <Text className="num mt-1 text-right text-xs font-semibold text-muted">Incl. GST 18% ({inr(gst)})</Text>
          </View>
        </Card>

        {/* Payment */}
        <View>
          <SectionTitle>Payment status</SectionTitle>
          <View className="flex-row gap-2">
            <Choice active={!bill.paid} disabled={readOnly} onClick={() => patch({ paid: false })} icon={Clock} label="Payment Pending" tone="warning" />
            <Choice
              active={bill.paid}
              disabled={readOnly}
              onClick={() => patch({ paid: true, method: bill.method ?? 'online' })}
              icon={CircleCheck}
              label="Payment Received"
              tone="success"
            />
          </View>
        </View>
        <View>
          <SectionTitle>Payment method</SectionTitle>
          <View className="flex-row gap-2">
            {(
              [
                ['online', 'Online Payment', Smartphone],
                ['cash', 'Cash Payment', Banknote],
              ] as const satisfies readonly (readonly [PaymentMethod, string, unknown])[]
            ).map(([m, label, icon]) => (
              <Choice key={m} active={bill.method === m} disabled={readOnly} onClick={() => patch({ method: m })} icon={icon} label={label} tone="brand" />
            ))}
          </View>
          {bill.method === 'online' && !bill.paid && (
            <Card className="mt-3 flex-row items-center gap-4 p-4">
              <QrCode
                text={upiLink({ upi: store.settings.upi, name: store.tech.name, amount: total, note: `${BRAND.name} ${job.id}` })}
                className="size-32 shrink-0 border border-line p-1"
              />
              <View className="min-w-0 flex-1">
                <Text className="text-sm font-extrabold">Customer scans to pay</Text>
                <Text className="text-xs font-medium text-muted">Any UPI app · amount filled in</Text>
                <Text className="num mt-2 text-xl font-extrabold">{inr(total)}</Text>
                <Text numberOfLines={1} className="num text-xs font-semibold text-muted">
                  {store.settings.upi}
                </Text>
              </View>
            </Card>
          )}
          {bill.method === 'cash' && (
            <View className="mt-3 rounded-xl bg-canvas p-3">
              <Text className="text-xs font-semibold text-muted">
                Collect exactly {inr(total)}. Cash is deposited at the hub by end of shift and deducted from your next payout.
              </Text>
            </View>
          )}
        </View>

        {readOnly && (
          <Tappable href={stepHref('detail', job.id)} className="self-center py-2">
            <Text className="text-center text-sm font-bold text-brand">Back to job</Text>
          </Tappable>
        )}
      </Page>

      {!readOnly && (
        <ActionDock>
          <Button
            size="lg"
            className="flex-1"
            textClassName="text-[15px] font-extrabold"
            onPress={() => {
              store.saveBill(job.id, bill)
              if (job.status === 'repaired') store.advance(job.id, 'confirmation')
              router.push(stepHref('confirm', job.id))
            }}
          >
            Continue to customer confirmation
          </Button>
        </ActionDock>
      )}
    </>
  )
}

function Row({ label, sub, value, action }: { label: string; sub?: string; value: string; action?: React.ReactNode }) {
  return (
    <View className="flex-row items-center gap-2 py-2">
      <View className="min-w-0 flex-1">
        <Text className="text-sm font-bold">{label}</Text>
        {sub && (
          <Text numberOfLines={1} className="text-xs font-medium text-muted">
            {sub}
          </Text>
        )}
      </View>
      {action}
      <Text className="num text-sm font-extrabold">{value}</Text>
    </View>
  )
}

function Choice({
  active,
  onClick,
  icon,
  label,
  tone,
  disabled,
}: {
  active: boolean
  onClick: () => void
  icon: typeof Clock
  label: string
  tone: 'warning' | 'success' | 'brand'
  disabled?: boolean
}) {
  const on = {
    warning: ['border-warning bg-warning-soft', 'text-warning'],
    success: ['border-success bg-success-soft', 'text-success'],
    brand: ['border-brand bg-brand-soft', 'text-brand'],
  }[tone]
  return (
    <Tappable
      accessibilityState={{ selected: active, disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onClick}
      className={cn('h-16 flex-1 flex-row items-center justify-center gap-2 rounded-xl border-2 px-2', active ? on[0] : 'border-line-strong bg-card')}
    >
      <Inherit className={cn('text-sm font-extrabold', active ? on[1] : disabled ? 'text-faint' : 'text-ink-2')}>
        <Icon as={icon} className="size-5" />
        <Text className="shrink">{label}</Text>
      </Inherit>
    </Tappable>
  )
}
