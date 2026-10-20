'use client'

import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'subtle'

const variants: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-deep active:bg-brand-ink disabled:bg-line-strong disabled:text-muted',
  secondary: 'bg-card text-ink border border-line-strong hover:border-ink-2 hover:bg-canvas/60 disabled:text-faint',
  ghost: 'text-brand hover:bg-brand-soft',
  subtle: 'text-ink-2 hover:bg-canvas',
  danger: 'bg-danger text-white hover:brightness-95 active:brightness-90 disabled:opacity-50',
  success: 'bg-success text-white hover:brightness-95 active:brightness-90 disabled:bg-line-strong disabled:text-muted',
}

const sizes = {
  xs: 'h-7 px-2.5 text-xs gap-1 rounded-md',
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-lg',
}

export function buttonClass(variant: Variant = 'primary', size: keyof typeof sizes = 'md', className?: string) {
  return cn(
    'inline-flex shrink-0 items-center justify-center whitespace-nowrap font-bold transition-[background-color,border-color,filter] duration-150 select-none disabled:cursor-not-allowed [&_svg]:size-4',
    variants[variant],
    sizes[size],
    className
  )
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: keyof typeof sizes }) {
  return <button type="button" className={buttonClass(variant, size, className)} {...props} />
}
