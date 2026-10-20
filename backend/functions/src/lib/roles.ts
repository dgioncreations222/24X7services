/**
 * The three kinds of account, stored as the `role` custom claim on the auth
 * token. firestore.rules reads the same claim, so the names here and there
 * must match.
 *
 * Every sign-up starts as a customer. A partner (technician) or admin role is
 * granted by the lead with scripts/setRole.ts, never by the app.
 */
export const ROLES = ['customer', 'partner', 'admin'] as const

export type Role = (typeof ROLES)[number]

export function isRole(v: unknown): v is Role {
  return typeof v === 'string' && (ROLES as readonly string[]).includes(v)
}
