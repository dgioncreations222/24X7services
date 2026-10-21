import { useState } from 'react'
import { useT } from '@/lib/i18n'

/**
 * Runs one job action at a time and keeps what to show while it runs:
 * `busy` for the spinner, `error` as a sentence. A JobStepError says what is
 * missing; anything else is treated as the network and says so.
 */
export function useAction() {
  const t = useT()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(action: () => Promise<unknown>, then?: () => void) {
    setBusy(true)
    setError(null)
    try {
      await action()
      then?.()
    } catch (e) {
      setError(e instanceof Error && e.name === 'JobStepError' ? e.message : t('Couldn’t reach the server. Check your internet and try again.'))
    } finally {
      setBusy(false)
    }
  }

  return { run, busy, error }
}
