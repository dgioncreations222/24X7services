import type { Href } from 'expo-router'
import type { Session } from './data'

/**
 * Which screens a session may see, and where to send it otherwise. The
 * splash uses `homeFor`; AppShell checks every navigation with `redirectFor`.
 */
export const AUTH_ROUTES = ['/sign-in', '/forgot'] as const
export const ONBOARDING_ROUTES = ['/register', '/kyc', '/kyc-status'] as const

const is = (list: readonly string[], path: string) => list.includes(path)

/** Where someone with this session starts. */
export function homeFor(s: Session): Href {
  switch (s.status) {
    case 'signed_out':
      return '/sign-in'
    case 'registering':
      return '/register'
    case 'kyc_required':
      return '/kyc'
    case 'active':
      return '/home'
    default:
      return '/kyc-status'
  }
}

/** Null when `path` is fine for this session, else where to go instead. */
export function redirectFor(s: Session, path: string): Href | null {
  if (path === '/' || (__DEV__ && path.startsWith('/dev'))) return null
  // The old sign-in screen stays in the repo; its route leads to the new one.
  if (path.startsWith('/login')) return homeFor(s)
  const allowed: Record<Session['status'], (p: string) => boolean> = {
    signed_out: (p) => is(AUTH_ROUTES, p),
    registering: (p) => p === '/register',
    kyc_required: (p) => p === '/kyc' || p === '/register',
    kyc_rejected: (p) => p === '/kyc' || p === '/kyc-status',
    kyc_pending: (p) => p === '/kyc-status',
    suspended: (p) => p === '/kyc-status',
    approved: (p) => p === '/kyc-status',
    active: (p) => !is(AUTH_ROUTES, p) && (!is(ONBOARDING_ROUTES, p) || p === '/kyc-status'),
  }
  return allowed[s.status](path) ? null : homeFor(s)
}

/** Screens drawn without the work-app chrome (menu, job popups). */
export function isBare(path: string): boolean {
  return path === '/' || path.startsWith('/login') || is(AUTH_ROUTES, path) || is(ONBOARDING_ROUTES, path)
}
