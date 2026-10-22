import { useState } from 'react'
import { View } from 'react-native'
import { Bell, Check, Headset, IndianRupee, CalendarClock, KeyRound, Siren, Volume2, type LucideIcon } from 'lucide-react-native'
import { ChangePasswordSheet } from '@/components/account/ChangePasswordSheet'
import { LogoutButton } from '@/components/account/LogoutButton'
import { NavRow } from '@/components/account/NavRow'
import { Card, Icon, Page, ScreenHeader, SectionTitle, Tappable, Text, Toggle } from '@/components/ui'
import { useDeviceSettings, useSession, type AppLanguage, type DeviceSettings } from '@/lib/data'
import { BRAND } from '@/lib/brand'
import { chime } from '@/lib/chime'
import { cn } from '@/lib/cn'
import { useT } from '@/lib/i18n'

const LANGUAGES: readonly { value: AppLanguage; native: string; english: string }[] = [
  { value: 'English', native: 'English', english: 'English' },
  { value: 'हिन्दी', native: 'हिन्दी', english: 'Hindi' },
  { value: 'తెలుగు', native: 'తెలుగు', english: 'Telugu' },
  { value: 'اردو', native: 'اردو', english: 'Urdu' },
]

type NotifyKey = keyof DeviceSettings['notify']

/** Each switch says in its own row what it does right now. */
const NOTIFY: readonly { key: NotifyKey; icon: LucideIcon; title: string; on: string; off: string }[] = [
  { key: 'requests', icon: Bell, title: 'New service requests', on: 'Pop-up for each new job in your shift', off: 'New requests wait on Home' },
  { key: 'emergency', icon: Siren, title: 'Emergency requests', on: 'Pop-up for each emergency request', off: 'Emergencies wait on Home' },
  { key: 'schedule', icon: CalendarClock, title: 'Schedule changes & cancellations', on: 'Notified when a job moves or is cancelled', off: 'No schedule notifications' },
  { key: 'payments', icon: IndianRupee, title: 'Payments & ratings', on: 'Notified for every payment and rating', off: 'No payment or rating notifications' },
  { key: 'sound', icon: Volume2, title: 'Alert sound', on: 'A chime plays with every alert', off: 'Alerts arrive silently' },
]

/** App language and alerts — both kept on this phone. */
export default function SettingsScreen() {
  const t = useT()
  const [settings, update] = useDeviceSettings()
  const session = useSession()
  const [passwordOpen, setPasswordOpen] = useState(false)

  function toggle(key: NotifyKey, on: boolean) {
    update({ notify: { ...settings.notify, [key]: on } })
    if (key === 'sound' && on) chime()
  }

  return (
    <View className="flex-1 bg-canvas">
      <ScreenHeader back="/profile" title={t('Settings')} />
      <Page className="gap-5">
        <View>
          <SectionTitle>{t('App language')}</SectionTitle>
          <Card>
            <View accessibilityRole="radiogroup" accessibilityLabel={t('App language')}>
              {LANGUAGES.map((l, i) => {
                const on = settings.language === l.value
                return (
                  <Tappable
                    key={l.value}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    onPress={() => update({ language: l.value })}
                    className={cn('min-h-14 flex-row items-center gap-3 px-4 py-3 active:bg-canvas active:opacity-100', i > 0 && 'border-t border-line')}
                  >
                    <View className="min-w-0 flex-1">
                      <Text className={cn('text-left text-base', on ? 'font-extrabold text-brand' : 'font-semibold')}>{l.native}</Text>
                      {l.native !== l.english ? <Text className="text-sm text-muted">{l.english}</Text> : null}
                    </View>
                    <View className={cn('size-6 items-center justify-center rounded-full border-2', on ? 'border-brand bg-brand' : 'border-line-strong')}>
                      {on ? <Icon as={Check} className="size-4 text-white" strokeWidth={3} /> : null}
                    </View>
                  </Tappable>
                )
              })}
            </View>
          </Card>
        </View>

        <View>
          <SectionTitle>{t('Alerts')}</SectionTitle>
          <Card>
            {NOTIFY.map((r, i) => {
              const on = settings.notify[r.key]
              return (
                <View key={r.key} className={cn('flex-row items-center gap-3 px-4 py-3.5', i > 0 && 'border-t border-line')}>
                  <View className={cn('size-10 shrink-0 items-center justify-center rounded-xl', on ? 'bg-brand-soft' : 'bg-canvas')}>
                    <Icon as={r.icon} className={cn('size-5', on ? 'text-brand' : 'text-faint')} />
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="text-base font-bold">{t(r.title)}</Text>
                    <Text className="text-sm text-muted">{t(on ? r.on : r.off)}</Text>
                  </View>
                  <Toggle checked={on} onChange={(v) => toggle(r.key, v)} label={t(r.title)} size="lg" />
                </View>
              )
            })}
          </Card>
        </View>

        <Card>
          {session.provider === 'email' ? <NavRow first icon={KeyRound} title={t('Change password')} onPress={() => setPasswordOpen(true)} /> : null}
          <NavRow first={session.provider !== 'email'} icon={Headset} title={t('Help & Support')} href="/support" />
        </Card>
        <ChangePasswordSheet open={passwordOpen} onClose={() => setPasswordOpen(false)} />
        <LogoutButton />
        <Text className="text-center text-xs font-semibold text-faint">{BRAND.app} · v0.1.0</Text>
      </Page>
    </View>
  )
}
