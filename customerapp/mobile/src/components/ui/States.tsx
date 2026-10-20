import { useEffect } from 'react'
import { View } from 'react-native'
import type { Href } from 'expo-router'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  ReduceMotion,
} from 'react-native-reanimated'
import { CloudOff, RefreshCw, TriangleAlert, WifiOff, type LucideIcon } from 'lucide-react-native'
import type { BookingStatus } from '@app/shared'
import { cn } from '@/lib/cn'
import { STATUS_PRESENTATION, type Tone } from '@/lib/status'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Text } from '@/components/ui/Text'

/* ---------------------------------------------------------------------------
   Empty, error, loading and status — the states every screen shares.
   --------------------------------------------------------------------------- */

export type EmptyAction = { label: string; href: Href } | { label: string; onClick: () => void }

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon
  title: string
  description: string
  action?: EmptyAction
  className?: string
}) {
  return (
    <View className={cn('items-center justify-center gap-3 px-6 py-14', className)}>
      <View className="size-14 items-center justify-center rounded-full bg-surface">
        <Icon as={icon} className="size-6 text-muted" />
      </View>
      <Text accessibilityRole="header" className="text-center text-lg font-semibold text-ink">
        {title}
      </Text>
      <Text className="max-w-xs text-center text-sm text-muted">{description}</Text>
      {action ? (
        <Button
          className="mt-2"
          size="sm"
          {...('href' in action ? { href: action.href } : { onPress: action.onClick })}
        >
          {action.label}
        </Button>
      ) : null}
    </View>
  )
}

type Kind = 'generic' | 'offline' | 'notFound'

const presets: Record<Kind, { icon: LucideIcon; title: string; description: string }> = {
  generic: {
    icon: TriangleAlert,
    title: 'Something went wrong',
    description: 'We could not load this just now. Please try again.',
  },
  offline: {
    icon: WifiOff,
    title: 'You are offline',
    description: 'Check your connection. Anything you had filled in is still here.',
  },
  notFound: {
    icon: CloudOff,
    title: 'We could not find that',
    description: 'It may have been removed, or the link may be out of date.',
  },
}

export function ErrorState({
  kind = 'generic',
  title,
  description,
  onRetry,
  retrying = false,
  className,
}: {
  kind?: Kind
  title?: string
  description?: string
  onRetry?: () => void
  retrying?: boolean
  className?: string
}) {
  const preset = presets[kind]
  return (
    <View accessibilityRole="alert" className={cn('items-center justify-center gap-3 px-6 py-14', className)}>
      <View className="size-14 items-center justify-center rounded-full bg-error-soft">
        <Icon as={preset.icon} className="size-6 text-error" />
      </View>
      <Text className="text-center text-lg font-semibold text-ink">{title ?? preset.title}</Text>
      <Text className="max-w-xs text-center text-sm text-muted">{description ?? preset.description}</Text>
      {onRetry ? (
        <Button
          className="mt-2"
          size="sm"
          variant="secondary"
          onPress={onRetry}
          loading={retrying}
          iconLeft={<Icon as={RefreshCw} className="size-4 text-brand" />}
        >
          Try again
        </Button>
      ) : null}
    </View>
  )
}

export function OfflineBanner({ className }: { className?: string }) {
  return (
    <View
      accessibilityLiveRegion="polite"
      className={cn('flex-row items-center justify-center gap-2 bg-brand px-4 py-2', className)}
    >
      <Icon as={WifiOff} className="size-3.5 text-white" />
      <Text className="text-xs font-medium text-white">You are offline. Some things may be out of date.</Text>
    </View>
  )
}

/** A block shaped like the content it stands in for, pulsing gently. */
export function Skeleton({ className }: { className?: string }) {
  const opacity = useSharedValue(1)
  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.45, { duration: 700 }), -1, true, undefined, ReduceMotion.System)
  }, [opacity])
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }))
  return <Animated.View aria-hidden style={style} className={cn('rounded-card bg-surface', className)} />
}

export function SkeletonGroup({
  label = 'Loading',
  className,
  children,
}: {
  label?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <View accessible accessibilityLabel={label} accessibilityState={{ busy: true }} className={className}>
      {children}
    </View>
  )
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <View className={cn('gap-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn('h-4 rounded-md', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </View>
  )
}

const tones: Record<Tone, { dot: string; text: string; surface: string }> = {
  neutral: { dot: 'bg-ink', text: 'text-ink', surface: 'bg-surface border-border' },
  success: { dot: 'bg-success', text: 'text-success', surface: 'bg-success-soft border-success/20' },
  warning: { dot: 'bg-warning', text: 'text-warning', surface: 'bg-warning-soft border-warning/20' },
  error: { dot: 'bg-error', text: 'text-error', surface: 'bg-error-soft border-error/20' },
}

export function StatusBadge({ status, className }: { status: BookingStatus; className?: string }) {
  const { label, tone } = STATUS_PRESENTATION[status]
  return <ToneBadge tone={tone} label={label} className={className} />
}

export function ToneBadge({ tone, label, className }: { tone: Tone; label: string; className?: string }) {
  const t = tones[tone]
  return (
    <View
      className={cn('flex-row items-center gap-1.5 self-start rounded-pill border px-2.5 py-1', t.surface, className)}
    >
      <View className={cn('size-1.5 rounded-full', t.dot)} />
      <Text numberOfLines={1} className={cn('text-xs font-semibold', t.text)}>
        {label}
      </Text>
    </View>
  )
}
