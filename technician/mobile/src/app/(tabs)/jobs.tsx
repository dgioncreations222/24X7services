import { useMemo, useState } from 'react'
import { ScrollView, TextInput, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { BriefcaseBusiness, Search, Siren } from 'lucide-react-native'
import { NO_FILTERS, applyFilters, type FilterState } from '@/components/Filters'
import { ApplianceGlyph } from '@/components/glyphs'
import { JobCard, variantOf, type CardVariant } from '@/components/JobCard'
import { Empty, FilterChip, Icon, Inherit, Labelled, Page, ScreenHeader, SectionTitle, Tappable, Text } from '@/components/ui'
import { APPLIANCES, APPLIANCE_LABEL, BRANDS, BRAND_LABEL } from '@/lib/catalog'
import { cn } from '@/lib/cn'
import { isToday, matchesQuery } from '@/lib/format'
import type { Job } from '@/lib/types'
import { useStore } from '@/lib/store'

/** The Jobs screen's chips, in the order a job moves — Emergency last, as a cut across them. */
const CHIPS = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'on_the_way', label: 'On The Way' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'emergency', label: 'Emergency' },
] as const

type Chip = (typeof CHIPS)[number]['key']

const CHIP_MATCH: Record<Chip, (j: Job, v: CardVariant) => boolean> = {
  all: () => true,
  new: (_, v) => v === 'request' || v === 'emergency',
  accepted: (_, v) => v === 'accepted',
  on_the_way: (_, v) => v === 'on_the_way',
  in_progress: (_, v) => v === 'in_progress',
  completed: (_, v) => v === 'completed',
  emergency: (j, v) => j.priority === 'emergency' && v !== 'completed' && v !== 'cancelled',
}

const inChip = (j: Job, c: Chip) => CHIP_MATCH[c](j, variantOf(j))

/** `?chip=completed` (or any chip key) opens the screen on that chip. */
const chipFrom = (v?: string): Chip => (CHIPS.some((c) => c.key === v) ? (v as Chip) : 'all')

export default function JobsScreen() {
  const { jobs } = useStore()
  const { chip } = useLocalSearchParams<{ chip?: string }>()
  const [status, setStatus] = useState<Chip>(chipFrom(chip))
  // The tab stays mounted, so a later link with another chip has to move it.
  const [linked, setLinked] = useState(chip)
  if (chip !== linked) {
    setLinked(chip)
    setStatus(chipFrom(chip))
  }
  const [filters, setFilters] = useState<FilterState>(NO_FILTERS)
  const [q, setQ] = useState('')

  // Today's board: everything scheduled today plus open requests.
  const board = useMemo(
    () => jobs.filter((j) => j.status !== 'rejected' && (j.status === 'request' || isToday(j.scheduledAt))),
    [jobs]
  )

  const shown = applyFilters(board, filters)
    .filter((j) => inChip(j, status))
    .filter((j) => matchesQuery(j, q))
    .sort((a, b) => Number(b.status === 'request') - Number(a.status === 'request') || a.scheduledAt.localeCompare(b.scheduledAt))

  const count = (k: Chip) => board.filter((j) => inChip(j, k)).length

  return (
    <>
      <ScreenHeader
        back="/home"
        title="Jobs"
        subtitle={`${board.length} on today’s board`}
      />
      <Page className="gap-4">
        <View className="relative justify-center">
          <View pointerEvents="none" className="absolute left-3.5 z-10">
            <Icon as={Search} className="size-4 text-faint" />
          </View>
          <TextInput
            value={q}
            onChangeText={setQ}
            accessibilityLabel="Search jobs"
            placeholder="Customer, area, job ID…"
            placeholderTextColor="#8a93a3"
            returnKeyType="search"
            className="h-10 w-full rounded-xl border border-line-strong bg-card pl-10 pr-3 text-[15px] text-ink"
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4 grow-0" contentContainerClassName="gap-2 px-4">
          {CHIPS.map((c) => (
            <FilterChip key={c.key} active={status === c.key} onClick={() => setStatus(c.key)}>
              {c.key === 'emergency' && <Icon as={Siren} className={cn('size-3.5', status === c.key ? 'text-white' : 'text-danger')} />}
              <Text>
                {c.label} <Text className="num opacity-60">{count(c.key)}</Text>
              </Text>
            </FilterChip>
          ))}
        </ScrollView>

        <View className="gap-2">
          <ChipRow label="Brand">
            {BRANDS.map((b) => (
              <MiniChip key={b} active={filters.brands.includes(b)} onClick={() => setFilters((f) => ({ ...f, brands: toggle(f.brands, b) }))}>
                {BRAND_LABEL[b]}
              </MiniChip>
            ))}
          </ChipRow>
          <ChipRow label="Service">
            {APPLIANCES.map((a) => (
              <MiniChip key={a} active={filters.appliances.includes(a)} onClick={() => setFilters((f) => ({ ...f, appliances: toggle(f.appliances, a) }))}>
                <ApplianceGlyph appliance={a} className="size-3.5" />
                {APPLIANCE_LABEL[a]}
              </MiniChip>
            ))}
          </ChipRow>
        </View>

        <View>
          <SectionTitle count={shown.length}>{status === 'all' ? 'Today’s board' : CHIPS.find((c) => c.key === status)!.label}</SectionTitle>
          {shown.length ? (
            <View className="gap-3">
              {shown.map((j) => (
                <JobCard key={j.id} job={j} />
              ))}
            </View>
          ) : (
            <Empty icon={<Icon as={BriefcaseBusiness} className="size-5" />} title="No jobs match" body="Try another status, or clear the brand and appliance filters." />
          )}
        </View>
      </Page>
    </>
  )
}

function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v]
}

function ChipRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="flex-row items-center gap-2">
      <Text className="w-14 shrink-0 text-[11px] font-bold uppercase tracking-wider text-faint">{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mr-4 min-w-0 flex-1" contentContainerClassName="gap-1.5 pr-4">
        {children}
      </ScrollView>
    </View>
  )
}

function MiniChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Tappable
      accessibilityState={{ selected: active }}
      onPress={onClick}
      className={cn('h-8 shrink-0 flex-row items-center gap-1.5 rounded-lg border px-2.5', active ? 'border-brand bg-brand-soft' : 'border-line bg-card')}
    >
      <Inherit className={cn('text-[12.5px] font-bold', active ? 'text-brand' : 'text-ink-2')}>
        <Labelled>{children}</Labelled>
      </Inherit>
    </Tappable>
  )
}
