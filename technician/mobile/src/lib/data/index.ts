/**
 * Everything a screen needs to read or change data. Screens import from
 * `@/lib/data` only — never lib/seed, lib/store or lib/mock — so swapping the
 * mock for Firebase changes this folder and not a single screen.
 */
export { useResource, type Query } from './query'
export {
  JobStepError,
  acceptJob,
  addExtra,
  completeJob,
  markArrived,
  markOnTheWay,
  rejectJob,
  startJob,
  canAddPhoto,
  uploadPhoto,
  useJob,
  useJobs,
  useRateCard,
} from './jobs'
export { setOnline, useEarnings, usePayouts, useProfile, useRatingSummary, useReviews, type RatingSummary } from './account'
export { markAllNotificationsRead, markNotificationRead, useNotifications, useUnreadCount } from './notifications'
export { TicketError, raiseTicket, useFaqs, useTickets } from './support'
export { useDeviceSettings } from './settings'
export {
  AuthError,
  REQUIRED_DOCS,
  changePassword,
  register,
  sendPasswordReset,
  signInWithEmail,
  signInWithGoogle,
  signOut,
  startWorking,
  submitKyc,
  uploadKycDocument,
  useCategories,
  useCities,
  useKyc,
  useSession,
  type KycState,
} from './auth'
export { NetworkError } from '../mock/api'
export type * from './types'
