/**
 * This phone's settings: app language and which alerts to show. They live on
 * the device (lib/store) rather than the server, so they need no loading
 * state and stay the same with Firebase.
 */
import { useCallback } from 'react'
import { useStore } from '../store'
import type { DeviceSettings } from './types'

export function useDeviceSettings(): [DeviceSettings, (patch: Partial<DeviceSettings>) => void] {
  const { settings, updateSettings } = useStore()
  const update = useCallback(
    (patch: Partial<DeviceSettings>) => updateSettings((cur) => ({ ...patch, notify: { ...cur.notify, ...patch.notify } })),
    [updateSettings]
  )
  return [{ language: settings.language, notify: settings.notify }, update]
}
