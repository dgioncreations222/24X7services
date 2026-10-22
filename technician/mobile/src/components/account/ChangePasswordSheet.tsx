import { useState } from 'react'
import { View } from 'react-native'
import { CircleCheck } from 'lucide-react-native'
import { changePassword } from '@/lib/data'
import { useT } from '@/lib/i18n'
import { Icon } from '../base/Icon'
import { Text } from '../base/Text'
import { Button } from '../ui/Button'
import { Sheet } from '../ui/Sheet'
import { TextField } from '../ui/TextField'

/** Current password, then the new one twice. Only for accounts that sign in with email. */
export function ChangePasswordSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [again, setAgain] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  function close() {
    onClose()
    setCurrent('')
    setNext('')
    setAgain('')
    setError(null)
    setDone(false)
  }

  async function save() {
    if (next !== again) return setError(t('The two new passwords do not match.'))
    setBusy(true)
    setError(null)
    try {
      await changePassword(current, next)
      setDone(true)
    } catch (e) {
      setError(e instanceof Error && e.name === 'AuthError' ? t(e.message) : t('Couldn’t reach the server. Try again.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={close} title={t('Change password')}>
      {done ? (
        <View className="items-center py-4">
          <Icon as={CircleCheck} className="size-12 text-success" />
          <Text className="mt-3 text-center text-lg font-extrabold">{t('Password changed')}</Text>
          <Button size="lg" className="mt-5 w-full" onPress={close}>
            {t('Done')}
          </Button>
        </View>
      ) : (
        <View className="gap-4">
          <TextField label={t('Current password')} value={current} onChangeText={setCurrent} secureTextEntry autoCapitalize="none" autoComplete="current-password" />
          <TextField label={t('New password')} value={next} onChangeText={setNext} secureTextEntry autoCapitalize="none" autoComplete="new-password" placeholder={t('At least 6 characters')} />
          <TextField label={t('New password again')} value={again} onChangeText={setAgain} secureTextEntry autoCapitalize="none" autoComplete="new-password" error={error} />
          <Button size="lg" className="w-full" disabled={busy || !current || next.length < 6 || !again} onPress={() => void save()}>
            {busy ? t('Saving…') : t('Change password')}
          </Button>
        </View>
      )}
    </Sheet>
  )
}
