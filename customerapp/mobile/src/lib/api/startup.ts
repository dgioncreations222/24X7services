import { useEffect, useState } from 'react'

import { demoMode } from '@/lib/firebase'
import { loadDemoData } from '@/lib/demo'

/**
 * What the app does at boot, before the first screen draws.
 */

/**
 * Holds the app back until the demo catalog is in Firestore's cache — an
 * offline read of an empty cache comes back empty at once, and a screen would
 * settle on "nothing here" instead of waiting. Free outside demo mode.
 */
export function useDemoData(): 'loading' | 'ready' | 'failed' {
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>(demoMode ? 'loading' : 'ready')
  useEffect(() => {
    if (!demoMode) return
    loadDemoData().then(
      () => setState('ready'),
      (error) => {
        console.error('[demo] bundle failed to load', error)
        setState('failed')
      }
    )
  }, [])
  return state
}
