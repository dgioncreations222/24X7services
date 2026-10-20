import { useCallback, useState } from 'react'
import { Linking, Platform } from 'react-native'
import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { Download, FileText, Share2 } from 'lucide-react-native'
import type { Booking, Invoice } from '@app/shared'

import { BookingShell } from '@/components/BookingShell'
import { InvoiceView, invoiceText } from '@/components/InvoiceView'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Text } from '@/components/ui/Text'
import { EmptyState , ErrorState } from '@/components/ui/States'

import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { useToast } from '@/components/Toast'
import { fetchInvoice, invoicePdfUrl } from '@/lib/api/invoices'
import { shareText } from '@/lib/share'
import { useAsync } from '@/lib/useAsync'

/**
 * The GST invoice for a finished job.
 *
 * Read from the invoice document, which the completion trigger wrote with the
 * seller details copied into it. Nothing on this screen reads the business
 * config — an invoice has to keep saying what it said on the day it was issued,
 * and a screen that re-read the config would silently reissue every past
 * invoice under a new address.
 *
 * The PDF is the same document rendered as a file, for anyone who has to hand
 * it to an accountant. On a phone it is downloaded and handed to the share
 * sheet (save to Files, mail it, WhatsApp it). If the render failed there is no
 * file and the screen says so — and offers the invoice as text instead, which
 * the web's print view covered there.
 */
export default function InvoiceScreen() {
  return (
    <BookingShell title="Invoice">
      {({ booking }) => <InvoiceBody booking={booking} />}
    </BookingShell>
  )
}

/** Fetch the PDF to the cache and open the share sheet on it. */
async function sharePdf(url: string, invoice: Invoice): Promise<void> {
  if (Platform.OS === 'web' || !(await Sharing.isAvailableAsync())) {
    await Linking.openURL(url)
    return
  }
  const name = `${invoice.number.replace(/[^A-Za-z0-9-]+/g, '-')}.pdf`
  const target = new File(Paths.cache, name)
  if (target.exists) target.delete()
  const file = await File.downloadFileAsync(url, target)
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: `Invoice ${invoice.number}`,
  })
}

function InvoiceBody({ booking }: { booking: Booking }) {
  const toast = useToast()
  const [downloading, setDownloading] = useState(false)
  const invoiceId = booking.invoiceId

  const load = useCallback(async (): Promise<Invoice | null> => {
    if (!invoiceId) return null
    return fetchInvoice(invoiceId)
  }, [invoiceId])

  const invoice = useAsync(load)

  async function download(path: string, data: Invoice): Promise<void> {
    setDownloading(true)
    try {
      // A short-lived URL fetched on demand rather than a link stored on the
      // invoice — a token written into a document outlives what it was for.
      const url = await invoicePdfUrl(path)
      await sharePdf(url, data)
    } catch {
      toast.show('We could not open the PDF just now. Please try again.', {
        tone: 'error',
      })
    } finally {
      setDownloading(false)
    }
  }

  async function shareAsText(data: Invoice): Promise<void> {
    const outcome = await shareText(invoiceText(data), `Invoice ${data.number}`)
    if (outcome === 'copied') toast.show('Invoice copied.', { tone: 'success' })
    else if (outcome === 'failed') toast.show('We could not share the invoice just now.', { tone: 'error' })
  }

  if (!invoiceId) {
    return (
      <EmptyState
        className="py-16"
        icon={FileText}
        title="No invoice yet"
        description="An invoice is issued the moment the job is marked complete."
      />
    )
  }

  if (invoice.status === 'loading') {
    return (
      <SkeletonGroup label="Loading invoice" className="mt-6 gap-3">
        <Skeleton className="h-64 w-full" />
      </SkeletonGroup>
    )
  }

  if (invoice.status === 'error' || !invoice.data) {
    return <ErrorState className="py-16" onRetry={invoice.reload} retrying={invoice.refreshing} />
  }

  const data = invoice.data

  return (
    <>
      <InvoiceView className="mt-5" invoice={data} />

      {data.pdfPath ? (
        <Button
          className="mt-4"
          variant="secondary"
          fullWidth
          loading={downloading}
          iconLeft={<Icon as={Download} className="size-4 text-brand" />}
          onPress={() => void download(data.pdfPath as string, data)}
        >
          Download PDF
        </Button>
      ) : (
        <>
          <Text className="mt-4 text-center text-xs text-muted">
            The PDF is still being prepared. Everything on it is above.
          </Text>
          <Button
            className="mt-3"
            variant="ghost"
            fullWidth
            iconLeft={<Icon as={Share2} className="size-4 text-ink" />}
            onPress={() => void shareAsText(data)}
          >
            Share as text
          </Button>
        </>
      )}
    </>
  )
}
