import { cn } from '@/lib/cn'
import { Tappable, type TappableProps } from '../base/Tappable'
import { Inherit, Text } from '../base/Text'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'dark'

const variants: Record<Variant, { box: string; text: string; disabled: string }> = {
  primary: { box: 'bg-brand active:bg-brand-ink', text: 'text-white', disabled: 'bg-line-strong' },
  secondary: { box: 'bg-card border border-line-strong active:bg-canvas', text: 'text-ink', disabled: '' },
  ghost: { box: 'active:bg-brand-soft', text: 'text-brand', disabled: '' },
  danger: { box: 'bg-danger active:opacity-90', text: 'text-white', disabled: '' },
  success: { box: 'bg-success active:opacity-90', text: 'text-white', disabled: 'bg-line-strong' },
  dark: { box: 'bg-ink active:bg-ink-2', text: 'text-white', disabled: '' },
}

/**
 * `slop` tops the touch target up to 48px (the field-use minimum) without
 * changing how big the button looks: 36 + 2×6 for sm, 44 + 2×2 for md.
 */
const sizes = {
  sm: { box: 'h-9 px-3 gap-1.5 rounded-lg', text: 'text-sm', slop: 6 },
  md: { box: 'h-11 px-4 gap-2 rounded-xl', text: 'text-sm', slop: 2 },
  lg: { box: 'h-14 px-5 gap-2.5 rounded-xl', text: 'text-base', slop: 0 },
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
      hitSlop={s.slop}
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
