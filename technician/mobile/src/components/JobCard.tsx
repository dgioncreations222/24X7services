import { Linking, View } from 'react-native'
import { router, type Href } from 'expo-router'
import type { LucideIcon } from 'lucide-react-native'
import { Clock, IndianRupee, MapPin, Navigation, Package, Phone, Siren, Star, Stethoscope, TriangleAlert, UserRound } from 'lucide-react-native'
import { APPLIANCE_LABEL, BRAND_LABEL, inr } from '@/lib/catalog'
import { cn } from '@/lib/cn'
import { ago, billTotal, dayLabel, directionsHref, driveProgress, earned, telHref, time } from '@/lib/format'
import { jobHref, stepHref } from '@/lib/routes'
import { IN_PROGRESS, STEP_LABEL } from '@/lib/status'
import { useStore, useTick } from '@/lib/store'
import type { FlowStep, Job } from '@/lib/types'
import { ApplianceGlyph } from './glyphs'
import { ServiceMap } from './ServiceMap'
import { Icon, Inherit, Labelled, Tappable, Text } from './ui'

/**
 * A field job card. Every variant reads in the same order — status, what,
 * the problem, who, where, when, money, action — so a technician scanning a
 * list never has to hunt: the eye lands in the same place on every card.
 *
 * The card body opens the job; the action row holds the one or two things
 * the current status calls for, primary on the right, under the thumb.
 */

export type CardVariant = 'request' | 'emergency' | 'accepted' | 'on_the_way' | 'in_progress' | 'completed' | 'cancelled'

export function variantOf(job: Job): CardVariant {
  if (job.status === 'request') return job.priority === 'emergency' ? 'emergency' : 'request'
  if (job.status === 'assigned' || job.status === 'accepted') return 'accepted'
  if (job.status === 'on_the_way') return 'on_the_way'
  if (IN_PROGRESS.includes(job.status)) return 'in_progress'
  if (job.status === 'closed') return 'completed'
  return 'cancelled'
}

const BADGE: Record<CardVariant, { label: string; box: string; text: string }> = {
  request: { label: 'New request', box: 'bg-brand', text: 'text-white' },
  emergency: { label: 'Emergency', box: 'bg-danger', text: 'text-white' },
  accepted: { label: 'Accepted', box: 'bg-brand-soft', text: 'text-brand' },
  on_the_way: { label: 'On the way', box: 'bg-info-soft', text: 'text-info' },
  in_progress: { label: 'In progress', box: 'bg-violet-soft', text: 'text-violet' },
  completed: { label: 'Completed', box: 'bg-success-soft', text: 'text-success' },
  cancelled: { label: 'Cancelled', box: 'bg-canvas', text: 'text-muted' },
}

function when(iso: string): string {
  return `${dayLabel(iso)} • ${time(iso)}`
}

/** A small status tag at the head of the card. */
function Tag({ box, text, children }: { box: string; text: string; children: string }) {
  return (
    <View className={cn('h-6 shrink-0 flex-row items-center rounded-md px-2', box)}>
      <Text className={cn('text-[10.5px] font-extrabold uppercase tracking-wider', text)}>{children}</Text>
    </View>
  )
}

