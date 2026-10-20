import { View } from 'react-native'
import { Skeleton, SkeletonGroup, SkeletonText } from '@/components/ui/States'

/**
 * Skeletons stand in for content that is on its way, and they are shaped like
 * the thing they replace — a service card skeleton is card-shaped and
 * card-sized — so the page does not reflow when the data lands.
 *
 * Every skeleton block is hidden from the screen reader and its container
 * carries the label, so it hears "Loading" once instead of a dozen empty boxes.
 */

export { Skeleton, SkeletonGroup, SkeletonText }

export function ApplianceGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <SkeletonGroup label="Loading services" className="flex-row flex-wrap justify-between gap-y-3">
      {Array.from({ length: count }).map((_, i) => (
        // Built out of the tile's own parts rather than one grey box: the tile
        // is a 4:3 illustration over a two-line caption, and a block of the
        // wrong height means the grid jumps when the catalog lands.
        <View key={i} className="w-[48%] overflow-hidden rounded-card border border-border">
          <Skeleton className="aspect-[4/3] w-full rounded-none" />
          <View className="p-3">
            <Skeleton className="h-4 w-3/4 rounded-md" />
            <Skeleton className="mt-1.5 h-3 w-1/2 rounded-md" />
          </View>
        </View>
      ))}
    </SkeletonGroup>
  )
}

export function ServiceListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <SkeletonGroup label="Loading services" className="gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-28" />
      ))}
    </SkeletonGroup>
  )
}

export function BookingListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <SkeletonGroup label="Loading bookings" className="gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-40" />
      ))}
    </SkeletonGroup>
  )
}

export function TrackingSkeleton() {
  return (
    <SkeletonGroup label="Loading tracking" className="gap-4">
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-40 w-full" />
    </SkeletonGroup>
  )
}

export function TicketListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <SkeletonGroup label="Loading tickets" className="gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-24" />
      ))}
    </SkeletonGroup>
  )
}

export function ProfileSkeleton() {
  return (
    <SkeletonGroup label="Loading profile" className="gap-4">
      <View className="flex-row items-center gap-4">
        <Skeleton className="size-16 rounded-full" />
        <View className="flex-1">
          <SkeletonText lines={2} />
        </View>
      </View>
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </SkeletonGroup>
  )
}

/**
 * The contents of Home's first card while the catalog is on its way — the
 * heading and the tiles under it, at the grid's own column count, so the card
 * is the height it will be and the page does not shift when the answer lands.
 */
export function CategoryGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <SkeletonGroup label="Loading services">
      <Skeleton className="mb-3 h-6 w-40 rounded-md" />
      <View className="flex-row flex-wrap justify-between gap-y-5">
        {Array.from({ length: count }).map((_, i) => (
          <View key={i} className="w-[31%]">
            <Skeleton className="aspect-square w-full" />
            <Skeleton className="mt-2 h-3 w-4/5 self-center rounded-md" />
          </View>
        ))}
      </View>
    </SkeletonGroup>
  )
}

/**
 * Everything on Home below the first card: the service rails. The hero and the
 * grid are not in here — Home paints the hero itself on every path, and the
 * grid stands in for itself inside the card with CategoryGridSkeleton.
 */
export function HomeSkeleton() {
  return (
    <SkeletonGroup label="Loading home" className="gap-8 pt-8">
      {Array.from({ length: 2 }).map((_, row) => (
        <View key={row}>
          <Skeleton className="mb-3 h-6 w-48 rounded-md" />
          <View className="flex-row gap-3 overflow-hidden">
            {Array.from({ length: 3 }).map((_, i) => (
              <View key={i} className="w-40 shrink-0">
                <Skeleton className="aspect-square w-full" />
                <Skeleton className="mt-2.5 h-4 w-full rounded-md" />
                <Skeleton className="mt-2 h-9 w-full rounded-md" />
              </View>
            ))}
          </View>
        </View>
      ))}
    </SkeletonGroup>
  )
}
