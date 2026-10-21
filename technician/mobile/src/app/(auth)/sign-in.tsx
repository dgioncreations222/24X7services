import { useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { Eye, EyeOff } from 'lucide-react-native'
import { AuthFrame } from '@/components/auth/AuthFrame'
import { Button, Icon, Tappable, Text, TextField } from '@/components/ui'
import { signInWithEmail, signInWithGoogle } from '@/lib/data'
import { BRAND } from '@/lib/brand'
import { useT } from '@/lib/i18n'
import { COLORS } from '@/lib/theme'

/**
 * Sign in: Continue with Google, or email and password. No OTP. A first
 * sign-in with a new account starts the partner application (the splash
 * routes on to registration); the session layer decides where to go next.
 */
export default function SignInScreen() {
  const t = useT()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState<'google' | 'email' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function run(kind: 'google' | 'email') {
    setBusy(kind)
    setError(null)
    try {
      await (kind === 'google' ? signInWithGoogle() : signInWithEmail(email, password))
    } catch (e) {
      setError(e instanceof Error && e.name === 'AuthError' ? t(e.message) : t('Couldn’t sign in. Check your internet and try again.'))
    } finally {
      setBusy(null)
    }
  }

  return (
    <AuthFrame title={t('Sign in to start taking jobs')} subtitle={t('Use your Google account or email.')}>
      <Button size="lg" variant="secondary" disabled={busy !== null} onPress={() => run('google')} className="w-full">
        {busy === 'google' ? <ActivityIndicator color={COLORS.ink} /> : <GoogleMark />}
        {t('Continue with Google')}
      </Button>

      <View className="flex-row items-center gap-3">
        <View className="h-px flex-1 bg-line" />
        <Text className="text-xs font-bold uppercase tracking-wider text-faint">{t('or')}</Text>
        <View className="h-px flex-1 bg-line" />
      </View>

      <TextField
        label={t('Email')}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        placeholder="name@example.com"
        returnKeyType="next"
      />
      <View>
        <TextField
          label={t('Password')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!show}
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          placeholder={t('At least 6 characters')}
          returnKeyType="go"
          onSubmitEditing={() => run('email')}
          error={error}
        />
        <Tappable
          accessibilityLabel={show ? t('Hide password') : t('Show password')}
          onPress={() => setShow((v) => !v)}
          className="absolute right-1 top-7 size-12 items-center justify-center"
        >
          <Icon as={show ? EyeOff : Eye} className="size-5 text-muted" />
        </Tappable>
      </View>

      <Button size="lg" disabled={busy !== null || !email || !password} onPress={() => run('email')} className="w-full">
        {busy === 'email' ? <ActivityIndicator color={COLORS.white} /> : null}
        {t('Sign in')}
      </Button>

      <Button variant="ghost" size="lg" href="/forgot" className="self-center">
        {t('Forgot password?')}
      </Button>
      <Text className="text-center text-xs text-muted">{t('New partner? The partner desk sets up your account — call {phone}.', { phone: BRAND.partnerDesk })}</Text>
    </AuthFrame>
  )
}

/** A plain "G" disc — no third-party artwork. */
function GoogleMark() {
  return (
    <View className="size-6 items-center justify-center rounded-full border border-line-strong">
      <Text className="text-xs font-extrabold text-ink">G</Text>
    </View>
  )
}
