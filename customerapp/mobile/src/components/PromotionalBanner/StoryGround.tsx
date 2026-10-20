import { View } from 'react-native'
import type { Banner } from '@app/shared'
import { cn } from '@/lib/cn'
import { ToneGround } from '@/components/PromotionalBanner/tones'

/** The ground under a story banner: none edge to edge (Home paints it), the tone otherwise. */
export function StoryGround({
  banner,
  edgeToEdge,
  className,
  children,
}: {
  banner: Banner
  edgeToEdge: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <View
      className={cn(
        'relative h-full min-h-52 overflow-hidden',
        edgeToEdge ? 'min-h-48 rounded-none' : 'rounded-card',
        className
      )}
    >
      {edgeToEdge ? null : <ToneGround tone={banner.tone} />}
      {children}
    </View>
  )
}
