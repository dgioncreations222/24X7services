import { createContext, useContext } from 'react'
import { Menu } from 'lucide-react-native'
import { cn } from '@/lib/cn'
import { Icon } from './base/Icon'
import { Tappable } from './base/Tappable'

/**
 * The full app menu — the web's desktop sidebar — as a drawer. Any screen
 * header drops in a MenuButton; the root layout owns the drawer itself.
 */
export const MenuContext = createContext<(open: boolean) => void>(() => {})

export function MenuButton({ className, inverted }: { className?: string; inverted?: boolean }) {
  const setOpen = useContext(MenuContext)
  return (
    <Tappable
      accessibilityLabel="Open menu"
      onPress={() => setOpen(true)}
      hitSlop={4}
      className={cn(
        'size-10 shrink-0 items-center justify-center rounded-full',
        inverted ? 'bg-white/10 active:bg-white/15' : 'active:bg-canvas',
        className
      )}
    >
      <Icon as={Menu} className={cn('size-5', inverted ? 'text-white' : 'text-ink')} />
    </Tappable>
  )
}
