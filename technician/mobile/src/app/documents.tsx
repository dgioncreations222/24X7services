import { View } from 'react-native'
import { CreditCard, FileBadge, Landmark, UserRound, type LucideIcon } from 'lucide-react-native'
import { Button, Card, Chip, Icon, Page, ScreenHeader, SectionTitle, Text } from '@/components/ui'
import { useKyc, type KycDocType, type KycDocument, type PayoutDetails } from '@/lib/data'
import { cn } from '@/lib/cn'
import type { Tone } from '@/lib/status'
import { useT } from '@/lib/i18n'
import { shortDate } from '@/lib/when'

const DOCS: readonly { type: KycDocType; title: string; icon: LucideIcon }[] = [
  { type: 'aadhaar', title: 'Aadhaar card', icon: FileBadge },
  { type: 'pan', title: 'PAN card', icon: CreditCard },
  { type: 'photo', title: 'Your photo', icon: UserRound },
  { type: 'bank', title: 'Bank proof', icon: Landmark },
]

const STATUS: Record<KycDocument['status'] | 'missing', { label: string; tone: Tone }> = {
  approved: { label: 'Verified', tone: 'success' },
  pending: { label: 'Under review', tone: 'warning' },
  uploaded: { label: 'Uploaded', tone: 'info' },
  rejected: { label: 'Needs a fix', tone: 'danger' },
  missing: { label: 'Not uploaded', tone: 'neutral' },
}

/** The KYC documents checked when the technician joined, and the payout account. */
export default function DocumentsScreen() {
  const t = useT()
  const kyc = useKyc()
  return (
    <View className="flex-1 bg-canvas">
      <ScreenHeader back="/profile" title={t('My documents')} />
      <Page className="gap-5">
        <View>
          <SectionTitle>{t('Identity')}</SectionTitle>
          <Card>
            {DOCS.map((d, i) => {
              const doc = kyc.documents[d.type]
              const s = STATUS[doc?.status ?? 'missing']
              return (
                <View key={d.type} className={cn('flex-row items-center gap-3 px-4 py-3.5', i > 0 && 'border-t border-line')}>
                  <View className="size-10 items-center justify-center rounded-xl bg-canvas">
                    <Icon as={d.icon} className="size-5 text-ink-2" />
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="text-base font-bold">{t(d.title)}</Text>
                    {doc ? <Text className="num text-sm text-muted">{t('Uploaded {date}', { date: shortDate(doc.uploadedAt) })}</Text> : null}
                  </View>
                  <Chip tone={s.tone}>{t(s.label)}</Chip>
                </View>
              )
            })}
          </Card>
          {kyc.rejectReason ? <Text className="mt-2 text-sm font-semibold text-danger">{kyc.rejectReason}</Text> : null}
        </View>

        {kyc.payout ? (
          <View>
            <SectionTitle>{t('Payout account')}</SectionTitle>
            <Card className="p-4">
              <PayoutAccount payout={kyc.payout} />
            </Card>
          </View>
        ) : null}

        <Card className="p-4">
          <Text className="text-sm text-muted">{t('Need to update a document or your bank account? Raise a ticket and the team will guide you.')}</Text>
          <Button variant="secondary" className="mt-3" href="/support?raise=other">
            {t('Raise a ticket')}
          </Button>
        </Card>
      </Page>
    </View>
  )
}

function PayoutAccount({ payout }: { payout: PayoutDetails }) {
  const t = useT()
  if ('upiId' in payout)
    return (
      <>
        <Text className="text-base font-bold">{t('UPI')}</Text>
        <Text className="num text-sm text-muted">{payout.upiId}</Text>
      </>
    )
  return (
    <>
      <Text className="text-base font-bold">{payout.accountName}</Text>
      <Text className="num text-sm text-muted">
        {t('Account')} ···· {payout.accountNumber.slice(-4)} · {payout.ifsc}
      </Text>
    </>
  )
}