export function JobCard({ job }: { job: Job }) {
  const variant = variantOf(job)
  const emergency = variant === 'emergency'
  const now = useTick(10_000)
  const badge = job.status === 'assigned' ? { label: 'Assigned', box: 'bg-warning-soft', text: 'text-warning' } : BADGE[variant]

  return (
    <View
      className={cn(
        'overflow-hidden rounded-2xl border bg-card shadow-card',
        emergency ? 'border-danger/50' : 'border-line',
        variant === 'cancelled' && 'opacity-75'
      )}
    >
      {emergency && (
        <View className="flex-row items-center justify-between gap-2 bg-danger px-4 py-2">
          <View className="flex-row items-center gap-1.5">
            <Icon as={Siren} className="size-4 text-white" />
            <Text className="text-[11px] font-extrabold uppercase tracking-wider text-white">Respond now</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Icon as={TriangleAlert} className="size-3.5 text-white" />
            <Text className="text-[11px] font-extrabold uppercase tracking-wider text-white">Priority: High</Text>
          </View>
        </View>
      )}

      <Tappable href={jobHref(job)} className="p-4 active:bg-canvas/60 active:opacity-100">
        {/* 1 — status */}
        <View className="flex-row items-center gap-1.5">
          <Tag box={badge.box} text={badge.text}>
            {badge.label}
          </Tag>
          {variant === 'request' && job.priority === 'high' && (
            <Tag box="bg-warning" text="text-white">
              Urgent
            </Tag>
          )}
          {variant === 'request' && job.priority === 'normal' && (
            <Tag box="bg-canvas" text="text-muted">
              Normal
            </Tag>
          )}
          {variant === 'in_progress' && (
            <Text numberOfLines={1} className="shrink text-[11.5px] font-bold text-violet">
              {STEP_LABEL[job.status as FlowStep]}
            </Text>
          )}
          <Text className="num ml-auto shrink-0 text-[11px] font-semibold text-faint">{job.id}</Text>
        </View>

        {/* 2 — brand + appliance */}
        <View className="mt-3 flex-row items-center gap-3">
          <View className={cn('size-11 shrink-0 items-center justify-center rounded-xl', emergency ? 'bg-danger-soft' : 'bg-brand-soft')}>
            <ApplianceGlyph appliance={job.appliance} className={cn('size-6', emergency ? 'text-danger' : 'text-brand')} />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-muted">{BRAND_LABEL[job.brand]}</Text>
            <Text numberOfLines={1} accessibilityRole="header" className="text-[17px] font-extrabold leading-tight tracking-tight">
              {APPLIANCE_LABEL[job.appliance]}
            </Text>
          </View>
        </View>

        {/* 3 — the problem, or the work done */}
        <Text className={cn('mt-3 text-[15px] font-semibold leading-snug', emergency ? 'text-danger' : 'text-ink')}>
          {variant === 'completed' ? (job.diagnosis?.repair ?? `${job.service} — ${job.issue}`) : `“${job.issue}”`}
        </Text>

        {/* 4–7 — who, where, when, money */}
        <View className="mt-3 flex-row flex-wrap gap-y-2.5 rounded-xl bg-canvas px-3.5 py-3">
          <Fact icon={UserRound} label="Customer" value={job.customer.name} />
          {variant === 'completed' || variant === 'cancelled' ? (
            <Fact icon={MapPin} label="Area" value={job.customer.area} />
          ) : (
            <Fact icon={MapPin} label="Location" value={`${job.customer.area} · ${job.distanceKm} km`} />
          )}
          <VariantFacts job={job} variant={variant} now={now} />
        </View>

        {variant === 'on_the_way' && (
          <View className="mt-3 overflow-hidden rounded-xl border border-line">
            <ServiceMap
              aspect={16 / 7}
              to={job.customer}
              progress={driveProgress(job, now)}
              pins={[{ id: job.id, lat: job.customer.lat, lng: job.customer.lng, tone: 'danger' }]}
            />
          </View>
        )}
      </Tappable>

      <Actions job={job} variant={variant} />
    </View>
  )
}

/** One cell of the two-column facts box. */
function Fact({ icon, label, value, tone }: { icon: LucideIcon; label: string; value: React.ReactNode; tone?: string }) {
  return (
    <View className="w-1/2 min-w-0 pr-4">
      <View className="flex-row items-center gap-1">
        <Icon as={icon} className="size-3 text-faint" />
        <Text className="text-[10.5px] font-bold uppercase tracking-wider text-faint">{label}</Text>
      </View>
      <Text numberOfLines={1} className={cn('num mt-0.5 text-[13px] font-bold text-ink', tone)}>
        {value}
      </Text>
    </View>
  )
}

