import { BRAND } from '@/lib/brand'
import { cn } from '@/lib/cn'

/** The wordmark with the Admin Console tag. */
export function Logo({ inverted, large }: { inverted?: boolean; large?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap rounded-lg font-extrabold leading-none tracking-[-0.04em]',
          large ? 'size-12 text-[19px]' : 'size-8 text-[13px]',
          inverted ? 'bg-white text-brand-ink' : 'bg-brand-ink text-white'
        )}
      >
        {BRAND.mark}
      </span>
      <span className="flex flex-col leading-none">
        <span className={cn('font-extrabold tracking-tight', large ? 'text-2xl' : 'text-[15px]', inverted ? 'text-white' : 'text-ink')}>{BRAND.name}</span>
        <span className={cn('mt-1 font-bold uppercase tracking-[0.18em]', large ? 'text-[11px]' : 'text-[9.5px]', inverted ? 'text-white/60' : 'text-brand')}>
          Admin Console
        </span>
      </span>
    </span>
  )
}
