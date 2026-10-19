import { Image, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import { Camera, X } from 'lucide-react-native'
import { useStore } from '@/lib/store'
import type { Job, PhotoKind } from '@/lib/types'
import { Icon, Tappable, Text } from './ui'

const SLOTS: { kind: PhotoKind; label: string; hint: string }[] = [
  { kind: 'appliance', label: 'Appliance', hint: 'Model plate & overall' },
  { kind: 'damaged', label: 'Damaged part', hint: 'Close-up of the fault' },
  { kind: 'before', label: 'Before', hint: 'As found' },
  { kind: 'after', label: 'After', hint: 'Repaired & tested' },
]

/** Shrunk before saving: a 12 MP photo would blow the storage quota on its own. */
async function downscale(uri: string, width: number, height: number): Promise<string> {
  const max = 720
  const k = Math.min(1, max / Math.max(width || max, height || max))
  const base = ImageManipulator.manipulate(uri)
  const ctx = k < 1 && width && height ? base.resize({ width: Math.round(width * k), height: Math.round(height * k) }) : base
  const img = await ctx.renderAsync()
  const saved = await img.saveAsync({ format: SaveFormat.JPEG, compress: 0.72, base64: true })
  return `data:image/jpeg;base64,${saved.base64}`
}

/**
 * The camera first, as the web's `capture="environment"` asks for; if the
 * camera is refused or missing (a simulator), the photo library instead.
 */
async function takePhoto(): Promise<ImagePicker.ImagePickerAsset | null> {
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 }
  try {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (perm.granted) {
      const r = await ImagePicker.launchCameraAsync(options)
      return r.canceled ? null : (r.assets[0] ?? null)
    }
  } catch {
    /* no camera on this device — fall through to the library */
  }
  const r = await ImagePicker.launchImageLibraryAsync(options)
  return r.canceled ? null : (r.assets[0] ?? null)
}

/** A photo id from the clock — taken when the shot is saved, not during render. */
const photoId = () => `${Date.now()}`

export function PhotoSlots({ job, only }: { job: Job; only?: PhotoKind[] }) {
  const { addPhoto, removePhoto } = useStore()
  const slots = only ? SLOTS.filter((s) => only.includes(s.kind)) : SLOTS

  async function capture(kind: PhotoKind) {
    const asset = await takePhoto()
    if (!asset) return
    const url = await downscale(asset.uri, asset.width, asset.height)
    addPhoto(job.id, { id: photoId(), kind, url })
  }

  return (
    <View className="flex-row flex-wrap justify-between gap-y-3">
      {slots.map((s) => {
        const photos = job.photos.filter((p) => p.kind === s.kind)
        return (
          <View key={s.kind} className="w-[48%]">
            <View className="mb-1.5 flex-row items-baseline justify-between">
              <Text className="text-xs font-extrabold text-ink-2">{s.label}</Text>
              {photos.length > 0 && <Text className="num text-[11px] font-bold text-success">{photos.length} added</Text>}
            </View>
            <View className="gap-2">
              {photos.map((p) => (
                <View key={p.id} className="aspect-[4/3] overflow-hidden rounded-xl border border-line bg-canvas">
                  <Image
                    source={{ uri: p.url }}
                    accessibilityLabel={`${s.label} photo`}
                    accessibilityIgnoresInvertColors
                    resizeMode="cover"
                    className="size-full"
                  />
                  <Tappable
                    accessibilityLabel="Remove photo"
                    hitSlop={6}
                    onPress={() => removePhoto(job.id, p.id)}
                    className="absolute right-1.5 top-1.5 size-7 items-center justify-center rounded-full bg-ink/70"
                  >
                    <Icon as={X} className="size-4 text-white" />
                  </Tappable>
                </View>
              ))}
              <Tappable
                onPress={() => void capture(s.kind)}
                className="aspect-[4/3] items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line-strong bg-card active:border-brand active:opacity-100"
              >
                <Icon as={Camera} className="size-5 text-muted" />
                <Text className="text-xs font-bold text-muted">{photos.length ? 'Add another' : 'Take photo'}</Text>
                <Text className="px-2 text-center text-[10.5px] font-medium text-faint">{s.hint}</Text>
              </Tappable>
            </View>
          </View>
        )
      })}
    </View>
  )
}
