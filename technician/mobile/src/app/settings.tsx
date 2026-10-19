import { useEffect, useState } from 'react'
import { Share, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { Easing, FadeInDown, ReduceMotion } from 'react-native-reanimated'
import { router } from 'expo-router'
import * as Clipboard from 'expo-clipboard'
import {
  Bell,
  CircleCheck,
  ChevronRight,
  Download,
  Headset,
  KeyRound,
  Languages,
  Landmark,
  LogOut,
  QrCode as QrIcon,
  RotateCcw,
  Share2,
  Siren,
  Smartphone,
  UserRound,
  Volume2,
  type LucideIcon,
} from 'lucide-react-native'
import { AvailabilitySettings } from '@/components/Availability'
import { QrCode, downloadQr, upiLink } from '@/components/UpiQr'
import { Avatar, Button, Card, Field, Icon, Page, ScreenHeader, SectionTitle, Segmented, Sheet, Tappable, Text, Toggle, inputClass } from '@/components/ui'
import { chime } from '@/lib/chime'
import { BRAND } from '@/lib/brand'
import { cn } from '@/lib/cn'
import { ago } from '@/lib/format'
import { useT } from '@/lib/i18n'
import { useStore, useTick } from '@/lib/store'
import type { Settings } from '@/lib/types'

type SheetName = 'payment' | 'scanner' | 'account' | 'password' | 'devices' | 'logout'

/** Each switch says in its own row what it is doing right now. */
const NOTIFY_ROWS: { key: keyof Settings['notify']; title: string; on: string; off: string }[] = [
  { key: 'requests', title: 'New service requests', on: 'Pop-up for each new job in your shift', off: 'New jobs wait quietly in Jobs' },
  { key: 'emergency', title: 'Emergency requests', on: 'Full-screen alert, even off shift', off: 'Emergencies wait quietly in Jobs' },
  { key: 'schedule', title: 'Schedule changes & cancellations', on: 'Notified when a job moves or is cancelled', off: 'No schedule notifications' },
  { key: 'payments', title: 'Payments & ratings', on: 'Notified for every payment and rating', off: 'No payment or rating notifications' },
  { key: 'sound', title: 'Alert sound', on: 'A chime plays with every alert', off: 'Alerts arrive silently' },
]

const NOTIFY_LABEL: Record<keyof Settings['notify'], string> = {
  requests: 'New request alerts',
  emergency: 'Emergency alerts',
  schedule: 'Schedule alerts',
  payments: 'Payment & rating alerts',
  sound: 'Alert sound',
}

export default function SettingsScreen() {
  const store = useStore()
  const t = useT()
  const now = useTick(60_000)
  const { settings: s, updateSettings } = store
  const [sheet, setSheet] = useState<null | SheetName>(null)
  const [toast, setToast] = useState<string | null>(null)
  const notify = (k: keyof Settings['notify'], v: boolean) => {
    updateSettings((cur) => ({ notify: { ...cur.notify, [k]: v } }))
    if (k === 'sound' && v) chime()
    flash(`${NOTIFY_LABEL[k]} ${v ? 'on' : 'off'}`)
  }
  const flash = (msg: string) => setToast(msg)
  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(id)
  }, [toast])

  const passwordAge = Math.floor((now - new Date(s.passwordChangedAt).getTime()) / 86_400_000)

  return (
    <>
      <ScreenHeader back="/profile" title={t('Settings')} />
      <Page className="gap-5">
        <AvailabilitySettings />

        <View>
          <SectionTitle>{t('Language')}</SectionTitle>
          <Card className="p-4">
            <View className="mb-3 flex-row items-center gap-2">
              <Icon as={Languages} className="size-4 text-ink-2" />
              <Text className="text-sm font-extrabold">{t('App language')}</Text>
            </View>
            <Segmented
              value={s.language}
              onChange={(v) => updateSettings({ language: v })}
              options={[
                { value: 'English', label: 'English' },
                { value: 'हिन्दी', label: 'हिन्दी' },
                { value: 'తెలుగు', label: 'తెలుగు' },
                { value: 'اردو', label: 'اردو' },
              ]}
            />
          </Card>
        </View>

        <View>
          <SectionTitle>{t('Notifications')}</SectionTitle>
          <Card>
            {NOTIFY_ROWS.map((r, i) => (
              <NotifyLine
                key={r.key}
                first={i === 0}
                icon={r.key === 'sound' ? Volume2 : r.key === 'emergency' ? Siren : Bell}
                title={t(r.title)}
                on={s.notify[r.key]}
                onText={t(r.on)}
                offText={t(r.off)}
              >
                <Toggle checked={s.notify[r.key]} onChange={(v) => notify(r.key, v)} label={r.title} />
              </NotifyLine>
            ))}
          </Card>
        </View>

        <View>
          <SectionTitle>{t('Account')}</SectionTitle>
          <Card>
            <Nav first icon={QrIcon} title={t('My payment scanner')} sub={t('Your UPI QR for customers to scan')} onPress={() => setSheet('scanner')} />
            <Nav icon={Landmark} title={t('Payment settings')} sub={`${s.bank} · ${s.upi}`} onPress={() => setSheet('payment')} />
            <Nav icon={UserRound} title={t('Account settings')} sub={t('Password, fingerprint, devices')} onPress={() => setSheet('account')} />
            <Nav icon={Headset} title={t('Help & Support')} href="/support" />
            <Nav
              icon={RotateCcw}
              title={t('Reset demo data')}
              sub={t('Reload today’s sample jobs')}
              onPress={() => {
                store.resetDemo()
                flash('Demo data reset')
              }}
            />
          </Card>
        </View>
        <Tappable
          onPress={() => setSheet('logout')}
          className="h-14 w-full flex-row items-center justify-center gap-2 rounded-xl border-2 border-danger/30 bg-card active:bg-danger-soft active:opacity-100"
        >
          <Icon as={LogOut} className="size-5 text-danger" />
          <Text className="text-base font-extrabold text-danger">{t('Logout')}</Text>
        </Tappable>
        <Text className="text-center text-xs font-semibold text-faint">{BRAND.app} · v0.1.0</Text>
      </Page>

      <PaymentSheet
        open={sheet === 'payment'}
        onClose={() => setSheet(null)}
        onSave={(bank, upi) => {
          updateSettings({ bank, upi })
          setSheet(null)
          flash('Payment settings saved')
        }}
      />

      <ScannerSheet open={sheet === 'scanner'} onClose={() => setSheet(null)} onEdit={() => setSheet('payment')} flash={flash} />

      <Sheet open={sheet === 'account'} onClose={() => setSheet(null)} title={t('Account settings')}>
        <View className="-mx-4 -my-4">
          <Nav
            first
            icon={KeyRound}
            title="Change password"
            sub={passwordAge <= 0 ? 'Changed today' : `Last changed ${passwordAge} day${passwordAge === 1 ? '' : 's'} ago`}
            onPress={() => setSheet('password')}
          />
          <Line icon={Smartphone} title="Fingerprint sign-in" sub={s.fingerprint ? 'On for this device' : 'Off · sign in with your password'}>
            <Toggle
              checked={s.fingerprint}
              onChange={(v) => {
                updateSettings({ fingerprint: v })
                flash(`Fingerprint sign-in ${v ? 'on' : 'off'}`)
              }}
              label="Fingerprint sign-in"
            />
          </Line>
          <Nav
            icon={Smartphone}
            title="Signed-in devices"
            sub={`${s.devices.length + 1} active · this phone${s.devices.length ? ` + ${s.devices.length} more` : ''}`}
            onPress={() => setSheet('devices')}
          />
        </View>
      </Sheet>

      <PasswordSheet
        open={sheet === 'password'}
        onClose={() => setSheet('account')}
        onSave={() => {
          updateSettings({ passwordChangedAt: new Date().toISOString() })
          setSheet('account')
          flash('Password updated')
        }}
      />

      <Sheet open={sheet === 'devices'} onClose={() => setSheet('account')} title="Signed-in devices">
        <View className="-mx-4 -my-4">
          <View className="flex-row items-center gap-3 p-4">
            <View className="size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft">
              <Icon as={Smartphone} className="size-4 text-brand" />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-sm font-extrabold">This phone</Text>
              <Text className="text-xs font-medium text-success">Active now</Text>
            </View>
          </View>
          {s.devices.map((d) => (
            <View key={d.id} className="flex-row items-center gap-3 border-t border-line p-4">
              <View className="size-9 shrink-0 items-center justify-center rounded-lg bg-canvas">
                <Icon as={Smartphone} className="size-4 text-ink-2" />
              </View>
              <View className="min-w-0 flex-1">
                <Text numberOfLines={1} className="text-sm font-extrabold">
                  {d.name}
                </Text>
                <Text className="text-xs font-medium text-muted">Last active {ago(d.lastActive)}</Text>
              </View>
              <Button
                variant="secondary"
                size="sm"
                onPress={() => {
                  updateSettings({ devices: s.devices.filter((x) => x.id !== d.id) })
                  flash(`Signed out ${d.name.split(' · ')[0]}`)
                }}
              >
                Sign out
              </Button>
            </View>
          ))}
        </View>
        {s.devices.length === 0 && <Text className="mt-6 text-center text-xs font-medium text-muted">No other device is signed in to your account.</Text>}
      </Sheet>

      <Sheet open={sheet === 'logout'} onClose={() => setSheet(null)} title="Log out?">
        <Text className="text-sm text-muted">You’ll go offline and stop receiving requests. Jobs in progress stay assigned to you.</Text>
        <View className="mt-5 flex-row gap-2">
          <Button variant="secondary" size="lg" className="flex-1" onPress={() => setSheet(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="lg"
            className="flex-1"
            onPress={() => {
              setSheet(null)
              store.setOnline(false)
              store.signOut()
              router.replace('/login')
            }}
          >
            {t('Logout')}
          </Button>
        </View>
      </Sheet>

      {toast && <Toast text={toast} />}
    </>
  )
}

/**
 * The confirmation pill at the top of the screen. It sits under any open
 * sheet (a sheet is its own system window), so the sheets that flash also
 * show their result in place — a toggle flips, a device row disappears.
 */
function Toast({ text }: { text: string }) {
  const insets = useSafeAreaInsets()
  return (
    <View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      className="absolute inset-x-0 z-[80] items-center px-4"
      style={{ top: insets.top + 12, elevation: 80 }}
    >
      <Animated.View
        key={text}
        entering={FadeInDown.duration(280).easing(Easing.bezier(0.22, 0.61, 0.36, 1).factory()).reduceMotion(ReduceMotion.System)}
        accessibilityRole="alert"
        className="flex-row items-center gap-2 rounded-xl bg-ink px-4 py-3 shadow-float"
      >
        <Icon as={CircleCheck} className="size-4 text-[#4ade80]" />
        <Text className="shrink text-sm font-bold text-white">{text}</Text>
      </Animated.View>
    </View>
  )
}

/**
 * The technician's own counter scanner: a static UPI QR any customer can scan
 * and pay into, the way a shop keeps one by the till. Bills show a QR with the
 * amount filled in; this one leaves the amount to the customer.
 */
function ScannerSheet({ open, onClose, onEdit, flash }: { open: boolean; onClose: () => void; onEdit: () => void; flash: (m: string) => void }) {
  const { settings, tech } = useStore()
  const link = upiLink({ upi: settings.upi, name: tech.name })
  const file = `${tech.name.replace(/\s+/g, '-')}-UPI-QR.png`

  return (
    <Sheet open={open} onClose={onClose} title="My payment scanner">
      <View className="w-full max-w-sm self-center overflow-hidden rounded-2xl border border-line bg-card">
        <View className="flex-row items-center gap-3 bg-brand-ink px-4 py-3">
          <View className="rounded-full border-2 border-white/20">
            <Avatar name={tech.name} photo={tech.photo} size={36} />
          </View>
          <View className="min-w-0 flex-1">
            <Text numberOfLines={1} className="text-[15px] font-extrabold leading-tight text-white">
              {tech.name}
            </Text>
            <Text numberOfLines={1} className="num text-[11px] font-semibold text-white/60">
              {tech.id}
            </Text>
          </View>
          <View className="rounded-md bg-white/10 px-2 py-1">
            <Text className="text-[10px] font-extrabold tracking-[0.14em] text-white">UPI</Text>
          </View>
        </View>

        <View className="px-6 pb-3 pt-5">
          <QrCode text={link} className="aspect-square w-full max-w-[216px] self-center" label={`UPI QR for ${settings.upi}`} />
          <Text className="mt-3 text-center text-[11px] font-semibold text-muted">Scan with GPay, PhonePe, Paytm or any UPI app</Text>
        </View>

        <View className="flex-row items-center gap-3 border-t border-line px-4 py-3">
          <View className="min-w-0 flex-1">
            <Text className="text-[10.5px] font-bold uppercase tracking-wider text-faint">UPI ID</Text>
            <Text numberOfLines={1} className="num text-sm font-extrabold">
              {settings.upi}
            </Text>
          </View>
          <Tappable onPress={onEdit} className="h-9 shrink-0 justify-center rounded-lg px-3 active:bg-brand-soft active:opacity-100">
            <Text className="text-sm font-bold text-brand">Change</Text>
          </Tappable>
        </View>
      </View>

      <View className="mt-4 w-full max-w-sm flex-row gap-2.5 self-center">
        <Button
          variant="secondary"
          className="flex-1"
          onPress={async () => {
            try {
              await downloadQr(link, file)
              flash('Scanner saved as PNG')
            } catch {
              /* share sheet dismissed */
            }
          }}
        >
          <Icon as={Download} className="size-4" /> Download
        </Button>
        <Button
          className="flex-1"
          onPress={async () => {
            try {
              await Share.share({ title: `Pay ${tech.name}`, message: `Pay ${tech.name} on UPI: ${settings.upi}` })
            } catch {
              // No share sheet (a desktop browser): copy the UPI ID instead.
              try {
                await Clipboard.setStringAsync(settings.upi)
                flash('UPI ID copied')
              } catch {
                /* nothing to fall back to */
              }
            }
          }}
        >
          <Icon as={Share2} className="size-4" /> Share
        </Button>
      </View>
    </Sheet>
  )
}

/** Edits a draft, so closing the sheet without saving leaves the account as it was. */
function PaymentSheet({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (bank: string, upi: string) => void }) {
  const { settings } = useStore()
  const [bank, setBank] = useState(settings.bank)
  const [upi, setUpi] = useState(settings.upi)
  const [wasOpen, setWasOpen] = useState(open)
  // Reset the draft to the saved values each time the sheet opens.
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setBank(settings.bank)
      setUpi(settings.upi)
    }
  }
  const upiOk = /^[\w.-]{2,}@[a-z]{2,}$/i.test(upi.trim())
  const ok = bank.trim().length > 2 && upiOk

  return (
    <Sheet open={open} onClose={onClose} title="Payment settings">
      <View className="gap-4">
        <Field label="Payout bank account">
          <TextInput value={bank} onChangeText={setBank} className={inputClass} placeholderTextColor="#8a93a3" />
        </Field>
        <Field
          label="UPI ID for collections"
          hint={upi && !upiOk ? <Text className="text-xs text-danger">Enter a UPI ID like name@okhdfc</Text> : 'Shown to customers on the bill QR'}
        >
          <TextInput
            value={upi}
            onChangeText={setUpi}
            className={inputClass}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholderTextColor="#8a93a3"
          />
        </Field>
        <Button size="lg" className="w-full" disabled={!ok} onPress={() => onSave(bank.trim(), upi.trim())}>
          Save
        </Button>
      </View>
    </Sheet>
  )
}

