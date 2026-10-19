import { useEffect, useRef, useState } from 'react'
import { KeyboardAvoidingView, Linking, Platform, ScrollView, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, {
  Easing,
  FadeIn,
  ReduceMotion,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import { StatusBar } from 'expo-status-bar'
import { router } from 'expo-router'
import { Eye, EyeOff, Fingerprint, Headset, KeyRound, Lock, ShieldCheck, Smartphone } from 'lucide-react-native'
import { Logo } from '@/components/Logo'
import { Button, Field, Icon, Segmented, Sheet, Tappable, Text, Toggle, inputClass } from '@/components/ui'
import { BRAND } from '@/lib/brand'
import { cn } from '@/lib/cn'
import { DEMO_OTP, TECHNICIAN } from '@/lib/seed'
import { useStore } from '@/lib/store'
import { COLORS } from '@/lib/theme'

type Mode = 'otp' | 'id'

export default function LoginScreen() {
  const store = useStore()
  const insets = useSafeAreaInsets()
  const [mode, setMode] = useState<Mode>('otp')
  const [online, setOnline] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [forgot, setForgot] = useState(false)

  useEffect(() => {
    if (store.ready && store.signedIn) router.replace('/home')
  }, [store.ready, store.signedIn])

  function done() {
    store.setOnline(online)
    store.signIn()
    router.replace('/home')
  }

  return (
    <View className="flex-1 bg-card">
      <StatusBar style="light" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView
          className="flex-1 bg-card"
          contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Brand panel */}
          <View className="overflow-hidden bg-brand-ink px-6 pb-16" style={{ paddingTop: insets.top + 32 }}>
            <View pointerEvents="none" className="absolute -right-24 -top-24 size-80 rounded-full border-[40px] border-white/[0.04]" />
            <View pointerEvents="none" className="absolute -bottom-40 -left-20 size-96 rounded-full border-[56px] border-white/[0.03]" />
            <Logo inverted />
            <View className="mt-10">
              <Text className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/50">Partner console</Text>
              <Text accessibilityRole="header" className="mt-2 max-w-md text-[28px] font-extrabold leading-[32px] tracking-tight text-white">
                Every job, from request to sign-off, in one place.
              </Text>
              <Text className="mt-3 max-w-sm text-sm font-medium text-white/65">
                Samsung, LG, Bosch and IFB washing machines, refrigerators, ovens, ACs and geysers — dispatched around the clock.
              </Text>
            </View>
          </View>

          {/* Form */}
          <View className="-mt-8 flex-1 rounded-t-3xl bg-card px-5 pt-7">
            <View className="w-full max-w-sm self-center">
              <Text accessibilityRole="header" className="text-2xl font-extrabold tracking-tight">
                Sign in
              </Text>
              <Text className="mt-1 text-sm font-medium text-muted">Verified {BRAND.name} technicians only.</Text>

              <Segmented
                className="mt-6"
                value={mode}
                onChange={setMode}
                options={[
                  { value: 'otp', label: 'Mobile OTP' },
                  { value: 'id', label: 'Technician ID' },
                ]}
              />

              <View className="mt-6">{mode === 'otp' ? <OtpForm onDone={done} /> : <IdForm onDone={done} onForgot={() => setForgot(true)} />}</View>

              <View className="my-6 flex-row items-center gap-3">
                <View className="h-px flex-1 bg-line" />
                <Text className="text-xs font-bold uppercase tracking-wider text-faint">or</Text>
                <View className="h-px flex-1 bg-line" />
              </View>

              <Tappable
                onPress={() => {
                  setScanning(true)
                  setTimeout(done, 1400)
                }}
                className="h-14 w-full flex-row items-center justify-center gap-2.5 rounded-xl border-2 border-line-strong active:border-brand active:opacity-100"
              >
                <Icon as={Fingerprint} className="size-6 text-ink" />
                <Text className="text-[15px] font-extrabold">Use fingerprint</Text>
              </Tappable>

              <View className="mt-6 flex-row items-center justify-between gap-3 rounded-xl border border-line bg-canvas px-4 py-3">
                <View className="flex-1">
                  <Text className="text-sm font-extrabold">Go online after sign-in</Text>
                  <Text className="text-xs font-medium text-muted">{online ? 'You will start receiving requests' : 'Sign in without taking jobs'}</Text>
                </View>
                <Toggle checked={online} onChange={setOnline} label="Go online after sign-in" tone="success" />
              </View>

              <View className="mt-6 flex-row items-start gap-2">
                <Icon as={ShieldCheck} className="mt-0.5 size-4 shrink-0 text-success" />
                <Text className="flex-1 text-xs font-medium leading-relaxed text-muted">
                  Your session is tied to this device. Sign-ins are logged against your technician ID.
                </Text>
              </View>
              <Tappable
                accessibilityRole="link"
                onPress={() => void Linking.openURL('tel:+914068241000').catch(() => undefined)}
                className="mt-3 flex-row items-center gap-2 self-start"
              >
                <Icon as={Headset} className="size-4 text-brand" />
                <Text className="shrink text-xs font-bold text-brand">Trouble signing in? Partner desk 040 6824 1000</Text>
              </Tappable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {scanning && (
        <Animated.View
          entering={FadeIn.duration(200).reduceMotion(ReduceMotion.System)}
          accessibilityViewIsModal
          accessibilityLiveRegion="polite"
          className="absolute inset-0 z-50 items-center justify-center bg-brand-ink/90"
        >
          <View className="items-center">
            <View className="size-28 items-center justify-center rounded-full bg-white/10">
              <PulseRing />
              <Icon as={Fingerprint} className="size-14 text-white" strokeWidth={1.4} />
            </View>
            <Text className="mt-5 text-lg font-extrabold text-white">Verifying fingerprint…</Text>
            <Text className="text-sm font-medium text-white/60">Hold your finger on the sensor</Text>
          </View>
        </Animated.View>
      )}

      <ForgotSheet open={forgot} onClose={() => setForgot(false)} />
    </View>
  )
}

/** The web's `animate-pulse-ring` behind the fingerprint. */
function PulseRing() {
  const p = useSharedValue(0)
  useEffect(() => {
    p.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.bezier(0.22, 0.61, 0.36, 1), reduceMotion: ReduceMotion.System }), -1)
    return () => cancelAnimation(p)
  }, [p])
  const style = useAnimatedStyle(() => ({ opacity: 0.7 * (1 - p.value), transform: [{ scale: 0.8 + 0.6 * p.value }] }))
  return <Animated.View pointerEvents="none" className="absolute inset-4 rounded-full bg-white/30" style={style} />
}

