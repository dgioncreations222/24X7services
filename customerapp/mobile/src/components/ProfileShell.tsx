import { View } from 'react-native'
import { usePathname, type Href } from 'expo-router'
import type { LucideIcon } from 'lucide-react-native'

import { Header, Screen } from '@/components/Screen'
import { Skeleton, SkeletonGroup } from '@/components/ui/States'
import { Icon } from '@/components/ui/Icon'
import { Tappable } from '@/components/ui/Tappable'
import { Text } from '@/components/ui/Text'
import { useAuth } from '@/lib/auth'
import type { AuthSnapshot } from '@/lib/authStore'
import { cn } from '@/lib/cn'

/** Whoever is signed in, as the shell hands them to its children. */
type SignedInUser = NonNullable<AuthSnapshot['user']>

/**
 * The frame every screen under the profile shares: a title, a way back, and
 * what to show when nobody is signed in.
 *
 * Each screen says its own sentence to someone who has not signed in, through
 * `signedOut`. Screens with something public to show — the plans on offer,
 * what a membership costs, how a gift card works — show it and put the sign-in
 * underneath. Screens that are nothing but this customer's own records say so
 * plainly and offer the one button that fills them in.
 *
 * `next` is built from the current route rather than passed in, so signing in
 * from deep inside the profile comes back to the screen you were reading and
 * not to its parent.
 */
export function ProfileShell({
  title,
  subtitle,
  backFallback = '/profile',
  right,
  footer,
  onRefresh,
  refreshing,
  signedOut,
  children,
}: {
  title: string
  subtitle?: string
  backFallback?: Href
  right?: React.ReactNode
  /** A bar pinned under the scroll, shown once someone is signed in. */
  footer?: (user: SignedInUser) => React.ReactNode
  onRefresh?: () => void
  refreshing?: boolean
  /**
   * This screen, told to someone who is not signed in. Usually a
   * `<SignInPrompt>`, on its own or under whatever the screen can show anyway.
   */
  signedOut: React.ReactNode
  children: (user: SignedInUser) => React.ReactNode
}) {
  const { user, ready } = useAuth()

  return (
    <Screen
      header={
        <Header
          title={title}
          {...(subtitle ? { subtitle } : {})}
          showBack
          backFallback={backFallback}
          right={right}
        />
      }
      footer={ready && user && footer ? footer(user) : undefined}
      {...(onRefresh && user ? { onRefresh } : {})}
      {...(refreshing === undefined ? {} : { refreshing })}
    >
      {!ready ? (
        <SkeletonGroup label="Loading" className="mt-6 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </SkeletonGroup>
      ) : user ? (
        children(user)
      ) : (
        signedOut
      )}
    </Screen>
  )
}

/**
 * Where the sign-in button on one of these screens goes. It carries no query
 * string; the one screen that needs one passes its own `next`.
 */
export function useSignInHref(next?: string): Href {
  const pathname = usePathname()
  const here = next ?? pathname ?? '/profile'
  return `/login?next=${encodeURIComponent(here)}` as Href
}

/** One row of what a screen will hold once someone signs in. */
export interface SignInPreviewItem {
  icon: LucideIcon
  title: string
  detail: string
}

/**
 * The block a signed-out visitor sees on a profile screen.
 *
 * Shaped like an empty state rather than like a wall, because that is what it
 * is: the screen is right, the records are simply not there yet. `preview`
 * shows what the screen will be once they are in — a few sample rows rather
 * than a paragraph about them — so signing in reads as getting something, not
 * as a hoop.
 */
export function SignInPrompt({
  icon,
  title,
  description,
  preview,
  previewTitle = 'What you will find here',
  next,
  className,
}: {
  icon: LucideIcon
  title: string
  description: string
  preview?: readonly SignInPreviewItem[]
  previewTitle?: string
  /** Where to come back to, when the path alone is not enough. */
  next?: string
  className?: string
}) {
  const href = useSignInHref(next)

  return (
    <View className={cn('gap-5 pb-10 pt-6', className)}>
      <View className="items-center rounded-card bg-brand-soft px-6 py-8">
        {/* The web's ring-8 ring-bg/60: a translucent halo round the disc. */}
        <View className="rounded-full bg-bg/60 p-2">
          <View className="size-16 items-center justify-center rounded-full bg-bg shadow-raised">
            <Icon as={icon} className="size-7 text-brand" />
          </View>
        </View>
        <Text accessibilityRole="header" className="mt-3 text-center text-xl font-bold text-ink">
          {title}
        </Text>
        <Text className="mt-2 max-w-xs text-center text-sm leading-[22px] text-muted">{description}</Text>
      </View>

      {preview?.length ? (
        <View accessibilityLabel={previewTitle}>
          <Text className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted">
            {previewTitle}
          </Text>
          <View className="overflow-hidden rounded-card border border-border">
            {preview.map((item, index) => (
              <View
                key={item.title}
                className={cn(
                  'flex-row items-start gap-3 px-4 py-3.5',
                  index < preview.length - 1 && 'border-b border-border'
                )}
              >
                <View className="size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft">
                  <Icon as={item.icon} className="size-4 text-brand" />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-sm font-semibold text-ink">{item.title}</Text>
                  <Text className="mt-0.5 text-sm text-muted">{item.detail}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View className="items-center gap-3">
        <Tappable
          href={href}
          className="min-h-12 w-full items-center justify-center rounded-pill bg-brand px-5 active:bg-brand-deep active:opacity-100"
        >
          <Text className="text-base font-semibold text-white">Log in with your mobile number</Text>
        </Tappable>
        <Text className="text-center text-xs text-muted">
          We send a one-time code to confirm it. No password needed.
        </Text>
      </View>
    </View>
  )
}