function PasswordSheet({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: () => void }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [again, setAgain] = useState('')
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    setCurrent('')
    setNext('')
    setAgain('')
  }
  const error =
    next && next.length < 8 ? 'Use at least 8 characters' : next && current && next === current ? 'Pick a password you haven’t used here' : again && again !== next ? 'Passwords don’t match' : null
  const ok = current.length > 0 && next.length >= 8 && next === again && next !== current

  return (
    <Sheet open={open} onClose={onClose} title="Change password">
      <View className="gap-4">
        <Field label="Current password">
          <TextInput secureTextEntry autoComplete="current-password" value={current} onChangeText={setCurrent} className={inputClass} />
        </Field>
        <Field label="New password">
          <TextInput secureTextEntry autoComplete="new-password" value={next} onChangeText={setNext} className={inputClass} />
        </Field>
        <Field label="Confirm new password" hint={error ? <Text className="text-xs text-danger">{error}</Text> : 'At least 8 characters'}>
          <TextInput secureTextEntry autoComplete="new-password" value={again} onChangeText={setAgain} className={inputClass} />
        </Field>
        <Button size="lg" className="w-full" disabled={!ok} onPress={onSave}>
          Update password
        </Button>
      </View>
    </Sheet>
  )
}

function NotifyLine({
  icon,
  title,
  on,
  onText,
  offText,
  first,
  children,
}: {
  icon: LucideIcon
  title: string
  on: boolean
  onText: string
  offText: string
  first?: boolean
  children: React.ReactNode
}) {
  const t = useT()
  return (
    <View className={cn('flex-row items-center gap-3 p-4', !first && 'border-t border-line')}>
      <View className={cn('size-9 shrink-0 items-center justify-center rounded-lg', on ? 'bg-brand-soft' : 'bg-canvas')}>
        <Icon as={icon} className={cn('size-4', on ? 'text-brand' : 'text-faint')} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-sm font-extrabold">{title}</Text>
        <Text className="mt-0.5 text-xs font-medium text-muted">
          <Text className={cn('text-xs font-extrabold', on ? 'text-success' : 'text-faint')}>{on ? `● ${t('On')}` : `○ ${t('Off')}`}</Text> ·{' '}
          {on ? onText : offText}
        </Text>
      </View>
      {children}
    </View>
  )
}