function OtpForm({ onDone }: { onDone: () => void }) {
  const [phone, setPhone] = useState('98855 20471')
  const [sent, setSent] = useState(false)
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''))
  const [wait, setWait] = useState(0)
  const [error, setError] = useState('')
  const boxes = useRef<(TextInput | null)[]>([])

  useEffect(() => {
    if (wait <= 0) return
    const t = setTimeout(() => setWait((w) => w - 1), 1000)
    return () => clearTimeout(t)
  }, [wait])

  const digits = phone.replace(/\D/g, '')

  function set(i: number, v: string) {
    const clean = v.replace(/\D/g, '')
    // A pasted or autofilled code lands in one box: spread it across all six.
    if (clean.length > 1) {
      const next = clean.slice(0, 6).split('')
      setOtp([...next, ...Array(6 - next.length).fill('')])
      boxes.current[Math.min(next.length, 5)]?.focus()
      return
    }
    const next = [...otp]
    next[i] = clean
    setOtp(next)
    setError('')
    if (clean && i < 5) boxes.current[i + 1]?.focus()
  }

  function verify() {
    if (otp.join('') === DEMO_OTP) onDone()
    else setError('That code doesn’t match. Check the SMS and try again.')
  }

  if (!sent)
    return (
      <View>
        <Field label="Registered mobile number">
          <View className="flex-row">
            <View className="justify-center rounded-l-xl border border-r-0 border-line-strong bg-canvas px-3">
              <Text className="text-base font-bold text-ink-2">+91</Text>
            </View>
            <TextInput
              keyboardType="number-pad"
              autoComplete="tel-national"
              textContentType="telephoneNumber"
              value={phone}
              onChangeText={setPhone}
              className={cn(inputClass, 'num flex-1 rounded-l-none font-bold tracking-wide')}
              placeholder="98xxx xxxxx"
              placeholderTextColor={COLORS.faint}
            />
          </View>
        </Field>
        <Button
          size="lg"
          className="mt-4 w-full"
          disabled={digits.length !== 10}
          onPress={() => {
            setSent(true)
            setWait(30)
            setTimeout(() => boxes.current[0]?.focus(), 50)
          }}
        >
          <Icon as={Smartphone} className="size-5" /> Send OTP
        </Button>
      </View>
    )

  return (
    <View>
      <View className="flex-row items-baseline justify-between">
        <Text className="text-sm font-bold text-ink-2">Enter the 6-digit code</Text>
        <Tappable onPress={() => setSent(false)} hitSlop={8}>
          <Text className="text-xs font-bold text-brand">Change number</Text>
        </Tappable>
      </View>
      <Text className="num mt-0.5 text-xs font-medium text-muted">Sent to +91 {phone}</Text>
      <View className="mt-3 flex-row gap-2">
        {otp.map((d, i) => (
          <TextInput
            key={i}
            ref={(el) => {
              boxes.current[i] = el
            }}
            value={d}
            keyboardType="number-pad"
            autoComplete={i === 0 ? 'sms-otp' : 'off'}
            textContentType={i === 0 ? 'oneTimeCode' : 'none'}
            accessibilityLabel={`Digit ${i + 1}`}
            maxLength={6}
            selectTextOnFocus
            onChangeText={(v) => set(i, v)}
            onKeyPress={(e) => {
              if (e.nativeEvent.key === 'Backspace' && !d && i > 0) boxes.current[i - 1]?.focus()
            }}
            onSubmitEditing={() => {
              if (otp.join('').length === 6) verify()
            }}
            className={cn(
              'num h-14 min-w-0 flex-1 rounded-xl border-2 bg-card p-0 text-center text-xl font-extrabold text-ink',
              error ? 'border-danger' : d ? 'border-ink-2' : 'border-line-strong'
            )}
          />
        ))}
      </View>
      {error ? <Text className="mt-2 text-xs font-bold text-danger">{error}</Text> : null}
      <View className="mt-3 flex-row items-center justify-between">
        <View className="rounded-md bg-warning-soft px-2 py-1">
          <Text className="text-xs font-bold text-warning">Demo OTP: {DEMO_OTP}</Text>
        </View>
        {wait > 0 ? (
          <Text className="num text-xs font-semibold text-muted">Resend in 0:{String(wait).padStart(2, '0')}</Text>
        ) : (
          <Tappable onPress={() => setWait(30)} hitSlop={8}>
            <Text className="text-xs font-bold text-brand">Resend OTP</Text>
          </Tappable>
        )}
      </View>
      <Button size="lg" className="mt-4 w-full" disabled={otp.join('').length !== 6} onPress={verify}>
        Verify & sign in
      </Button>
    </View>
  )
}

