import { useState } from 'react'
import { View } from 'react-native'
import { Banknote, ChevronRight, CircleCheck, Hourglass, Landmark, Smartphone, TrendingUp, Wallet, type LucideIcon } from 'lucide-react-native'
import { ApplianceGlyph } from '@/components/glyphs'
import { Card, Icon, Page, ScreenHeader, SectionTitle, Tappable, Text } from '@/components/ui'
import { APPLIANCES, APPLIANCE_LABEL, inr } from '@/lib/catalog'
import { cn } from '@/lib/cn'
import { billTotal, earned, isToday, thisMonth, withinDays } from '@/lib/format'
import { jobHref } from '@/lib/routes'
import { useStore } from '@/lib/store'

type Range = 'today' | 'week' | 'month'

export default function EarningsScreen() {
  const { jobs, settings } = useStore()
  const [range, setRange] = useState<Range>('week')
  const closed = jobs.filter((j) => j.status === 'closed')
  const inRange = closed.filter((j) =>
    range === 'today' ? isToday(j.scheduledAt) : range === 'week' ? withinDays(j.scheduledAt, 7) : thisMonth(j.scheduledAt)
  )
  const total = inRange.reduce((s, j) => s + earned(j), 0)
  const sum = (list: typeof closed) => list.reduce((s, j) => s + earned(j), 0)
  const totals = {
    today: sum(closed.filter((j) => isToday(j.scheduledAt))),
    week: sum(closed.filter((j) => withinDays(j.scheduledAt, 7))),
    month: sum(closed.filter((j) => thisMonth(j.scheduledAt))),
  }
  // Billed but not yet collected: the work is done, the money isn't in.
  const pending = jobs.filter((j) => j.bill && !j.bill.paid && j.status !== 'cancelled' && j.status !== 'rejected')
  // The partner keeps 80% of the bill; the rest is the platform fee.
  const share = Math.round(total * 0.8)
  const cash = inRange.filter((j) => j.bill?.method === 'cash').reduce((s, j) => s + earned(j), 0)

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - (6 - i))
    const sum = closed
      .filter((j) => {
        const x = new Date(j.scheduledAt)
        return x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth() && x.getDate() === d.getDate()
      })
      .reduce((s, j) => s + earned(j), 0)
    return { d, sum }
  })

  const byAppliance = APPLIANCES.map((a) => ({
    a,
    n: inRange.filter((j) => j.appliance === a).length,
    sum: inRange.filter((j) => j.appliance === a).reduce((s, j) => s + earned(j), 0),
  })).sort((x, y) => y.sum - x.sum)
  const maxA = Math.max(1, ...byAppliance.map((x) => x.sum))

  return (
    <>
      <ScreenHeader back="/home" title="Earnings" subtitle="Service revenue & payouts" />
      <Page className="gap-5">
        {/* The three periods side by side; tapping one scopes the page below. */}
        <View className="flex-row gap-2">
          {(
            [
              ['today', 'Today', totals.today],
              ['week', 'This week', totals.week],
              ['month', 'This month', totals.month],
            ] as const
          ).map(([key, label, value]) => (
            <Tappable
              key={key}
              accessibilityState={{ selected: range === key }}
              onPress={() => setRange(key)}
              className={cn(
                'flex-1 rounded-xl border px-3 py-3',
                range === key ? 'border-brand bg-brand-soft' : 'border-line bg-card active:border-line-strong'
              )}
            >
              <Text className={cn('text-[11px] font-bold uppercase tracking-wider', range === key ? 'text-brand' : 'text-faint')}>{label}</Text>
              <Text numberOfLines={1} adjustsFontSizeToFit className="num mt-1 text-lg font-extrabold leading-tight">
                {inr(value)}
              </Text>
            </Tappable>
          ))}
        </View>
        <View className="flex-row gap-2">
          <Card className="flex-1 flex-row items-center gap-3 p-3.5">
            <View className="size-10 shrink-0 items-center justify-center rounded-xl bg-success-soft">
              <Icon as={CircleCheck} className="size-5 text-success" />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-[11px] font-bold uppercase tracking-wider text-faint">Completed services</Text>
              <Text className="num text-lg font-extrabold leading-tight">{inRange.length}</Text>
            </View>
          </Card>
          <Card className="flex-1 flex-row items-center gap-3 p-3.5">
            <View className="size-10 shrink-0 items-center justify-center rounded-xl bg-warning-soft">
              <Icon as={Hourglass} className="size-5 text-warning" />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-[11px] font-bold uppercase tracking-wider text-faint">Pending payments</Text>
              <Text numberOfLines={1} className="num text-lg font-extrabold leading-tight">
                {inr(pending.reduce((s, j) => s + billTotal(j), 0))}
                <Text className="text-xs font-bold text-muted"> · {pending.length}</Text>
              </Text>
            </View>
          </Card>
        </View>

        <Card className="overflow-hidden">
          <View className="bg-brand-ink p-5">
            <Text className="text-xs font-bold uppercase tracking-wider text-white/60">Service revenue</Text>
            <Text className="num mt-1 text-[34px] font-extrabold leading-[38px] tracking-tight text-white">{inr(total)}</Text>
            <View className="mt-2 flex-row items-center gap-1.5">
              <Icon as={TrendingUp} className="size-4 text-live-bright" />
              <Text className="text-sm font-semibold text-white/70">
                {inRange.length} jobs · avg {inr(inRange.length ? total / inRange.length : 0)}
              </Text>
            </View>
          </View>
          <View className="flex-row">
            <View className="flex-1 p-4">
              <Text className="text-[11px] font-bold uppercase tracking-wider text-faint">Your share (80%)</Text>
              <Text className="num mt-1 text-lg font-extrabold text-success">{inr(share)}</Text>
            </View>
            <View className="flex-1 border-l border-line p-4">
              <Text className="text-[11px] font-bold uppercase tracking-wider text-faint">Cash to deposit</Text>
              <Text className="num mt-1 text-lg font-extrabold">{inr(cash)}</Text>
            </View>
          </View>
        </Card>

        <Card className="p-4">
          <View className="mb-7 flex-row items-baseline justify-between">
            <Text accessibilityRole="header" className="text-sm font-extrabold">
              Last 7 days
            </Text>
            <Text className="num text-xs font-bold text-muted">{inr(days.reduce((s, d) => s + d.sum, 0))}</Text>
          </View>
          <BarChart days={days} />
        </Card>

        <View>
          <SectionTitle>By appliance</SectionTitle>
          <Card>
            {byAppliance.map(({ a, n, sum }, i) => (
              <View key={a} className={cn('flex-row items-center gap-3 p-3', i > 0 && 'border-t border-line')}>
                <View className="size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft">
                  <ApplianceGlyph appliance={a} className="size-5 text-brand" />
                </View>
                <View className="min-w-0 flex-1">
                  <View className="flex-row items-baseline justify-between">
                    <Text className="text-sm font-bold">{APPLIANCE_LABEL[a]}</Text>
                    <Text className="num text-sm font-extrabold">{inr(sum)}</Text>
                  </View>
                  <View className="mt-1.5 flex-row items-center gap-2">
                    <View className="h-1.5 flex-1 overflow-hidden rounded-full bg-canvas">
                      <View className="h-full rounded-full bg-brand" style={{ width: `${(sum / maxA) * 100}%` }} />
                    </View>
                    <Text className="num w-12 text-right text-[11px] font-semibold text-muted">{n} jobs</Text>
                  </View>
                </View>
              </View>
            ))}
          </Card>
        </View>

        <View>
          <SectionTitle>Payouts</SectionTitle>
          <Card>
            <PayoutRow icon={Wallet} tile="bg-success-soft" tint="text-success" title="Next payout · tonight 11 PM" sub={`Settled daily to ${settings.bank}`} />
            <PayoutRow icon={Smartphone} tile="bg-brand-soft" tint="text-brand" title="UPI collections" sub={settings.upi} num />
            <PayoutRow icon={Banknote} tile="bg-warning-soft" tint="text-warning" title="Cash deposit" sub="Kondapur hub counter, before 9 PM" />
            <Tappable href="/settings" className="flex-row items-center gap-3 border-t border-line p-4 active:bg-canvas active:opacity-100">
              <View className="size-10 items-center justify-center rounded-xl bg-canvas">
                <Icon as={Landmark} className="size-5 text-ink-2" />
              </View>
              <Text className="flex-1 text-sm font-extrabold">Payment settings</Text>
              <Icon as={ChevronRight} className="size-4 text-faint" />
            </Tappable>
          </Card>
        </View>

        <View>
          <SectionTitle count={inRange.length}>Completed jobs</SectionTitle>
          <Card>
            {inRange.slice(0, 12).map((j, i) => (
              <Tappable
                key={j.id}
                href={jobHref(j)}
                className={cn('flex-row items-center gap-3 p-3 active:bg-canvas active:opacity-100', i > 0 && 'border-t border-line')}
              >
                <ApplianceGlyph appliance={j.appliance} className="size-5 text-brand" />
                <Text numberOfLines={1} className="min-w-0 flex-1 text-sm font-semibold">
                  <Text className="text-sm font-extrabold">{j.customer.name}</Text> · {APPLIANCE_LABEL[j.appliance]}
                </Text>
                <Text className="num text-sm font-extrabold">{inr(earned(j))}</Text>
              </Tappable>
            ))}
            {inRange.length === 0 && <Text className="p-4 text-sm font-medium text-muted">No completed jobs in this period yet.</Text>}
          </Card>
        </View>
      </Page>
    </>
  )
}

