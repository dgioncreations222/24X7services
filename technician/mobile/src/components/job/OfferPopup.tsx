import { useEffect, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated'
import { router, usePathname } from 'expo-router'
import { Clock, MapPin } from 'lucide-react-native'
import { acceptJob, rejectJob, useDeviceSettings, useJobs, useProfile, type PartnerJob } from '@/lib/data'
import { chime } from '@/lib/chime'
import { cn } from '@/lib/cn'
import { useT } from '@/lib/i18n'
import { rupees } from '@/lib/money'
import { COLORS } from '@/lib/theme'
import { clock, day } from '@/lib/when'
import { Icon } from '../base/Icon'
import { Text } from '../base/Text'
import { Button } from '../ui/Button'
import { OFFER_SECONDS, useOfferCountdown } from './useOfferCountdown'

/**
 * A new request takes the bottom of whatever screen is open, the way the
 * UC partner app does: service, area, time, what it pays, a 30-second clock
 * and two big buttons. Only while online, and not over the request's own
 * details screen. Settings → Alerts decides which kinds pop up; the rest
 * wait on Home.
 */
export function OfferPopup() {
  const pathname = usePathname()
  const offers = useJobs('offers')
  const profile = useProfile()
  const [settings] = useDeviceSettings()
  const offer = offers.data?.find((o) => (o.priority === 'emergency' ? settings.notify.emergency : settings.notify.requests))
  if (!offer || !profile.data?.online || pathname.startsWith('/request')) return null
  return <OfferCard key={offer.id} offer={offer} sound={settings.notify.sound} />
}

function OfferCard({ offer, sound }: { offer: PartnerJob; sound: boolean }) {
  const t = useT()
  const insets = useSafeAreaInsets()
  const left = useOfferCountdown(offer.id)
  const [busy, setBusy] = useState<'accept' | 'reject' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const urgent = offer.priority === 'emergency'

  // One chime as the card appears, if the technician wants alert sounds.
  useEffect(() => {
    if (sound) chime(urgent)
  }, [sound, urgent])

  async function answer(kind: 'accept' | 'reject') {
    setBusy(kind)
    setError(null)
    try {
      if (kind === 'accept') {
        await acceptJob(offer.id)
        router.push(`/jobs/detail?id=${offer.id}`)
      } else await rejectJob(offer.id)
    } catch {
      setError(t('Couldn’t reach the server. Try again.'))
      setBusy(null)
    }
  }

  return (
    <Animated.View
      entering={FadeInDown.duration(260).reduceMotion(ReduceMotion.System)}
      accessibilityViewIsModal
      accessibilityLiveRegion="assertive"
      className="absolute inset-x-0 bottom-0 z-50 overflow-hidden rounded-t-3xl bg-card shadow-float"
      style={{ paddingBottom: insets.bottom + 12 }}
    >
      <View className={cn('flex-row items-center gap-4 px-5 py-4', urgent ? 'bg-danger-deep' : 'bg-brand-ink')}>
        <View className="size-14 items-center justify-center rounded-full border-4 border-white/30">
          <Text className="num text-xl font-extrabold text-white">{left}</Text>
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/70">{urgent ? t('Emergency · respond now') : t('New job request')}</Text>
          <Text numberOfLines={1} className="text-lg font-extrabold text-white">
            {offer.service.name}
          </Text>
        </View>
      </View>
      <View className="h-1 bg-line">
        <View className={cn('h-full', urgent ? 'bg-danger' : 'bg-brand')} style={{ width: `${(left / OFFER_SECONDS) * 100}%` }} />
      </View>

      <View className="gap-3 px-5 pt-4">
        <View className="flex-row items-center justify-between gap-3">
          <View className="gap-1.5">
            <View className="flex-row items-center gap-1.5">
              <Icon as={MapPin} className="size-4 text-muted" />
              <Text className="text-base font-bold">
                {offer.address.area} · {offer.distanceKm} km
              </Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <Icon as={Clock} className="size-4 text-muted" />
              <Text className="text-base font-bold">
                {t(day(offer.slotStart))}, {clock(offer.slotStart)}
              </Text>
            </View>
          </View>
          <View className="items-end">
            <Text className="text-xs font-bold text-muted">{t('You earn')}</Text>
            <Text className="num text-2xl font-extrabold text-success">{rupees(offer.earning)}</Text>
          </View>
        </View>
        {error ? <Text className="text-sm font-semibold text-danger">{error}</Text> : null}
        <View className="flex-row gap-3">
          <Button size="lg" variant="secondary" className="flex-1" disabled={busy !== null} onPress={() => answer('reject')}>
            {busy === 'reject' ? <ActivityIndicator color={COLORS.ink} /> : t('Reject')}
          </Button>
          <Button size="lg" variant="success" className="flex-[2]" disabled={busy !== null} onPress={() => answer('accept')}>
            {busy === 'accept' ? <ActivityIndicator color={COLORS.white} /> : t('Accept')}
          </Button>
        </View>
        <Button variant="ghost" href={`/request?id=${offer.id}`} className="self-center">
          {t('See full details')}
        </Button>
      </View>
    </Animated.View>
  )
}
