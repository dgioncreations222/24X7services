import { View } from 'react-native'
import { Landmark, Smartphone, Wallet } from 'lucide-react-native'
import { Async } from '@/components/ui/Async'
import { Button, Card, Chip, EmptyState, Icon, Page, ScreenHeader, SectionTitle, SkeletonList, Text } from '@/components/ui'
import { usePayouts, useProfile, type Payout } from '@/lib/data'
import { cn } from '@/lib/cn'
import type { Tone } from '@/lib/status'
import { useT } from '@/lib/i18n'
import { rupees } from '@/lib/money'
import { shortDate } from '@/lib/when'

const STATUS: Record<Payout['status'], { label: string; tone: Tone }> = {
  pending: { label: 'Waiting for approval', tone: 'warning' },
  approved: { label: 'Approved', tone: 'info' },
  paid: { label: 'Paid', tone: 'success' },
}

/** Weekly payouts, newest first, and the account they are paid into. */
export default function PayoutsScreen() {
  const t = useT()
  const payouts = usePayouts()
  return (
    <View className="flex-1 bg-canvas">
      <ScreenHeader back="/earnings" title={t('Payouts')} />
      <Page className="gap-5">
        <PaidInto />
        <View>
          <SectionTitle>{t('Payout history')}</SectionTitle>
          <Async
            query={payouts}
            loading={<SkeletonList rows={3} />}
            empty={
              <EmptyState
                icon={<Icon as={Wallet} className="size-6" />}
                title={t('No payouts yet')}
                body={t('Your first payout comes at the end of the week you complete a job.')}
              />
            }
          >
            {(list) => (
              <Card>
                {list.map((p, i) => (
                  <PayoutRow key={p.id} payout={p} first={i === 0} />
                ))}
              </Card>
            )}
          </Async>
        </View>
      </Page>
    </View>
  )
}

function PayoutRow({ payout: p, first }: { payout: Payout; first: boolean }) {
  const t = useT()
  const s = STATUS[p.status]
  return (
    <View className={cn('gap-2 px-4 py-3.5', !first && 'border-t border-line')}>
      <View className="flex-row items-center justify-between gap-3">
        <Text className="num text-base font-bold">
          {shortDate(p.periodStart)} – {shortDate(p.periodEnd)}
        </Text>
        <Text className="num text-lg font-extrabold">{rupees(p.net)}</Text>
      </View>
      <View className="flex-row items-center justify-between gap-3">
        <Text className="text-sm text-muted">
          {t(p.jobCount === 1 ? '{n} job' : '{n} jobs', { n: p.jobCount })} · {t('commission')} {rupees(p.commission)}
        </Text>
        <Chip tone={s.tone}>{p.paidAt && p.status === 'paid' ? t('Paid {date}', { date: shortDate(p.paidAt) }) : t(s.label)}</Chip>
      </View>
    </View>
  )
}

/** Where the money goes. Changing it needs a check, so it goes through support. */
function PaidInto() {
  const t = useT()
  const profile = useProfile()
  return (
    <View>
      <SectionTitle>{t('Paid into')}</SectionTitle>
      <Async query={profile} loading={<SkeletonList rows={1} />}>
        {(p) => (
          <Card>
            {p.bank ? (
              <Account icon={Landmark} title={p.bank.name} sub={`${t('Account')} ···· ${p.bank.last4}`} first />
            ) : null}
            {p.upiId ? <Account icon={Smartphone} title={t('UPI')} sub={p.upiId} first={!p.bank} /> : null}
            <View className="border-t border-line p-4">
              <Text className="text-sm text-muted">{t('To change your bank account, raise a ticket. We check the new account before the next payout.')}</Text>
              <Button variant="secondary" className="mt-3" href="/support?raise=payment">
                {t('Raise a ticket')}
              </Button>
            </View>
          </Card>
        )}
      </Async>
    </View>
  )
}

function Account({ icon, title, sub, first }: { icon: typeof Landmark; title: string; sub: string; first?: boolean }) {
  return (
    <View className={cn('flex-row items-center gap-3 p-4', !first && 'border-t border-line')}>
      <View className="size-10 items-center justify-center rounded-xl bg-canvas">
        <Icon as={icon} className="size-5 text-ink-2" />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-base font-bold">{title}</Text>
        <Text className="num text-sm text-muted">{sub}</Text>
      </View>
    </View>
  )
}
