import { createContext, useContext, useEffect } from 'react'
import { Image, Modal, Pressable, ScrollView, View, type ScrollViewProps } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, {
  Easing,
  ReduceMotion,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import type { Href } from 'expo-router'
import { ArrowLeft, Flame, X } from 'lucide-react-native'
import { useBack } from '@/lib/nav'
import { cn } from '@/lib/cn'
import { STATUS, type Tone } from '@/lib/status'
import { COLORS } from '@/lib/theme'
import type { JobStatus, Priority } from '@/lib/types'
import { Icon } from './base/Icon'
import { Tappable, type TappableProps } from './base/Tappable'
import { Inherit, Text } from './base/Text'
import { MenuButton } from './menu'

export { Icon, useColor } from './base/Icon'
export { Tappable } from './base/Tappable'
export { Inherit, Text } from './base/Text'

/**
 * The technician app's kit — the native counterpart of technician/components/
 * ui.tsx, with the same names and props so screens port line for line.
 * Differences from the web: `onClick` is `onPress`, a box's text classes reach
 * the Text and Icons inside it through <Inherit>, and the page frame
 * (ScreenHeader, Page, ActionDock) owns the safe areas.
 */

/* ---------------------------------------------------------------- Buttons */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'dark'

const variants: Record<Variant, { box: string; text: string; disabled: string }> = {
  primary: { box: 'bg-brand active:bg-brand-ink', text: 'text-white', disabled: 'bg-line-strong' },
  secondary: { box: 'bg-card border border-line-strong active:bg-canvas', text: 'text-ink', disabled: '' },
  ghost: { box: 'active:bg-brand-soft', text: 'text-brand', disabled: '' },
  danger: { box: 'bg-danger active:opacity-90', text: 'text-white', disabled: '' },
  success: { box: 'bg-success active:opacity-90', text: 'text-white', disabled: 'bg-line-strong' },
  dark: { box: 'bg-ink active:bg-ink-2', text: 'text-white', disabled: '' },
}

const sizes = {
  sm: { box: 'h-9 px-3 gap-1.5 rounded-lg', text: 'text-sm' },
  md: { box: 'h-11 px-4 gap-2 rounded-xl', text: 'text-sm' },
  lg: { box: 'h-14 px-5 gap-2.5 rounded-xl', text: 'text-base' },
}

export interface ButtonProps extends Omit<TappableProps, 'children'> {
  variant?: Variant
  size?: keyof typeof sizes
  /** Classes for the label (and icons) — the web's text classes on the button. */
  textClassName?: string
  children: React.ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  textClassName,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const v = variants[variant]
  const s = sizes[size]
  return (
    <Tappable
      disabled={disabled}
      accessibilityState={{ disabled: Boolean(disabled) }}
      className={cn(
        'shrink-0 flex-row items-center justify-center active:opacity-100',
        v.box,
        s.box,
        disabled && cn(v.disabled, 'opacity-100'),
        disabled && !v.disabled && 'opacity-50',
        className
      )}
      {...props}
    >
      <Inherit className={cn('font-bold', s.text, v.text, disabled && v.disabled && 'text-muted', textClassName)}>
        <Labelled>{children}</Labelled>
      </Inherit>
    </Tappable>
  )
}

/** Strings inside a box become Text, so `<Button>Accept</Button>` works as on the web. */
export function Labelled({ children }: { children: React.ReactNode }) {
  return (
    <>
      {(Array.isArray(children) ? children : [children]).map((c, i) =>
        typeof c === 'string' || typeof c === 'number' ? <Text key={i}>{c}</Text> : c
      )}
    </>
  )
}

/* ----------------------------------------------------------------- Chips */

const toneClass: Record<Tone, { chip: string; text: string; dot: string; rail: string }> = {
  brand: { chip: 'bg-brand-soft border-brand/15', text: 'text-brand', dot: 'bg-brand', rail: 'bg-brand' },
  warning: { chip: 'bg-warning-soft border-warning/20', text: 'text-warning', dot: 'bg-warning', rail: 'bg-warning' },
  info: { chip: 'bg-info-soft border-info/20', text: 'text-info', dot: 'bg-info', rail: 'bg-info' },
  violet: { chip: 'bg-violet-soft border-violet/20', text: 'text-violet', dot: 'bg-violet', rail: 'bg-violet' },
  success: { chip: 'bg-success-soft border-success/20', text: 'text-success', dot: 'bg-success', rail: 'bg-success' },
  danger: { chip: 'bg-danger-soft border-danger/20', text: 'text-danger', dot: 'bg-danger', rail: 'bg-danger' },
  neutral: { chip: 'bg-canvas border-line', text: 'text-muted', dot: 'bg-faint', rail: 'bg-line-strong' },
}

export function toneRail(tone: Tone) {
  return toneClass[tone].rail
}

/** The tone's text colour, for a word or icon that sits outside a chip. */
export function toneText(tone: Tone) {
  return toneClass[tone].text
}

export function Chip({ tone, children, live, className }: { tone: Tone; children: React.ReactNode; live?: boolean; className?: string }) {
  const t = toneClass[tone]
  return (
    <View className={cn('h-6 flex-row items-center gap-1.5 self-start rounded-pill border px-2', t.chip, className)}>
      {live ? <Blink className={cn('size-1.5 rounded-full', t.dot)} /> : <View className={cn('size-1.5 rounded-full', t.dot)} />}
      <Inherit className={cn('text-[11px] font-bold', t.text)}>
        <Labelled>{children}</Labelled>
      </Inherit>
    </View>
  )
}

export function StatusChip({ status, className }: { status: JobStatus; className?: string }) {
  const s = STATUS[status]
  const live = ['on_the_way', 'diagnosis', 'repair'].includes(status)
  return (
    <Chip tone={s.tone} live={live} className={className}>
      {s.label}
    </Chip>
  )
}

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  if (priority === 'emergency')
    return (
      <View className={cn('h-6 flex-row items-center gap-1 self-start rounded-md bg-danger px-2', className)}>
        <Icon as={Flame} className="size-3.5 text-white" strokeWidth={2.4} />
        <Text className="text-[10.5px] font-extrabold uppercase tracking-wider text-white">Emergency</Text>
      </View>
    )
  if (priority === 'high')
    return (
      <View className={cn('h-6 flex-row items-center self-start rounded-md border border-warning/30 bg-warning-soft px-2', className)}>
        <Text className="text-[10.5px] font-extrabold uppercase tracking-wider text-warning">High priority</Text>
      </View>
    )
  return (
    <View className={cn('h-6 flex-row items-center self-start rounded-md bg-canvas px-2', className)}>
      <Text className="text-[10.5px] font-bold uppercase tracking-wider text-muted">Normal</Text>
    </View>
  )
}

