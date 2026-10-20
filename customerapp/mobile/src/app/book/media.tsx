import { useCallback, useState } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { Camera } from 'lucide-react-native'
import type { MediaItem, MediaLimits } from '@app/shared'

import { BookingStep } from '@/components/BookingStep'
import { MediaUploader, type MediaDraftItem } from '@/components/MediaUploader'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { Text } from '@/components/ui/Text'
import { ErrorState } from '@/components/ui/States'
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { fetchBusinessConfig } from '@/lib/catalog'
import { useAuth } from '@/lib/auth'
import type { PickedMedia } from '@/lib/media'
import { uploadDraftMedia } from '@/lib/uploads'
import { patchDraft, useBookingDraft } from '@/lib/bookingDraft'
import { useAsync } from '@/lib/useAsync'

/**
 * A photo of the fault, if there is one to show.
 *
 * Optional, and said so plainly. A leak or an error code on a display saves an
 * argument later about what the appliance was doing before anyone touched it,
 * but insisting on one from someone whose fridge is simply not cold would be
 * asking for a picture of nothing.
 *
 * This is the first step that requires an account, because it is the first
 * thing the app stores on the customer's behalf. Files go to their own draft
 * prefix and the booking refers to them once it exists.
 *
 * The limits come from the business config rather than from constants here, so
 * a change to what a phone may upload does not need a release.
 */
export default function MediaScreen() {
  const { draft } = useBookingDraft()
  const { user } = useAuth()
  const uid = user?.uid

  const [items, setItems] = useState<MediaDraftItem[]>([])

  const load = useCallback(() => fetchBusinessConfig(), [])
  const config = useAsync(load)
  const limits: MediaLimits | undefined = config.data?.mediaLimits

  const upload = useCallback(
    (file: PickedMedia, onProgress: (percent: number) => void): Promise<string> => {
      if (!uid) return Promise.reject(new Error('Not signed in'))
      return uploadDraftMedia(uid, file, onProgress)
    },
    [uid]
  )

  // Only what has finished uploading counts. Anything still in flight or failed
  // has no path, and a booking cannot refer to a file that is not there.
  const uploaded: MediaItem[] = items
    .filter((item) => item.path !== undefined && item.error === undefined)
    .map((item) => ({
      path: item.path as string,
      type: item.kind,
      sizeBytes: item.file.size,
    }))

  const busy = items.some((item) => item.progress !== undefined)

  function submit(): void {
    patchDraft({ media: uploaded })
    router.push('/book/address')
  }

  return (
    <BookingStep
      stepKey="media"
      title="Show us the problem"
      cta={{
        label: uploaded.length > 0 ? 'Continue' : 'Skip for now',
        onClick: submit,
        disabled: busy,
        loading: busy,
      }}
    >
      {config.status === 'loading' ? (
        <SkeletonGroup label="Loading" className="mt-6 gap-3">
          <Skeleton className="h-11 w-full rounded-pill" />
          <Skeleton className="h-28 w-full" />
        </SkeletonGroup>
      ) : config.status === 'error' || !limits ? (
        <ErrorState className="py-16" onRetry={config.reload} retrying={config.refreshing} />
      ) : (
        <>
          <Text className="mt-5 text-sm leading-[22px] text-muted">
            Optional, and often the fastest way to explain it — an error code, a leak, the model plate. Up to{' '}
            {limits.maxPhotos} photos and {limits.maxVideos === 1 ? 'one short video' : `${limits.maxVideos} short videos`}.
          </Text>

          <MediaUploader className="mt-5" items={items} onItemsChange={setItems} limits={limits} onUpload={upload} />

          <Card className="mt-7 flex-row items-start gap-3 p-4">
            <Icon as={Camera} className="mt-1 size-4 text-muted" />
            <Text className="flex-1 text-sm leading-[22px] text-muted">
              Only your expert and our support team see these. They stay with the booking and are never used for
              anything else.
            </Text>
          </Card>

          {draft.media && draft.media.length > 0 && items.length === 0 ? (
            <View className="mt-4">
              <Text className="text-xs text-muted">
                {draft.media.length} file{draft.media.length === 1 ? '' : 's'} attached earlier will be replaced by
                whatever you add here.
              </Text>
            </View>
          ) : null}
        </>
      )}
    </BookingStep>
  )
}
