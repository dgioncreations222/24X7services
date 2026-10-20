import { useState } from 'react'
import { View } from 'react-native'
import { CalendarCheck, ChevronRight, Wallet } from 'lucide-react-native'
import { Async } from '@/components/ui/Async'
import { Card, EmptyState, Icon, Page, ScreenHeader, SectionTitle, Segmented, SkeletonList, Tappable, Text } from '@/components/ui'
import { useEarnings, usePayouts, type EarningLine, type EarningsSummary } from '@/lib/data'
import { cn } from '@/lib/cn'
import { useT } from '@/lib/i18n'
import { rupees } from '@/lib/money'
import { clock, day } from '@/lib/when'

type Period = EarningsSummary['period']

const EMPTY: Record<Period, string> = {
  today: 'No completed jobs today yet',
  week: 'No completed jobs this week yet',
  month: 'No completed jobs this month yet',
}

/**
 * Earnings: today, this week or this month — what customers paid, the
 * platform's commission, and what the technician keeps, job by job.
 */
export default function EarningsScreen() {
  const t = useT()
  const [period, setPeriod] = useState<Period>('week')
  return (
    <View className="flex-1 bg-canvas">
      <ScreenHeader back="/home" title={t('Earnings')} />
      <View className="border-b border-line bg-card px-4 py-3">
        <Segmented
          value={period}
          onChange={setPeriod}
          options={[
            { value: 'today', label: t('Today') },
            { value: 'week', label: t('This week') },
            { value: 'month', label: t('This month') },
          ]}
        />
      </View>
      <PeriodView key={period} period={period} />
    </View>
  )
}

function PeriodView({ period }: { period: Period }) {
  const t = useT()
  const query = useEarnings(period)
  return (
    <Async query={query} loading={<SkeletonList className="p-4" />}>
      {(s) => (
        <Page className="gap-5">
          <Card className="overflow-hidden">
            <View className="bg-brand-ink p-5">
              <Text className="text-sm font-semibold text-white/70">{t('You earned')}</Text>
              <Text className="num mt-1 text-[36px] font-extrabold leading-[42px] text-white">{rupees(s.net)}</Text>
              <Text className="mt-1 text-sm font-semibold text-white/70">{t(s.jobs === 1 ? '{n} job' : '{n} jobs', { n: s.jobs })}</Text>
            </View>
            <View className="flex-row">
              <Figure label={t('Customers paid')} value={rupees(s.gross)} />
              <Figure label={t('Commission (20%)')} value={`− ${rupees(s.commission)}`} className="border-l border-line" />
            </View>
          </Card>

          <PayoutLink />

          <View>
            <SectionTitle count={s.lines.length}>{t('Jobs')}</SectionTitle>
            {s.lines.length ? (
              <Card>
                {s.lines.map((l, i) => (
                  <Line key={l.jobId} line={l} first={i === 0} />
                ))}
              </Card>
            ) : (
              <EmptyState
                icon={<Icon as={CalendarCheck} className="size-6" />}
                title={t(EMPTY[period])}
                body={t('Money from a job shows here once you complete it.')}
              />
            )}
          </View>
        </Page>
      )}
    </Async>
  )
}

function Figure({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <View className={cn('flex-1 p-4', className)}>
      <Text className="text-sm text-muted">{label}</Text>
      <Text className="num mt-0.5 text-lg font-extrabold">{value}</Text>
    </View>
  )
}

/** One finished job: what the customer paid, the cut, and what is yours. */
function Line({ line, first }: { line: EarningLine; first: boolean }) {
  const t = useT()
  return (
    <Tappable
      href={`/jobs/summary?id=${line.jobId}`}
      className={cn('flex-row items-center gap-3 px-4 py-3.5 active:bg-canvas active:opacity-100', !first && 'border-t border-line')}
    >
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-base font-bold">
          {line.serviceName}
        </Text>
        <Text className="text-sm text-muted">
          {line.displayId} · {t(day(line.at))}, {clock(line.at)}
        </Text>
      </View>
      <View className="items-end">
        <Text className="num text-base font-extrabold text-success">{rupees(line.net)}</Text>
        <Text className="num text-xs text-muted">
          {rupees(line.gross)} − {rupees(line.commission)}
        </Text>
      </View>
    </Tappable>
  )
}

/** The payout still to come, and the way to every payout. */
function PayoutLink() {
  const t = useT()
  const payouts = usePayouts()
  const next = payouts.data?.find((p) => p.status !== 'paid')
  return (
    <Tappable href="/payouts" className="flex-row items-center gap-3 rounded-card border border-line bg-card p-4 shadow-card active:bg-canvas">
      <View className="size-11 items-center justify-center rounded-xl bg-success-soft">
        <Icon as={Wallet} className="size-5 text-success" />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-base font-bold">{t('Payouts')}</Text>
        <Text numberOfLines={1} className="text-sm text-muted">
          {next ? t('{amount} waiting for approval', { amount: rupees(next.net) }) : t('Paid weekly to your bank account')}
        </Text>
      </View>
      <Icon as={ChevronRight} className="size-5 text-faint" />
    </Tappable>
  )
}
