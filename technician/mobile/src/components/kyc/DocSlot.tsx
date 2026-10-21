import { useState } from 'react'
import { View } from 'react-native'
import { Image } from 'expo-image'
import { Camera, CircleCheck, Plus, RotateCcw } from 'lucide-react-native'
import { uploadKycDocument, type KycDocType, type KycDocument } from '@/lib/data'
import { cn } from '@/lib/cn'
import { useT } from '@/lib/i18n'
import { capturePhoto } from '@/lib/photo'
import { Icon } from '../base/Icon'
import { Tappable } from '../base/Tappable'
import { Text } from '../base/Text'

/**
 * One KYC document: tap to take the photo, watch it upload, tap again to
 * replace it. A failed upload keeps the photo and offers a retry, so a weak
 * signal never means taking the picture twice.
 */
export function DocSlot({ type, title, hint, doc, selfie }: { type: KycDocType; title: string; hint: string; doc?: KycDocument; selfie?: boolean }) {
  const t = useT()
  const [local, setLocal] = useState<string | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [failed, setFailed] = useState(false)

  async function upload(uri: string) {
    setFailed(false)
    setProgress(0)
    try {
      await uploadKycDocument(type, uri, setProgress)
      setLocal(null)
    } catch {
      setFailed(true)
    } finally {
      setProgress(null)
    }
  }

  async function pick() {
    const uri = await capturePhoto({ selfie })
    if (!uri) return
    setLocal(uri)
    await upload(uri)
  }

  const shown = local ?? doc?.fileUrl
  const uploading = progress !== null
  const done = !!doc && !local && !failed

  return (
    <Tappable
      accessibilityLabel={done ? t('Replace {title}', { title }) : t('Add {title}', { title })}
      disabled={uploading}
      onPress={failed && local ? () => upload(local) : pick}
      className={cn('flex-row items-center gap-3 rounded-card border-2 p-3', done ? 'border-success/40 bg-success-soft' : failed ? 'border-danger/40 bg-danger-soft' : 'border-dashed border-line-strong bg-card')}
    >
      <View className="size-16 items-center justify-center overflow-hidden rounded-xl bg-canvas">
        {shown ? <Image source={{ uri: shown }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : <Icon as={Camera} className="size-6 text-muted" />}
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-base font-extrabold">{title}</Text>
        {uploading ? (
          <View className="mt-2 h-2 overflow-hidden rounded-full bg-line" accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}>
            <View className="h-full rounded-full bg-brand" style={{ width: `${Math.max(8, progress * 100)}%` }} />
          </View>
        ) : (
          <Text className={cn('mt-0.5 text-xs font-semibold', failed ? 'text-danger' : done ? 'text-success' : 'text-muted')}>
            {failed ? t('Upload failed — tap to retry') : done ? t('Uploaded — tap to replace') : hint}
          </Text>
        )}
      </View>
      <Icon as={failed ? RotateCcw : done ? CircleCheck : uploading ? Camera : Plus} className={cn('size-5', failed ? 'text-danger' : done ? 'text-success' : 'text-brand')} />
    </Tappable>
  )
}
