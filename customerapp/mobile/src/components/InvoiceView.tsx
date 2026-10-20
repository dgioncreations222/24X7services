import { View } from 'react-native'
import type { Invoice } from '@app/shared'
import { Card } from '@/components/ui/Card'
import { Text } from '@/components/ui/Text'
import { ToneBadge } from '@/components/ui/States'
import { formatDateTime, formatPaise } from '@/lib/format'
import { cn } from '@/lib/cn'

/**
 * The GST invoice, on screen. Everything on it — seller name, GSTIN, SAC code,
 * the tax split — comes from the invoice document the completion trigger wrote,
 * never from config read at render time. An invoice has to keep saying what it
 * said on the day it was issued, even after the business changes address.
 *
 * DECISION NEEDED: the legal name, GSTIN, address, SAC code and rate are seeded
 * as placeholders and must be confirmed with the CA before this is issued to a
 * real customer.
 */

export interface InvoiceViewProps {
  invoice: Invoice
  className?: string
}

export function InvoiceView({ invoice, className }: InvoiceViewProps) {
  const interState = invoice.price.igst > 0

  return (
    <Card className={cn('overflow-hidden', className)}>
      <View className="flex-row items-start justify-between gap-3 border-b border-border p-4">
        <View className="min-w-0 flex-1">
          <Text className="text-xs font-medium uppercase tracking-wide text-muted">Tax invoice</Text>
          <Text className="mt-1 text-lg font-bold text-ink">{invoice.number}</Text>
          <Text className="mt-0.5 text-xs text-muted">{formatDateTime(invoice.issuedAt)}</Text>
        </View>
        <ToneBadge
          tone={invoice.paymentStatus === 'paid' ? 'success' : 'warning'}
          label={invoice.paymentStatus === 'paid' ? 'Paid' : 'Payment due'}
        />
      </View>

      <View className="gap-4 border-b border-border p-4">
        <Party
          heading="From"
          name={invoice.seller.legalName}
          lines={[invoice.seller.address, `GSTIN: ${invoice.seller.gstin}`]}
        />
        <Party heading="To" name={invoice.buyer.name} lines={[invoice.buyer.address]} />
      </View>

      <View accessibilityLabel="Invoice line items">
        <View className="flex-row justify-between border-b border-border px-4 py-2">
          <Text className="text-xs font-medium text-muted">Description</Text>
          <Text className="text-right text-xs font-medium text-muted">Amount</Text>
        </View>
        {invoice.lines.map((line, index) => (
          <View
            key={`${line.label}-${index}`}
            className="flex-row items-start justify-between gap-4 border-b border-border px-4 py-2.5"
          >
            <Text className="min-w-0 flex-1 text-sm text-ink">{line.label}</Text>
            <Text className="text-right text-sm tabular-nums text-ink">{formatPaise(line.amount)}</Text>
          </View>
        ))}
      </View>

      <View className="gap-2 p-4">
        <Line label="Taxable value" value={invoice.price.taxable} muted />
        {interState ? (
          <Line label={`IGST @ ${invoice.gstRate}%`} value={invoice.price.igst} muted />
        ) : (
          <>
            <Line label={`CGST @ ${invoice.gstRate / 2}%`} value={invoice.price.cgst} muted />
            <Line label={`SGST @ ${invoice.gstRate / 2}%`} value={invoice.price.sgst} muted />
          </>
        )}
        <View className="mt-1 flex-row items-baseline justify-between border-t border-border pt-3">
          <Text className="text-base font-semibold text-ink">Total</Text>
          <Text className="text-xl font-bold tabular-nums text-ink">{formatPaise(invoice.price.total)}</Text>
        </View>
      </View>

      <View className="border-t border-border bg-surface p-4">
        <Text className="text-xs text-muted">SAC code: {invoice.sacCode}</Text>
        <Text className="mt-1 text-xs text-muted">This is a computer-generated invoice and needs no signature.</Text>
      </View>
    </Card>
  )
}

function Party({ heading, name, lines }: { heading: string; name: string; lines: readonly string[] }) {
  return (
    <View>
      <Text className="text-xs font-medium uppercase tracking-wide text-muted">{heading}</Text>
      <Text className="mt-1 text-sm font-semibold text-ink">{name}</Text>
      {lines.map((line) => (
        <Text key={line} className="text-xs leading-[19px] text-muted">
          {line}
        </Text>
      ))}
    </View>
  )
}

function Line({ label, value, muted = false }: { label: string; value: number; muted?: boolean }) {
  return (
    <View className="flex-row items-baseline justify-between gap-4">
      <Text className={cn('text-sm', muted ? 'text-muted' : 'text-ink')}>{label}</Text>
      <Text className={cn('text-sm tabular-nums', muted ? 'text-muted' : 'font-medium text-ink')}>
        {formatPaise(value)}
      </Text>
    </View>
  )
}

/**
 * The invoice as plain text, for the share sheet — what the web's print view
 * carried, in a form any app on the phone can take (mail, WhatsApp, notes).
 */
export function invoiceText(invoice: Invoice): string {
  const interState = invoice.price.igst > 0
  const rows = [
    `Tax invoice ${invoice.number}`,
    formatDateTime(invoice.issuedAt),
    '',
    `From: ${invoice.seller.legalName}`,
    invoice.seller.address,
    `GSTIN: ${invoice.seller.gstin}`,
    '',
    `To: ${invoice.buyer.name}`,
    invoice.buyer.address,
    '',
    ...invoice.lines.map((line) => `${line.label}: ${formatPaise(line.amount)}`),
    '',
    `Taxable value: ${formatPaise(invoice.price.taxable)}`,
    ...(interState
      ? [`IGST @ ${invoice.gstRate}%: ${formatPaise(invoice.price.igst)}`]
      : [
          `CGST @ ${invoice.gstRate / 2}%: ${formatPaise(invoice.price.cgst)}`,
          `SGST @ ${invoice.gstRate / 2}%: ${formatPaise(invoice.price.sgst)}`,
        ]),
    `Total: ${formatPaise(invoice.price.total)}`,
    invoice.paymentStatus === 'paid' ? 'Paid' : 'Payment due',
    '',
    `SAC code: ${invoice.sacCode}`,
    'This is a computer-generated invoice and needs no signature.',
  ]
  return rows.join('\n')
}
