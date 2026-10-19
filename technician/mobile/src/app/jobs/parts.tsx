import { useState } from 'react'
import { TextInput, View } from 'react-native'
import { Minus, Plus, Search, Truck } from 'lucide-react-native'
import { ApplianceGlyph } from '@/components/glyphs'
import { JobNotFound, useJobParam } from '@/components/JobParts'
import { ActionDock, Button, Card, Chip, Icon, Page, ScreenHeader, Tappable, Text } from '@/components/ui'
import { APPLIANCE_LABEL, PARTS, applianceTitle, inr } from '@/lib/catalog'
import { cn } from '@/lib/cn'
import { useBack } from '@/lib/nav'
import { stepHref } from '@/lib/routes'
import { useStore } from '@/lib/store'
import type { Job, PartLine } from '@/lib/types'
import { COLORS } from '@/lib/theme'

export default function Parts() {
  const job = useJobParam()
  if (!job) return <JobNotFound />
  return <PartsPicker key={job.id} job={job} />
}

/**
 * Only the parts that fit this appliance. The catalogue is per appliance, so
 * a washing-machine job cannot end up billing an AC capacitor.
 */
function PartsPicker({ job }: { job: Job }) {
  const store = useStore()
  const goBack = useBack(stepHref('detail', job.id))
  const [qty, setQty] = useState<Record<string, number>>(() => Object.fromEntries(job.parts.map((p) => [p.sku, p.qty])))
  const [q, setQ] = useState('')
  const catalog = PARTS[job.appliance].filter((p) => p.name.toLowerCase().includes(q.toLowerCase()))
  const readOnly = job.status === 'closed'

  const lines: PartLine[] = PARTS[job.appliance]
    .filter((p) => (qty[p.sku] ?? 0) > 0)
    .map((p) => ({ sku: p.sku, name: p.name, qty: qty[p.sku]!, price: p.price, inVan: p.inVan }))
  const total = lines.reduce((s, l) => s + l.qty * l.price, 0)
  const toOrder = lines.filter((l) => !l.inVan).length

  const bump = (sku: string, d: number) => setQty((m) => ({ ...m, [sku]: Math.max(0, Math.min(9, (m[sku] ?? 0) + d)) }))

  return (
    <>
      <ScreenHeader back={stepHref('detail', job.id)} title="Parts" subtitle={`${applianceTitle(job.brand, job.appliance)} · ${job.id}`} />
      <Page className="gap-4">
        <View className="flex-row items-center gap-3 rounded-card border border-line bg-card p-3">
          <View className="size-10 items-center justify-center rounded-xl bg-brand-soft">
            <ApplianceGlyph appliance={job.appliance} className="size-6 text-brand" />
          </View>
          <Text className="flex-1 text-sm font-semibold text-ink-2">
            Showing <Text className="text-sm font-extrabold text-ink">{APPLIANCE_LABEL[job.appliance]}</Text> parts only
          </Text>
        </View>

        <View className="justify-center">
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search parts"
            placeholderTextColor={COLORS.faint}
            returnKeyType="search"
            clearButtonMode="while-editing"
            className="h-12 w-full rounded-xl border border-line-strong bg-card pl-10 pr-3 text-base font-normal text-ink"
          />
          <View pointerEvents="none" className="absolute left-3.5">
            <Icon as={Search} className="size-4 text-faint" />
          </View>
        </View>

        <Card className="overflow-hidden">
          {catalog.map((p, i) => {
            const n = qty[p.sku] ?? 0
            return (
              <View key={p.sku} className={cn('gap-2 px-4 py-3', i > 0 && 'border-t border-line', n > 0 && 'bg-brand-soft/50')}>
                <View className="flex-row items-start gap-3">
                  <View className="min-w-0 flex-1">
                    <Text className="text-sm font-extrabold">{p.name}</Text>
                    <Text className="num text-xs font-semibold text-faint">{p.sku}</Text>
                  </View>
                  <Text className="num text-right text-sm font-extrabold">{inr(p.price)}</Text>
                </View>
                <View className="flex-row items-center justify-between gap-3">
                  {p.inVan ? <Chip tone="success">Available</Chip> : <Chip tone="danger">Not Available</Chip>}
                  <View className="flex-row items-center gap-1">
                    <Tappable
                      disabled={readOnly || n === 0}
                      onPress={() => bump(p.sku, -1)}
                      accessibilityLabel={`Fewer ${p.name}`}
                      className={cn('size-10 items-center justify-center rounded-lg border border-line-strong bg-card', (readOnly || n === 0) && 'opacity-40')}
                    >
                      <Icon as={Minus} className="size-4" />
                    </Tappable>
                    <Text className="num w-8 text-center text-base font-extrabold">{n}</Text>
                    <Tappable
                      disabled={readOnly}
                      onPress={() => bump(p.sku, 1)}
                      accessibilityLabel={`More ${p.name}`}
                      className={cn('size-10 items-center justify-center rounded-lg border border-brand bg-brand', readOnly && 'opacity-40')}
                    >
                      <Icon as={Plus} className="size-4 text-white" />
                    </Tappable>
                  </View>
                </View>
              </View>
            )
          })}
        </Card>

        {toOrder > 0 && (
          <View className="flex-row items-start gap-3 rounded-card border border-warning/30 bg-warning-soft p-3.5">
            <Icon as={Truck} className="mt-0.5 size-5 shrink-0 text-warning" />
            <Text className="flex-1 text-sm font-medium text-ink-2">
              <Text className="text-sm font-extrabold text-ink">
                {toOrder} part{toOrder > 1 ? 's' : ''} not in your van.
              </Text>{' '}
              They’ll be requested from the Kondapur hub — usually next-day. Schedule a revisit with the customer.
            </Text>
          </View>
        )}
      </Page>

      {!readOnly && (
        <ActionDock>
          <View className="min-w-0 flex-1 justify-center">
            <Text className="text-xs font-bold text-muted">{lines.reduce((s, l) => s + l.qty, 0)} items</Text>
            <Text className="num text-lg font-extrabold leading-tight">{inr(total)}</Text>
          </View>
          <Button
            size="lg"
            className="flex-[1.6]"
            textClassName="text-[15px] font-extrabold"
            onPress={() => {
              store.setParts(job.id, lines)
              // Back to wherever the picker was opened from — the job or its diagnosis.
              goBack()
            }}
          >
            Save parts
          </Button>
        </ActionDock>
      )}
    </>
  )
}
