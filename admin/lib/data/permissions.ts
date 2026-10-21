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
import { currentAdmin } from './auth'

const roles = () => read().roles

export function useCan(): (module: Module, perm?: Perm) => boolean {
  const { as } = useStore()
  const matrix = useSyncExternalStore(subscribe, roles, roles)
  return useCallback((module: Module, perm: Perm = 'view') => !!matrix[as]?.[module]?.includes(perm), [matrix, as])
}

/** Thrown by an action the signed-in admin's role may not take. */
export class PermissionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PermissionError'
  }
}

/**
 * Inside an action: the signed-in admin, if their own role (not a role a
 * Super Admin is previewing) may do this; otherwise it throws. Pages hide what
 * a role cannot do, but the action checks again, as the backend rules will.
 */
export function assertCan(module: Module, perm: Perm) {
  const me = currentAdmin()
  if (!me) throw new PermissionError('Sign in again to do this.')
  if (me.role !== 'Super Admin' && !read().roles[me.role]?.[module]?.includes(perm)) throw new PermissionError('Your role cannot do this. Ask a Super Admin.')
  return me
}