function VariantFacts({ job, variant, now }: { job: Job; variant: CardVariant; now: number }) {
  switch (variant) {
    case 'emergency': {
      const fresh = now - new Date(job.requestedAt).getTime() < 5 * 60_000
      return (
        <>
          <Fact icon={Clock} label="Requested" value={fresh ? 'Now' : ago(job.requestedAt)} tone="text-danger" />
          <Fact icon={Navigation} label="ETA" value={`${job.etaMin} min drive`} />
          <Fact icon={IndianRupee} label="Est. service" value={inr(job.estFee)} />
        </>
      )
    }
    case 'request':
      return (
        <>
          <Fact icon={Clock} label="Appointment" value={when(job.scheduledAt)} />
          <Fact icon={Navigation} label="ETA" value={`${job.etaMin} min drive`} />
          <Fact icon={IndianRupee} label="Est. service" value={inr(job.estFee)} />
        </>
      )
    case 'accepted':
      return (
        <>
          <Fact icon={Clock} label="Appointment" value={when(job.scheduledAt)} />
          <Fact icon={Navigation} label="ETA" value={`${job.etaMin} min drive`} />
          <Fact icon={IndianRupee} label="Service amount" value={inr(job.estFee)} />
        </>
      )
    case 'on_the_way': {
      const left = Math.max(1, Math.round(job.etaMin * (1 - driveProgress(job, now))))
      return (
        <>
          <Fact icon={Navigation} label="ETA" value={`${left} minutes`} tone="text-info" />
          <Fact icon={Clock} label="Appointment" value={time(job.scheduledAt)} />
        </>
      )
    }
    case 'in_progress':
      return (
        <>
          <Fact icon={Stethoscope} label="Diagnosis" value={job.diagnosis?.problem ?? 'Not recorded yet'} tone={job.diagnosis ? undefined : 'text-warning'} />
          <Fact icon={Package} label="Parts" value={job.parts.length ? 'Required' : 'Not required'} />
          <Fact icon={IndianRupee} label="Service amount" value={inr(job.diagnosis?.estimate ?? billTotal(job))} />
        </>
      )
    case 'completed':
      return (
        <>
          <Fact icon={Clock} label="Completed" value={when(job.log.closed ?? job.scheduledAt)} />
          <Fact
            icon={IndianRupee}
            label="Payment"
            value={
              <>
                {inr(earned(job))} <Text className="num text-[13px] font-bold text-success">• PAID</Text>
              </>
            }
          />
          {job.confirmation?.rating ? (
            <View accessible accessibilityLabel={`Rated ${job.confirmation.rating} out of 5`} className="w-full flex-row items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((n) =>
                n <= job.confirmation!.rating ? (
                  <Icon key={n} as={Star} className="size-4 text-warning" fill="#c9730f" />
                ) : (
                  <Icon key={n} as={Star} className="size-4 text-line-strong" />
                )
              )}
            </View>
          ) : null}
        </>
      )
    default:
      return <Fact icon={Clock} label="Was due" value={when(job.scheduledAt)} />
  }
}

const primary = 'h-12 min-w-0 flex-[1.4] flex-row items-center justify-center gap-2 rounded-xl px-3 active:opacity-90'
const primaryText = 'text-[14.5px] font-extrabold text-white'
const secondary =
  'h-12 min-w-0 flex-1 flex-row items-center justify-center gap-2 rounded-xl border-2 border-line-strong bg-card px-3 active:border-ink-2 active:opacity-100'
const secondaryText = 'text-[14px] font-extrabold text-ink-2'

/** One key in the action row: a link (`href`) or a button (`onPress`). */
function Key({
  kind,
  className,
  href,
  onPress,
  children,
}: {
  kind: 'primary' | 'secondary'
  className?: string
  href?: Href
  onPress?: () => void
  children: React.ReactNode
}) {
  return (
    <Tappable href={href} onPress={onPress} className={cn(kind === 'primary' ? primary : secondary, className)}>
      <Inherit className={kind === 'primary' ? primaryText : secondaryText}>
        <Labelled>{children}</Labelled>
      </Inherit>
    </Tappable>
  )
}

