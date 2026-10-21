'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { mockRequest } from '../mock/api'
import { read, subscribe, type MockDb } from '../mock/db'

/** What every lib/data hook returns — the one shape pages render from. */
export interface Query<T> {
  /** Undefined until the first load succeeds. */
  data: T | undefined
  loading: boolean
  error: Error | null
  /** Load again, e.g. from an error state's Try again. */
  refetch: () => void
}

type Phase = { phase: 'loading' | 'ready' | 'error'; error: Error | null; attempt: number }

/**
 * Loads once through the mock network (so the page shows its skeleton, or
 * its error), then follows the data live: a write anywhere re-renders every
 * page reading it, with no reload.
 *
 * With Firebase this becomes a Firestore listener; the returned shape stays.
 */
export function useResource<T>(select: (db: MockDb) => T): Query<T> {
  const snapshot = useSyncExternalStore(subscribe, read, read)
  const [state, setState] = useState<Phase>({ phase: 'loading', error: null, attempt: 0 })

  useEffect(() => {
    let live = true
    mockRequest(() => undefined).then(
      () => live && setState((s) => ({ ...s, phase: 'ready', error: null })),
      (e: unknown) => live && setState((s) => ({ ...s, phase: 'error', error: e instanceof Error ? e : new Error(String(e)) }))
    )
    return () => {
      live = false
    }
  }, [state.attempt])

  return {
    data: state.phase === 'ready' ? select(snapshot) : undefined,
    loading: state.phase === 'loading',
    error: state.error,
    refetch: () => setState((s) => ({ phase: 'loading', error: null, attempt: s.attempt + 1 })),
  }
}
