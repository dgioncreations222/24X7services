import { useState } from 'react'
import { View } from 'react-native'
import { Image } from 'expo-image'
import { Camera, RotateCcw } from 'lucide-react-native'
import { uploadPhoto, type PartnerJob } from '@/lib/data'
import { useT } from '@/lib/i18n'
import { capturePhoto } from '@/lib/photo'
import { Icon } from '../base/Icon'
import { Tappable } from '../base/Tappable'
import { Text } from '../base/Text'

type Pending = { uri: string; progress: number | null; failed: boolean }

/**
 * Before or after photos for a job: the ones already saved, any still
 * uploading (with progress), and a big Add tile. A failed upload keeps the
 * picture and retries on tap — no re-shooting on a weak signal.
 */
export function PhotoSlots({ job, kind }: { job: PartnerJob; kind: 'before' | 'after' }) {
  const t = useT()
  const [pending, setPending] = useState<Pending[]>([])
  const saved = job.photos[kind]

  async function send(uri: string) {
    const set = (p: Partial<Pending>) => setPending((list) => list.map((x) => (x.uri === uri ? { ...x, ...p } : x)))
    set({ progress: 0, failed: false })
    try {
      await uploadPhoto(job.id, kind, uri, (f) => set({ progress: f }))
      setPending((list) => list.filter((x) => x.uri !== uri))
    } catch {
      set({ progress: null, failed: true })
    }
  }

  async function add() {
    const uri = await capturePhoto({ max: 1280 })
    if (!uri) return
    setPending((list) => [...list, { uri, progress: 0, failed: false }])
    await send(uri)
  }

  const tile = 'aspect-square w-[31%] overflow-hidden rounded-xl'

  return (
    <View className="flex-row flex-wrap gap-[3.5%] gap-y-3">
      {saved.map((p) => (
        <View key={p.id} className={`${tile} bg-canvas`}>
          <Image source={{ uri: p.url }} style={{ width: '100%', height: '100%' }} contentFit="cover" accessibilityLabel={t('Saved photo')} />
        </View>
      ))}
      {pending.map((p) => (
        <Tappable
          key={p.uri}
          disabled={!p.failed}
          onPress={() => send(p.uri)}
          accessibilityLabel={p.failed ? t('Upload failed — tap to retry') : t('Uploading')}
          className={`${tile} bg-canvas`}
        >
          <Image source={{ uri: p.uri }} style={{ width: '100%', height: '100%', opacity: 0.55 }} contentFit="cover" />
          <View className="absolute inset-x-2 bottom-2">
            {p.failed ? (
              <View className="flex-row items-center justify-center gap-1 rounded-lg bg-danger px-2 py-1">
                <Icon as={RotateCcw} className="size-3.5 text-white" />
                <Text className="text-[11px] font-bold text-white">{t('Retry')}</Text>
              </View>
            ) : (
              <View className="h-2 overflow-hidden rounded-full bg-white/70">
                <View className="h-full rounded-full bg-brand" style={{ width: `${Math.max(8, (p.progress ?? 0) * 100)}%` }} />
              </View>
            )}
          </View>
        </Tappable>
      ))}
      <Tappable onPress={add} accessibilityLabel={kind === 'before' ? t('Take a before photo') : t('Take an after photo')} className={`${tile} items-center justify-center gap-1 border-2 border-dashed border-brand/40 bg-brand-soft`}>
        <Icon as={Camera} className="size-7 text-brand" />
        <Text className="text-xs font-extrabold text-brand">{t('Add photo')}</Text>
      </Tappable>
    </View>
  )
}
