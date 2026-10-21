import { useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { MailCheck } from 'lucide-react-native'
import { AuthFrame } from '@/components/auth/AuthFrame'
import { Button, Icon, Text, TextField } from '@/components/ui'
import { sendPasswordReset } from '@/lib/data'
import { useT } from '@/lib/i18n'
import { COLORS } from '@/lib/theme'

/** Forgot password: one field, one button, then "check your email". */
export default function ForgotScreen() {
  const t = useT()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send() {
    setBusy(true)
    setError(null)
    try {
      await sendPasswordReset(email)
      setSent(true)
    } catch (e) {
      setError(e instanceof Error && e.name === 'AuthError' ? e.message : t('Couldn’t send the link. Check your internet and try again.'))
    } finally {
      setBusy(false)
    }
  }

  if (sent)
    return (
      <AuthFrame title={t('Check your email')} back="/sign-in">
        <View className="items-center gap-3 py-6">
          <View className="size-16 items-center justify-center rounded-full bg-success-soft">
            <Icon as={MailCheck} className="size-8 text-success" />
          </View>
          <Text className="text-center text-base font-semibold text-ink-2">
            {t('We sent a reset link to {email}. Open it on this phone to set a new password.', { email: email.trim() })}
          </Text>
        </View>
        <Button size="lg" href="/sign-in" replace className="w-full">
          {t('Back to sign in')}
        </Button>
      </AuthFrame>
    )

  return (
    <AuthFrame title={t('Reset your password')} subtitle={t('We’ll email you a link.')} back="/sign-in">
      <TextField
        label={t('Email')}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="name@example.com"
        returnKeyType="send"
        onSubmitEditing={send}
        error={error}
      />
      <Button size="lg" disabled={busy || !email} onPress={send} className="w-full">
        {busy ? <ActivityIndicator color={COLORS.white} /> : null}
        {t('Send reset link')}
      </Button>
    </AuthFrame>
  )
}