/* ------------------------------------------------------------- Surfaces */

export function Card({ className, children }: { className?: string; children?: React.ReactNode }) {
  return <View className={cn('rounded-card border border-line bg-card shadow-card', className)}>{children}</View>
}

export function SectionTitle({
  children,
  action,
  count,
  className,
}: {
  children: React.ReactNode
  action?: React.ReactNode
  count?: number
  className?: string
}) {
  return (
    <View className={cn('mb-3 flex-row items-end justify-between gap-3', className)}>
      <View className="min-w-0 flex-1 flex-row items-center gap-2">
        <Inherit className="text-[15px] font-extrabold tracking-tight text-ink">
          <View accessibilityRole="header" className="shrink flex-row items-center gap-2">
            <Labelled>{children}</Labelled>
          </View>
        </Inherit>
        {count !== undefined && (
          <View className="rounded-md bg-ink/[0.06] px-1.5 py-0.5">
            <Text className="num text-xs font-bold text-muted">{count}</Text>
          </View>
        )}
      </View>
      {action}
    </View>
  )
}

export function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <Text className={cn('text-[11px] font-bold uppercase tracking-[0.08em] text-faint', className)}>{children}</Text>
}

/* ---------------------------------------------------------------- Inputs */

export function Toggle({
  checked,
  onChange,
  label,
  tone = 'brand',
  size = 'md',
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  tone?: 'brand' | 'success'
  size?: 'md' | 'lg'
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={() => onChange(!checked)}
      hitSlop={8}
      className={cn(
        'shrink-0 justify-center rounded-full',
        size === 'lg' ? 'h-8 w-14' : 'h-6 w-11',
        checked ? (tone === 'success' ? 'bg-success' : 'bg-brand') : 'bg-line-strong'
      )}
    >
      <View
        className={cn(
          'absolute rounded-full bg-white shadow-card',
          size === 'lg' ? 'left-1 size-6' : 'left-0.5 size-5',
          checked && (size === 'lg' ? 'translate-x-6' : 'translate-x-5')
        )}
      />
    </Pressable>
  )
}

