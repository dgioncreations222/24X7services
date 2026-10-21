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
export {
  CatalogError,
  addArea,
  deleteQuestion,
  moveCategory,
  moveQuestion,
  moveRateCardItem,
  moveService,
  saveCategory,
  saveQuestion,
  saveRateCardItem,
  saveService,
  setAreaActive,
  setCategoryActive,
  setRateCardItemActive,
  setServiceActive,
  useAreas,
  useCategories,
  useQuestions,
  useRateCard,
  useServices,
  type CategoryInput,
  type QuestionInput,
  type RateCardInput,
  type ServiceInput,
} from './catalog'
export { PermissionError, assertCan, useCan } from './permissions'
export {
  KYC_DOC_TYPES,
  PartnerError,
  addTechnician,
  approvePartner,
  bankKeyOf,
  deactivatePartner,
  findClashes,
  normalPhone,
  reactivatePartner,
  rejectPartner,
  reviewDoc,
  setPartnerSkills,
  suspendPartner,
  useKycDocs,
  useKycQueueCount,
  usePartner,
  usePartners,
  type Clash,
  type NewTechnician,
} from './technicians'
export {
  BookingError,
  LIVE_STATUSES,
  OPEN_STATUSES,
  assignTechnician,
  bill,
  cancelBooking,
  km,
  refundBooking,
  useBooking,
  useBookings,
  useCandidates,
  useUnassignedCount,
  useUrgentDispatchCount,
  type Candidate,
} from './bookings'
export { addWalletCredit, blockCustomer, CustomerError, type CustomerRow, unblockCustomer, useCustomer, useCustomerBookings, useCustomers, WALLET_CREDIT_LIMIT } from './customers'
export { useDashboard, type DashboardData } from './dashboard'
export {
  GrowthError,
  couponState,
  hideReview,
  moveBanner,
  publishReview,
  replyToReview,
  saveBanner,
  saveCoupon,
  savePlan,
  setBannerActive,
  setCouponActive,
  setPlanActive,
  useBanners,
  useCoupons,
  usePlans,
  useReviews as useAdminReviews,
  type BannerInput,
  type CouponInput,
  type CouponState,
  type PlanInput,
} from './growth'
export { audit, useAuditLog } from './audit'
export {
  SystemError,
  assignTicket,
  inviteAdmin,
  replyToTicket,
  saveSettings,
  setAdminDisabled,
  setAdminRole,
  setRolePermission,
  setTicketPriority,
  setTicketStatus,
  useAdmins,
  useRoles,
  useSettings,
  useOpenTicketCount,
  useTicket,
  useTickets,
} from './system'
export { buildReport, useReport, type Report, type ReportRow } from './reports'
export { MoneyError, approvePayouts, cashHeld, markPayoutPaid, transactions, useCashHeld, usePayouts, usePendingPayoutCount, useTransactions } from './money'