function Line({ icon, title, sub, children }: { icon: LucideIcon; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <View className="flex-row items-center gap-3 border-t border-line p-4">
      <View className="size-9 shrink-0 items-center justify-center rounded-lg bg-canvas">
        <Icon as={icon} className="size-4 text-ink-2" />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-sm font-extrabold">{title}</Text>
        {sub && (
          <Text numberOfLines={1} className="text-xs font-medium text-muted">
            {sub}
          </Text>
        )}
      </View>
      {children}
    </View>
  )
}

function Nav({
  icon,
  title,
  sub,
  onPress,
  href,
  first,
}: {
  icon: LucideIcon
  title: string
  sub?: string
  onPress?: () => void
  href?: '/support'
  first?: boolean
}) {
  return (
    <Tappable
      onPress={onPress}
      href={href}
      className={cn('w-full flex-row items-center gap-3 p-4 active:bg-canvas active:opacity-100', !first && 'border-t border-line')}
    >
      <View className="size-9 shrink-0 items-center justify-center rounded-lg bg-canvas">
        <Icon as={icon} className="size-4 text-ink-2" />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-sm font-extrabold">{title}</Text>
        {sub && (
          <Text numberOfLines={1} className="text-xs font-medium text-muted">
            {sub}
          </Text>
        )}
      </View>
      <Icon as={ChevronRight} className="size-4 text-faint" />
    </Tappable>
  )
}