function PayoutRow({ icon, tile, tint, title, sub, num }: { icon: LucideIcon; tile: string; tint: string; title: string; sub: string; num?: boolean }) {
  return (
    <View className={cn('flex-row items-center gap-3 p-4', icon !== Wallet && 'border-t border-line')}>
      <View className={cn('size-10 items-center justify-center rounded-xl', tile)}>
        <Icon as={icon} className={cn('size-5', tint)} />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-extrabold">{title}</Text>
        <Text className={cn('text-xs font-medium text-muted', num && 'num')}>{sub}</Text>
      </View>
    </View>
  )
}

/** One series, so no legend: the title names it. Tap a bar for its value. */
function BarChart({ days }: { days: { d: Date; sum: number }[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1000, ...days.map((d) => d.sum))
  const nice = Math.ceil(max / 2000) * 2000
  const H = 140
  return (
    <View>
      <View className="h-[140px] flex-row items-end gap-2 border-b border-line-strong">
        {[0.5, 1].map((t) => (
          <View key={t} pointerEvents="none" className="absolute inset-x-0 border-t border-dashed border-line" style={{ bottom: H * t }}>
            <Text className="num absolute -top-4 right-0 text-[10px] font-semibold text-faint">{inr(nice * t)}</Text>
          </View>
        ))}
        {days.map((d, i) => {
          const h = (d.sum / nice) * H
          const today = i === days.length - 1
          return (
            <Tappable
              key={i}
              accessibilityLabel={`${d.d.toLocaleDateString('en-IN', { weekday: 'long' })}: ${inr(d.sum)}`}
              onPress={() => setHover(hover === i ? null : i)}
              className="h-full flex-1 items-center justify-end active:opacity-100"
            >
              <View
                className={cn('w-full max-w-7 rounded-t-[4px]', today ? 'bg-brand' : hover === i ? 'bg-brand/70' : 'bg-brand/35')}
                style={{ height: Math.max(h, d.sum ? 3 : 0) }}
              />
              {hover === i && (
                <View className="absolute z-10 rounded-md bg-ink px-2 py-1 shadow-float" style={{ bottom: Math.max(h, 0) + 10 }}>
                  <Text numberOfLines={1} className="num text-[11px] font-bold text-white">
                    {inr(d.sum)}
                  </Text>
                </View>
              )}
            </Tappable>
          )
        })}
      </View>
      <View className="mt-1.5 flex-row gap-2">
        {days.map((d, i) => (
          <Text key={i} className={cn('flex-1 text-center text-[11px] font-bold', i === days.length - 1 ? 'text-brand' : 'text-muted')}>
            {i === days.length - 1 ? 'Today' : d.d.toLocaleDateString('en-IN', { weekday: 'short' })}
          </Text>
        ))}
      </View>
    </View>
  )
}
