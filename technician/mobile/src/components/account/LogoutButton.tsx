import { useState } from 'react'
import { View } from 'react-native'
import { LogOut } from 'lucide-react-native'
import { setOnline, signOut } from '@/lib/data'
import { useT } from '@/lib/i18n'
import { Icon } from '../base/Icon'
import { Text } from '../base/Text'
import { Button } from '../ui/Button'
import { Sheet } from '../ui/Sheet'

/**
 * Logout, asked once more first: signing out also takes the technician
 * offline. The session change sends them to sign-in (AppShell's gate).
 */
export function LogoutButton() {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  async function logout() {
    setBusy(true)
    setError(false)
    // Going offline is best effort: with no signal the server drops them
    // when the session ends anyway. Signing out itself never needs the network.
    await setOnline(false).catch(() => setError(true))
    await signOut()
  }

  return (
    <>
      <Button variant="secondary" size="lg" className="w-full border-2 border-danger/30" textClassName="text-danger" onPress={() => setOpen(true)}>
        <Icon as={LogOut} className="size-5" />
        {t('Logout')}
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title={t('Log out?')}>
        <Text className="text-base text-ink-2">{t('You’ll go offline and stop getting new requests. Jobs you accepted stay with you.')}</Text>
        {error ? (
          <Text accessibilityLiveRegion="polite" className="mt-3 text-sm font-semibold text-danger">
            {t('Couldn’t reach the server. Try again.')}
          </Text>
        ) : null}
        <View className="mt-5 flex-row gap-2.5">
          <Button variant="secondary" size="lg" className="flex-1" onPress={() => setOpen(false)}>
            {t('Cancel')}
          </Button>
          <Button variant="danger" size="lg" className="flex-1" disabled={busy} onPress={() => void logout()}>
            {busy ? t('Logging out…') : t('Logout')}
          </Button>
        </View>
      </Sheet>
    </>
  )
}
