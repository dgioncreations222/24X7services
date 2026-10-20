'use client'

/**
 * What the signed-in admin's role may do. The role matrix is edited in Admin
 * Users → Permissions and still lives in lib/store; this keeps new pages off
 * the store. With Firebase it becomes custom claims, same shape.
 */
import { useStore } from '../store'
import type { Module, Perm } from '../types'

export function useCan(): (module: Module, perm?: Perm) => boolean {
  return useStore().can
}
