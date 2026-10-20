/**
 * The admin console's data shapes. Pages built on lib/data use these and
 * nothing from lib/types, lib/seed or lib/store.
 *
 * Each admin phase adds its shapes here. What the customer app's
 * packages/shared already defines will come from there, type-only, the way
 * technician/mobile does it; what is local is marked TODO with where it
 * belongs once the lead merges it.
 */
import type { AdminRole } from '../types'

export type { AdminRole }

/* -------------------------------------------------------------- Sign-in */

/** TODO(shared/admin.ts): an admin user, as sign-in and the shell need it. */
export interface AdminAccount {
  id: string
  name: string
  email: string
  role: AdminRole
  status: 'active' | 'invited' | 'disabled'
}

/**
 * Who is using the console. `loading` until the device's saved session has
 * been read — on the server, and for the first client render.
 */
export type AdminSession =
  | { status: 'loading' }
  | { status: 'signed_out' }
  | { status: 'signed_in'; admin: AdminAccount; provider: 'google' | 'email' }