function IdForm({ onDone, onForgot }: { onDone: () => void; onForgot: () => void }) {
  const [id, setId] = useState(TECHNICIAN.id)
  const [pw, setPw] = useState('')
  const [show, setShow] = useState(false)
  const ok = id.length >= 6 && pw.length >= 6
  return (
    <View className="gap-4">
      <Field label="Technician ID">
        <View>
          <View pointerEvents="none" className="absolute bottom-0 left-3.5 top-0 z-10 justify-center">
            <Icon as={KeyRound} className="size-4 text-faint" />
          </View>
          <TextInput
            value={id}
            onChangeText={(v) => setId(v.toUpperCase())}
            autoCapitalize="characters"
            autoCorrect={false}
            className={cn(inputClass, 'num pl-10 font-bold tracking-wide')}
            placeholder="TCH-XXX-0000"
            placeholderTextColor={COLORS.faint}
          />
        </View>
      </Field>
      <Field label="Password" hint="Demo: any 6+ characters">
        <View>
          <View pointerEvents="none" className="absolute bottom-0 left-3.5 top-0 z-10 justify-center">
            <Icon as={Lock} className="size-4 text-faint" />
          </View>
          <TextInput
            secureTextEntry={!show}
            value={pw}
            onChangeText={setPw}
            autoComplete="current-password"
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={() => ok && onDone()}
            className={cn(inputClass, 'px-10')}
            placeholder="••••••••"
            placeholderTextColor={COLORS.faint}
          />
          <Tappable
            onPress={() => setShow((s) => !s)}
            accessibilityLabel={show ? 'Hide password' : 'Show password'}
            className="absolute bottom-0 right-1 top-0 w-10 items-center justify-center rounded-lg"
          >
            <Icon as={show ? EyeOff : Eye} className="size-4 text-muted" />
          </Tappable>
        </View>
      </Field>
      <View className="flex-row justify-end">
        <Tappable onPress={onForgot} hitSlop={8}>
          <Text className="text-sm font-bold text-brand">Forgot password?</Text>
        </Tappable>
      </View>
      <Button size="lg" className="w-full" disabled={!ok} onPress={onDone}>
        Sign in
      </Button>
    </View>
  )
}

function ForgotSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [sent, setSent] = useState(false)
  return (
    <Sheet
      open={open}
      onClose={() => {
        onClose()
        setSent(false)
      }}
      title="Reset password"
    >
      {sent ? (
        <View className="items-center py-4">
          <View className="size-14 items-center justify-center rounded-full bg-success-soft">
            <Icon as={ShieldCheck} className="size-7 text-success" />
          </View>
          <Text className="mt-3 text-center font-extrabold">Reset link sent</Text>
          <Text className="mt-1 text-center text-sm text-muted">Check the SMS on your registered number. The link expires in 15 minutes.</Text>
          <Button
            className="mt-5 w-full"
            onPress={() => {
              onClose()
              setSent(false)
            }}
          >
            Back to sign in
          </Button>
        </View>
      ) : (
        <View className="gap-4">
          <Text className="text-sm text-muted">We’ll send a reset link to the mobile number registered against your technician ID.</Text>
          <Field label="Technician ID">
            <TextInput defaultValue={TECHNICIAN.id} autoCapitalize="characters" className={cn(inputClass, 'num font-bold')} />
          </Field>
          <Field label="Registered mobile">
            <TextInput defaultValue="98855 20471" keyboardType="number-pad" className={cn(inputClass, 'num font-bold')} />
          </Field>
          <Button size="lg" className="w-full" onPress={() => setSent(true)}>
            Send reset link
          </Button>
        </View>
      )}
    </Sheet>
  )
}
