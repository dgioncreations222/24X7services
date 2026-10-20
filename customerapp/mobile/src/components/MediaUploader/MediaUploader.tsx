import { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { Camera, ImagePlus, Images, Trash2, Video } from 'lucide-react-native'
import type { MediaLimits } from '@app/shared'
import { compressPhoto, formatBytes, isPhoto, pickMedia, validateMedia, type PickedMedia } from '@/lib/media'
import { cn } from '@/lib/cn'
import { BottomSheet } from '@/components/ui/Overlay'
import { Icon, useColor } from '@/components/ui/Icon'
import { Img } from '@/components/ui/Img'
import { Tappable } from '@/components/ui/Tappable'
import { Text } from '@/components/ui/Text'
import { AddButton, SourceRow } from '@/components/MediaUploader/AddButton'

/**
 * Photos and a short video of the fault.
 *
 * Each item is tracked by id with its own progress and error, because a batch
 * of five uploads on a phone connection will not finish together and a single
 * shared spinner tells the customer nothing about which one is stuck.
 *
 * Nothing here talks to Storage. The parent supplies `onUpload`, which lets the
 * same component serve the pre-login case, where there is no uid to write
 * under and files are held locally until the booking is created.
 *
 * On the phone each button asks first whether to use the camera or the
 * gallery — the web app's file input made that choice in the browser's own
 * sheet.
 */

export interface MediaDraftItem {
  id: string
  file: PickedMedia
  /** Local uri for the thumbnail. */
  previewUrl: string
  kind: 'image' | 'video'
  /** 0 to 100 while uploading; undefined once it has settled. */
  progress?: number
  /** Set once the upload lands, and what the booking draft stores. */
  path?: string
  error?: string
}

export interface MediaUploaderProps {
  items: readonly MediaDraftItem[]
  onItemsChange: (items: MediaDraftItem[]) => void
  limits: MediaLimits
  /** Resolves to the Storage path once the file is uploaded. */
  onUpload?: (file: PickedMedia, onProgress: (percent: number) => void) => Promise<string>
  className?: string
}

let nextId = 0

export function MediaUploader({ items, onItemsChange, limits, onUpload, className }: MediaUploaderProps) {
  const [busy, setBusy] = useState(false)
  const [rejection, setRejection] = useState<string | null>(null)
  const [choosing, setChoosing] = useState<'image' | 'video' | null>(null)
  const spinner = useColor('text-muted')
  const onDark = useColor('text-white')

  // The upload callbacks resolve long after the render that started them, so
  // they read the list through a ref rather than closing over a stale copy.
  const itemsRef = useRef(items)
  useEffect(() => {
    itemsRef.current = items
  })

  const counts = {
    photos: items.filter((i) => i.kind === 'image').length,
    videos: items.filter((i) => i.kind === 'video').length,
  }

  const addFiles = useCallback(
    async (files: PickedMedia[]) => {
      if (files.length === 0) return
      setBusy(true)
      setRejection(null)

      let working = [...itemsRef.current]

      for (const file of files) {
        const problem = await validateMedia(file, limits, {
          photos: working.filter((i) => i.kind === 'image').length,
          videos: working.filter((i) => i.kind === 'video').length,
        })
        if (problem) {
          setRejection(problem.message)
          continue
        }

        const prepared = isPhoto(file) ? await compressPhoto(file, limits) : file
        nextId += 1
        const item: MediaDraftItem = {
          id: `media-${nextId}`,
          file: prepared,
          previewUrl: prepared.uri,
          kind: isPhoto(prepared) ? 'image' : 'video',
          ...(onUpload ? { progress: 0 } : {}),
        }
        working = [...working, item]
        itemsRef.current = working
        onItemsChange(working)

        if (onUpload) {
          void onUpload(prepared, (percent) => {
            onItemsChange(itemsRef.current.map((i) => (i.id === item.id ? { ...i, progress: percent } : i)))
          })
            .then((path) => {
              onItemsChange(
                itemsRef.current.map((i) => (i.id === item.id ? { ...i, path, progress: undefined } : i))
              )
            })
            .catch(() => {
              onItemsChange(
                itemsRef.current.map((i) =>
                  i.id === item.id
                    ? { ...i, progress: undefined, error: 'Upload failed. Remove it and try again.' }
                    : i
                )
              )
            })
        }
      }

      setBusy(false)
    },
    [limits, onItemsChange, onUpload]
  )

  async function pick(kind: 'image' | 'video', source: 'camera' | 'library'): Promise<void> {
    setChoosing(null)
    setRejection(null)
    try {
      const files = await pickMedia(kind, source, {
        multiple: kind === 'image',
        limit: kind === 'image' ? Math.max(1, limits.maxPhotos - counts.photos) : 1,
        maxVideoSeconds: limits.maxVideoSeconds,
      })
      await addFiles(files)
    } catch (error) {
      setBusy(false)
      setRejection(error instanceof Error ? error.message : 'Add a photo or a short video.')
    }
  }

  function remove(id: string): void {
    onItemsChange(items.filter((i) => i.id !== id))
    setRejection(null)
  }

  const photosFull = counts.photos >= limits.maxPhotos
  const videosFull = counts.videos >= limits.maxVideos

  return (
    <View className={cn('gap-3', className)}>
      <View className="flex-row gap-2">
        <AddButton
          label="Add photo"
          icon={Camera}
          busy={busy}
          disabled={photosFull || busy}
          spinner={spinner}
          onPress={() => setChoosing('image')}
        />
        <AddButton
          label="Add video"
          icon={Video}
          disabled={videosFull || busy}
          spinner={spinner}
          onPress={() => setChoosing('video')}
        />
      </View>

      <Text className="text-xs text-muted">
        Up to {limits.maxPhotos} photos and {limits.maxVideos === 1 ? 'one' : limits.maxVideos} video of up to{' '}
        {limits.maxVideoSeconds} seconds. Photos are resized on your phone before they are sent.
      </Text>

      {rejection ? (
        <Text accessibilityRole="alert" className="text-xs text-error">
          {rejection}
        </Text>
      ) : null}

      {items.length > 0 ? (
        <View className="flex-row flex-wrap gap-2">
          {items.map((item) => (
            <View
              key={item.id}
              className="relative aspect-square w-[31.5%] overflow-hidden rounded-card border border-border bg-surface"
            >
              {item.kind === 'image' ? (
                <Img source={{ uri: item.previewUrl }} alt="" className="absolute inset-0" />
              ) : (
                // A still of a local clip would need the video decoded; the
                // tile says what it is instead.
                <View className="absolute inset-0 items-center justify-center bg-surface">
                  <Icon as={Video} className="size-6 text-muted" />
                </View>
              )}

              {item.progress !== undefined ? (
                <View className="absolute inset-0 items-center justify-center gap-1 bg-night/60">
                  <ActivityIndicator color={onDark} />
                  <Text className="text-xs text-white" style={{ fontVariant: ['tabular-nums'] }}>
                    {Math.round(item.progress)}%
                  </Text>
                </View>
              ) : null}

              {item.error ? (
                <View className="absolute inset-0 items-center justify-center bg-error/80 p-1">
                  <Text className="text-center text-[10px] leading-[13px] text-white">{item.error}</Text>
                </View>
              ) : null}

              <Tappable
                onPress={() => remove(item.id)}
                accessibilityLabel={`Remove ${item.kind === 'image' ? 'photo' : 'video'}`}
                className="absolute right-1 top-1 size-8 items-center justify-center rounded-full bg-night/70"
              >
                <Icon as={Trash2} className="size-3.5 text-white" />
              </Tappable>

              <View className="absolute bottom-1 left-1 rounded-pill bg-night/70 px-1.5 py-0.5">
                <Text className="text-[10px] leading-[13px] text-white">{formatBytes(item.file.size)}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View className="items-center gap-2 rounded-card border border-dashed border-border px-4 py-8">
          <Icon as={ImagePlus} className="size-6 text-muted" />
          <Text className="text-center text-sm text-muted">
            Photos are optional, and they help the expert arrive with the right parts.
          </Text>
        </View>
      )}

      <BottomSheet
        open={choosing !== null}
        onClose={() => setChoosing(null)}
        title={choosing === 'video' ? 'Add video' : 'Add photo'}
      >
        <View className="gap-2">
          <SourceRow
            icon={choosing === 'video' ? Video : Camera}
            label={choosing === 'video' ? 'Record a video' : 'Take a photo'}
            onPress={() => void pick(choosing ?? 'image', 'camera')}
          />
          <SourceRow
            icon={Images}
            label="Choose from gallery"
            onPress={() => void pick(choosing ?? 'image', 'library')}
          />
        </View>
      </BottomSheet>
    </View>
  )
}