function Actions({ job, variant }: { job: Job; variant: CardVariant }) {
  const { accept, advance } = useStore()
  if (variant === 'cancelled') return null

  const directions = directionsHref(job.customer.lat, job.customer.lng)
  const openDirections = () => Linking.openURL(directions)
  const call = () => Linking.openURL(telHref(job.customer.phone))
  let row: React.ReactNode

  switch (variant) {
    case 'emergency':
      row = (
        <>
          <Key kind="secondary" onPress={openDirections}>
            <Icon as={Navigation} className="size-4" />
            Navigate
          </Key>
          <Key
            kind="primary"
            className="bg-danger"
            onPress={() => {
              accept(job.id)
              router.push(stepHref('detail', job.id))
            }}
          >
            Accept emergency
          </Key>
        </>
      )
      break
    case 'request':
      row = (
        <>
          <Key kind="secondary" href={jobHref(job)}>
            View details
          </Key>
          <Key kind="primary" className="bg-success" onPress={() => accept(job.id)}>
            Accept job
          </Key>
        </>
      )
      break
    case 'accepted':
      row =
        job.status === 'assigned' ? (
          <>
            <Key kind="secondary" href={stepHref('detail', job.id)}>
              View job
            </Key>
            <Key kind="primary" className="bg-success" onPress={() => accept(job.id)}>
              Accept job
            </Key>
          </>
        ) : (
          <>
            <CallButton job={job} />
            <Key kind="secondary" href={stepHref('detail', job.id)}>
              View job
            </Key>
            {/* Setting off is the moment the job goes On the way. */}
            <Key
              kind="primary"
              className="bg-brand active:bg-brand-deep active:opacity-100"
              onPress={() => {
                advance(job.id, 'on_the_way')
                openDirections()
              }}
            >
              <Icon as={Navigation} className="size-4" />
              Navigate
            </Key>
          </>
        )
      break
    case 'on_the_way':
      row = (
        <>
          <Key kind="secondary" onPress={call}>
            <Icon as={Phone} className="size-4" />
            Call
          </Key>
          <Key kind="primary" className="bg-brand active:bg-brand-deep active:opacity-100" onPress={openDirections}>
            <Icon as={Navigation} className="size-4" />
            Open navigation
          </Key>
        </>
      )
      break
    case 'in_progress':
      row = (
        <>
          <CallButton job={job} />
          <Key kind="secondary" href={stepHref('diagnosis', job.id)}>
            Update diagnosis
          </Key>
          <Key kind="primary" className="bg-brand active:bg-brand-deep active:opacity-100" href={stepHref('detail', job.id)}>
            Continue service
          </Key>
        </>
      )
      break
    case 'completed':
      row = (
        <>
          <Key kind="secondary" href={stepHref('detail', job.id)}>
            View details
          </Key>
          <Key kind="primary" className="bg-ink active:bg-ink-2 active:opacity-100" href={stepHref('bill', job.id)}>
            View invoice
          </Key>
        </>
      )
      break
  }
  return <View className="flex-row gap-2.5 border-t border-line px-4 py-3">{row}</View>
}

/** A square call key beside the text actions; only once the number is unlocked. */
function CallButton({ job }: { job: Job }) {
  return (
    <Tappable
      accessibilityLabel={`Call ${job.customer.name}`}
      onPress={() => Linking.openURL(telHref(job.customer.phone))}
      className="size-12 shrink-0 items-center justify-center rounded-xl border-2 border-success/30 bg-success-soft active:border-success active:opacity-100"
    >
      <Icon as={Phone} className="size-5 text-success" />
    </Tappable>
  )
}
