import * as ImagePicker from 'expo-image-picker'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'

/**
 * Take a photo for upload: the camera first (the front camera for a selfie),
 * the photo library if the camera is refused or missing. Shrunk to `max` px
 * on the long side as a JPEG data URL — a 12 MP photo is too big to send on a
 * weak signal. Resolves null if the technician backs out.
 */
export async function capturePhoto({ selfie = false, max = 1280 }: { selfie?: boolean; max?: number } = {}): Promise<string | null> {
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 1,
    cameraType: selfie ? ImagePicker.CameraType.front : ImagePicker.CameraType.back,
  }
  let asset: ImagePicker.ImagePickerAsset | null = null
  try {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (perm.granted) {
      const r = await ImagePicker.launchCameraAsync(options)
      if (r.canceled) return null
      asset = r.assets[0] ?? null
    }
  } catch {
    /* no camera on this device — fall through to the library */
  }
  if (!asset) {
    const r = await ImagePicker.launchImageLibraryAsync(options)
    if (r.canceled) return null
    asset = r.assets[0] ?? null
  }
  if (!asset) return null
  const k = Math.min(1, max / Math.max(asset.width || max, asset.height || max))
  const base = ImageManipulator.manipulate(asset.uri)
  const ctx = k < 1 && asset.width && asset.height ? base.resize({ width: Math.round(asset.width * k), height: Math.round(asset.height * k) }) : base
  const img = await ctx.renderAsync()
  const saved = await img.saveAsync({ format: SaveFormat.JPEG, compress: 0.72, base64: true })
  return `data:image/jpeg;base64,${saved.base64}`
}
