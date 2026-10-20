/**
 * Everything a page needs to read or change data. New pages import from
 * `@/lib/data` only — never lib/seed, lib/store or lib/mock — so swapping the
 * mock for Firebase changes this folder and not a single page.
 *
 * The older pages still read lib/store; each admin phase moves its pages here.
 */
export { useResource, type Query } from './query'
export { AuthError, signInWithEmail, signInWithGoogle, signOut, useAdminSession } from './auth'
export { NetworkError } from '../mock/api'
export type * from './types'
