'use client'

/**
 * What the console's current role may do. The matrix lives in lib/data
 * (edited in Admin Users → Permissions); the role is the signed-in admin's,
 * or the one a Super Admin is previewing. With Firebase it becomes custom
 * claims, same shape.
 */
import { useCallback, useSyncExternalStore } from 'react'
import { read, subscribe } from '../mock/db'
import { useStore } from '../store'
import type { Module, Perm } from '../types'

const roles = () => read().roles

export function useCan(): (module: Module, perm?: Perm) => boolean {
  const { as } = useStore()
  const matrix = useSyncExternalStore(subscribe, roles, roles)
  return useCallback((module: Module, perm: Perm = 'view') => !!matrix[as]?.[module]?.includes(perm), [matrix, as])
}
