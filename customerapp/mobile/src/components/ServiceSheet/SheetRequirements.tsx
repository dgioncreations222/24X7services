import { ScrollView, View } from 'react-native'
import { Check, ChevronDown } from 'lucide-react-native'
import type { CatalogAppliance, CatalogIssue, CatalogService } from '@app/shared'

import { titleCase } from '@/components/ServiceSheet/options'
import { Band } from '@/components/ServiceSheet/SheetPromise'
import { Icon } from '@/components/ui/Icon'
import { Tappable } from '@/components/ui/Tappable'
import { Text } from '@/components/ui/Text'
import { formatPaise } from '@/lib/format'
import { cn } from '@/lib/cn'

type KindField = CatalogAppliance['detailFields'][number]

/**
 * "Select requirements": the problem, where the service is booked for one,
 * then the kind of machine, each a step that opens once the one before it is
 * answered.
 */
export function SheetRequirements({
  service,
  options,
  kindField,
  kinds,
  issueId,
  setIssueId,
  kind,
  setKind,
  needsIssue,
  needsKind,
  openStep,
  setOpenStep,
}: {
  service: CatalogService
  options: readonly CatalogIssue[]
  kindField?: KindField
  kinds: readonly string[]
  issueId: string | null
  setIssueId: (id: string) => void
  kind: string | null
  setKind: (kind: string) => void
  needsIssue: boolean
  needsKind: boolean
  openStep: 1 | 2
  setOpenStep: (step: 1 | 2) => void
}) {
  return (
    <>
      <Band />
      <View className="px-5 py-7">
        <Text accessibilityRole="header" className="text-2xl font-bold text-ink">
          Select requirements
        </Text>
        <View className="mt-5">
          {needsIssue ? (
            <Step
              number={1}
              title="Select type of issue"
              answer={options.find((each) => each.id === issueId)?.label}
              open={openStep === 1}
              onToggle={() => setOpenStep(1)}
            >
              <Choices
                choices={options.map((issue) => ({
                  key: issue.id,
                  label: issue.label,
                  note: formatPaise(service.visitFee),
                }))}
                chosen={issueId}
                onChoose={(id) => {
                  setIssueId(id)
                  if (needsKind) setOpenStep(2)
                }}
              />
            </Step>
          ) : null}
          {needsKind && kindField ? (
            <Step
              number={needsIssue ? 2 : 1}
              title={`Select ${kindField.label.toLowerCase()}`}
              answer={kind ? titleCase(kind) : undefined}
              open={openStep === 2}
              // Waits for the problem, where there is one to pick.
              disabled={needsIssue && issueId === null}
              divided={needsIssue}
              onToggle={() => setOpenStep(2)}
            >
              <Choices
                choices={kinds.map((each) => ({
                  key: each,
                  label: titleCase(each),
                }))}
                chosen={kind}
                onChoose={setKind}
              />
            </Step>
          ) : null}
        </View>
      </View>
    </>
  )
}

/** One numbered question in "Select requirements", folding open to its choices. */
function Step({
  number,
  title,
  answer,
  open,
  disabled = false,
  divided = false,
  onToggle,
  children,
}: {
  number: number
  title: string
  /** What was picked, shown on the folded step. */
  answer?: string
  open: boolean
  disabled?: boolean
  /** A rule above it, between it and the step before. */
  divided?: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  const expanded = open && !disabled
  return (
    <View className={cn('py-4', divided && 'border-t border-border')}>
      <Tappable
        onPress={onToggle}
        disabled={disabled}
        accessibilityState={{ expanded, disabled }}
        className={cn('w-full flex-row items-center gap-4', disabled && 'opacity-45')}
      >
        <View className="size-8 shrink-0 items-center justify-center rounded-md bg-surface">
          <Text className="text-sm font-semibold text-ink">{number}</Text>
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-lg text-ink">{title}</Text>
          {!expanded && answer ? (
            <View className="mt-0.5 flex-row items-center gap-1">
              <Icon as={Check} className="size-4 text-success" />
              <Text className="text-sm font-semibold text-success">{answer}</Text>
            </View>
          ) : null}
        </View>
        <View style={expanded ? { transform: [{ rotate: '180deg' }] } : undefined}>
          <Icon as={ChevronDown} className="size-5 text-muted" />
        </View>
      </Tappable>
      {expanded ? <View className="mt-4">{children}</View> : null}
    </View>
  )
}

/** A row of cards to pick one from, scrolling sideways past the sheet's edge. */
function Choices({
  choices,
  chosen,
  onChoose,
}: {
  choices: readonly { key: string; label: string; note?: string }[]
  chosen: string | null
  onChoose: (key: string) => void
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="-mx-5"
      contentContainerClassName="gap-3 px-5 pb-1"
      accessibilityRole="radiogroup"
    >
      {choices.map((choice) => {
        const on = chosen === choice.key
        return (
          <Tappable
            key={choice.key}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            onPress={() => onChoose(choice.key)}
            className={cn(
              'min-h-24 w-40 shrink-0 justify-between rounded-card border p-4',
              on ? 'border-ink bg-surface' : 'border-border active:border-muted'
            )}
          >
            <Text numberOfLines={2} className="text-base text-ink">
              {choice.label}
            </Text>
            {choice.note ? (
              <Text className="mt-3 text-lg font-semibold text-ink">{choice.note}</Text>
            ) : null}
          </Tappable>
        )
      })}
    </ScrollView>
  )
}