/** The web's input look, for a TextInput (focus ring dropped: phones show the caret). */
export const inputClass = 'w-full rounded-xl border border-line-strong bg-card px-3.5 py-3 text-base text-ink font-normal'

export function Field({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <View>
      <Text className="mb-1.5 text-sm font-bold text-ink-2">{label}</Text>
      {children}
      {hint ? typeof hint === 'string' ? <Text className="mt-1.5 text-xs text-muted">{hint}</Text> : <View className="mt-1.5">{hint}</View> : null}
    </View>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  size = 'md',
}: {
  value: T
  onChange: (v: T) => void
  options: readonly { value: T; label: React.ReactNode }[]
  className?: string
  size?: 'sm' | 'md'
}) {
  return (
    <View accessibilityRole="tablist" className={cn('flex-row rounded-xl bg-ink/[0.06] p-1', className)}>
      {options.map((o) => {
        const on = value === o.value
        return (
          <Tappable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            className={cn(
              'flex-1 flex-row items-center justify-center gap-1.5 rounded-lg px-2',
              size === 'sm' ? 'h-8' : 'h-10',
              on && 'bg-card shadow-card'
            )}
          >
            <Inherit className={cn('font-bold', size === 'sm' ? 'text-xs' : 'text-sm', on ? 'text-ink' : 'text-muted')}>
              <Labelled>{o.label}</Labelled>
            </Inherit>
          </Tappable>
        )
      })}
    </View>
  )
}

export function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Tappable
      accessibilityState={{ selected: active }}
      onPress={onClick}
      className={cn(
        'h-9 shrink-0 flex-row items-center gap-1.5 rounded-pill border px-3.5',
        active ? 'border-ink bg-ink' : 'border-line-strong bg-card'
      )}
    >
      <Inherit className={cn('text-[13px] font-bold', active ? 'text-white' : 'text-ink-2')}>
        <Labelled>{children}</Labelled>
      </Inherit>
    </Tappable>
  )
}

/* ---------------------------------------------------------------- Chrome */

/**
 * True inside the five tab screens, whose bottom inset the tab bar already
 * takes. Pushed screens cover the tab bar, so they pad for the home indicator.
 */
export const InTabs = createContext(false)

/** The header every inner screen wears. */
export function ScreenHeader({
  title,
  subtitle,
  back,
  right,
}: {
  title: React.ReactNode
  subtitle?: React.ReactNode
  back?: Href | true
  right?: React.ReactNode
}) {
  // `back` is only where to go when there is no previous screen.
  const goBack = useBack(back === true || !back ? '/home' : back)
  const insets = useSafeAreaInsets()
  return (
    <View className="z-30 border-b border-line bg-card" style={{ paddingTop: insets.top }}>
      <View className="h-14 flex-row items-center gap-2 px-2">
        {back && (
          <Tappable accessibilityLabel="Back" onPress={goBack} className="size-11 items-center justify-center rounded-full active:bg-canvas">
            <Icon as={ArrowLeft} className="size-5 text-ink" />
          </Tappable>
        )}
        <View className={cn('min-w-0 flex-1', !back && 'pl-2')}>
          {typeof title === 'string' ? (
            <Text accessibilityRole="header" numberOfLines={1} className="text-[17px] font-extrabold tracking-tight">
              {title}
            </Text>
          ) : (
            title
          )}
          {subtitle ? (
            typeof subtitle === 'string' ? (
              <Text numberOfLines={1} className="text-xs font-medium text-muted">
                {subtitle}
              </Text>
            ) : (
              subtitle
            )
          ) : null}
        </View>
        <View className="flex-row items-center gap-1 pr-1">
          {right}
          <MenuButton />
        </View>
      </View>
    </View>
  )
}

/**
 * The scrolling page body. Put the ScreenHeader above it and an ActionDock
 * below it, as siblings inside the screen — the dock sits under the scroll
 * rather than over it, so the page needs no bottom spacer.
 */
