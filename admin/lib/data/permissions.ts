'use client'

/**
 * What the console's current role may do. The matrix lives in lib/data
 * (edited in Admin Users → Permissions); the role is the signed-in admin's,
 * or the one a Super Admin is previewing. With Firebase it becomes custom
 * claims, same shape.
 */
import { useCallback, useSyncExternalStore } from 'react'
import { mockRequest } from '../mock/api'
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

/** A permission an action needs; 'super' means a Super Admin only. */
export type Need = readonly [Module, Perm] | 'super'

/** The signed-in admin, if their own role meets any one of `needs`; otherwise it throws. */
export function assertCanAny(needs: readonly Need[]) {
  const me = currentAdmin()
  if (!me) throw new PermissionError('Sign in again to do this.')
  if (me.role === 'Super Admin') return me
  const ok = needs.some((n) => n !== 'super' && !!read().roles[me.role]?.[n[0]]?.includes(n[1]))
  if (!ok) throw new PermissionError(needs.includes('super') && needs.length === 1 ? 'Only a Super Admin can do this.' : 'Your role cannot do this. Ask a Super Admin.')
  return me
}

/**
 * An action behind a permission: like mockRequest, but the role is checked
 * first, inside the action, as the backend rules will — a page hiding a
 * button is not the gate.
 */
export function guarded<T>(need: Need | readonly Need[], work: () => T): Promise<T> {
  const needs: readonly Need[] = need === 'super' || typeof need[0] === 'string' ? [need as Need] : (need as readonly Need[])
  return mockRequest(() => {
    assertCanAny(needs)
    return work()
  })
}