export function Page({
  children,
  className,
  scrollRef,
  ...props
}: Omit<ScrollViewProps, 'children'> & {
  children: React.ReactNode
  className?: string
  scrollRef?: React.Ref<ScrollView>
}) {
  const tabs = useContext(InTabs)
  const insets = useSafeAreaInsets()
  return (
    <ScrollView
      ref={scrollRef}
      className="flex-1 bg-canvas"
      contentContainerClassName={cn('px-4 pt-4', className)}
      contentContainerStyle={{ paddingBottom: 32 + (tabs ? 0 : insets.bottom) }}
      keyboardShouldPersistTaps="handled"
      {...props}
    >
      {children}
    </ScrollView>
  )
}

/** Buttons pinned to the foot of the screen, under the page. */
export function ActionDock({ children }: { children: React.ReactNode; withNav?: boolean }) {
  const tabs = useContext(InTabs)
  const insets = useSafeAreaInsets()
  return (
    <View className="border-t border-line bg-card px-4 pt-3" style={{ paddingBottom: 12 + (tabs ? 0 : insets.bottom) }}>
      <View className="flex-row gap-2.5">{children}</View>
    </View>
  )
}

/** A bottom sheet. A system modal, so Android's back button closes it. */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: React.ReactNode
  children: React.ReactNode
}) {
  const insets = useSafeAreaInsets()
  return (
    <Modal visible={open} transparent animationType="slide" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Pressable accessibilityLabel="Close" className="absolute inset-0 bg-ink/50" onPress={onClose} />
        <View accessibilityViewIsModal className="max-h-[88%] rounded-t-2xl bg-card" style={{ paddingBottom: insets.bottom }}>
          <View className="flex-row items-center justify-between border-b border-line px-4 py-3">
            {typeof title === 'string' ? (
              <Text accessibilityRole="header" className="flex-1 text-base font-extrabold">
                {title}
              </Text>
            ) : (
              <View className="flex-1">{title}</View>
            )}
            <Tappable onPress={onClose} accessibilityLabel="Close" className="size-10 items-center justify-center rounded-full active:bg-canvas">
              <Icon as={X} className="size-5" />
            </Tappable>
          </View>
          <ScrollView contentContainerClassName="p-4" keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

export function Empty({ icon, title, body }: { icon: React.ReactNode; title: string; body?: string }) {
  return (
    <View className="items-center rounded-card border border-dashed border-line-strong bg-card px-6 py-10">
      <View className="mb-3 size-12 items-center justify-center rounded-full bg-canvas">
        <Inherit className="text-muted">{icon}</Inherit>
      </View>
      <Text className="text-center font-bold">{title}</Text>
      {body ? <Text className="mt-1 max-w-xs text-center text-sm text-muted">{body}</Text> : null}
    </View>
  )
}

export function Avatar({ name, photo, size = 44, className }: { name: string; photo?: string; size?: number; className?: string }) {
  const letters = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
  return photo ? (
    <Image
      source={{ uri: photo }}
      accessibilityIgnoresInvertColors
      className={cn('shrink-0 rounded-full', className)}
      style={{ width: size, height: size }}
    />
  ) : (
    <LinearGradient
      colors={[COLORS.brandBright, COLORS.brandNight]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className={cn('shrink-0 items-center justify-center rounded-full', className)}
      style={{ width: size, height: size, borderRadius: size / 2 }}
    >
      <Text importantForAccessibility="no" className="font-extrabold text-white" style={{ fontSize: size * 0.36, lineHeight: size * 0.44 }}>
        {letters}
      </Text>
    </LinearGradient>
  )
}

/* ------------------------------------------------------------- Motion */

/** The web's `animate-blink`: a live dot that fades to 35% and back. */
export function Blink({ className }: { className?: string }) {
  const o = useSharedValue(1)
  useEffect(() => {
    o.value = withRepeat(withTiming(0.35, { duration: 600, easing: Easing.inOut(Easing.ease), reduceMotion: ReduceMotion.System }), -1, true)
    return () => cancelAnimation(o)
  }, [o])
  const style = useAnimatedStyle(() => ({ opacity: o.value }))
  return <Animated.View className={className} style={style} />
}
