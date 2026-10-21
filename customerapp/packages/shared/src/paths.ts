/**
 * Firestore collection paths and Storage paths, in one place. The rules file,
 * the seed, the functions and the frontend services all point at the same
 * strings, so a renamed collection cannot half-land.
 */

export const COL = {
  catalogAppliances: 'catalogAppliances',
  catalogServices: 'catalogServices',
  catalogBrands: 'catalogBrands',
  brandApplianceMatrix: 'brandApplianceMatrix',
  catalogIssues: 'catalogIssues',
  diagnosisRules: 'diagnosisRules',
  banners: 'banners',
  popularServices: 'popularServices',
  serviceAreas: 'serviceAreas',
  searchIndex: 'searchIndex',
  config: 'config',
  users: 'users',
  /** One per technician (the shared Partner shape), keyed by uid. */
  technicians: 'technicians',
  technicianPublic: 'technicianPublic',
  /** A technician's KYC documents; the files are in Storage. */
  kycDocuments: 'kycDocuments',
  /**
   * PAN, phone, email, bank and UPI keys -> technician, written and read only
   * by functions, so one person cannot be added twice (or back while inactive).
   */
  technicianIdentity: 'technicianIdentity',
  /** Weekly payouts, written by the scheduled payout function. */
  payouts: 'payouts',
  rateCard: 'rateCard',
  slots: 'slots',
  bookings: 'bookings',
  tracking: 'tracking',
  invoices: 'invoices',
  /** One per customer, keyed by uid, with the ledger underneath it. */
  wallets: 'wallets',
  /**
   * A top-up we raised an order for, keyed by the Razorpay order id. It is
   * what tells the webhook and the verify call whose balance to move and by
   * how much, so neither has to take an amount from the client.
   */
  topupOrders: 'topupOrders',
  /**
   * A purchase we raised an order for, keyed by the Razorpay order id. Same
   * job as topupOrders and the same reason for existing: it says what was
   * bought and for how much, so nothing that arrives with the confirmation
   * has to be believed.
   */
  purchaseOrders: 'purchaseOrders',
  /** Plans on offer. Public to read, written by the seed. */
  catalogPlans: 'catalogPlans',
  /** A plan somebody has paid for. */
  userPlans: 'userPlans',
  /** One membership per customer, keyed by uid. */
  memberships: 'memberships',
  /** Keyed by the code, which is the card. */
  giftCards: 'giftCards',
  /** One per customer, keyed by uid: their code, and whose they used. */
  referrals: 'referrals',
  /** code -> uid, so a code can be resolved without scanning. */
  referralCodes: 'referralCodes',
  warranties: 'warranties',
  reviews: 'reviews',
  /**
   * The half of a review everyone is allowed to read.
   *
   * Same arrangement as technicians and technicianPublic: the review itself
   * carries a uid and a booking id and stays private, and this carries the
   * score, the words and a first name. Written only by submitReview.
   */
  serviceReviews: 'serviceReviews',
  supportTickets: 'supportTickets',
  waitlist: 'waitlist',
  notifications: 'notifications',
  counters: 'counters',
  processedWebhookEvents: 'processedWebhookEvents',
} as const

export const SUB = {
  addresses: 'addresses',
  appliances: 'appliances',
  events: 'events',
  repairRequests: 'repairRequests',
  private: 'private',
  messages: 'messages',
  items: 'items',
  ledger: 'ledger',
} as const

export const DOC = {
  businessConfig: 'business',
  privateConfig: 'private',
  otp: 'otp',
  invoiceCounter: 'invoice',
  bookingCounter: 'booking',
} as const

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

export const storagePaths = {
  /** Issue photos and video attached to a booking. */
  bookingMedia(uid: string, bookingId: string, fileName: string): string {
    return `users/${uid}/bookings/${bookingId}/${fileName}`
  },
  /** Photo of the model sticker on a saved appliance. */
  applianceMedia(uid: string, fileName: string): string {
    return `users/${uid}/appliances/${fileName}`
  },
  /** Attachments on a support message. */
  supportMedia(uid: string, ticketId: string, fileName: string): string {
    return `users/${uid}/support/${ticketId}/${fileName}`
  },
  /** Generated GST invoice PDF. Written by functions, read by the owner. */
  invoice(uid: string, invoiceId: string): string {
    return `users/${uid}/invoices/${invoiceId}.pdf`
  },
  /**
   * Media the customer attached before signing in has no uid yet. It is staged
   * here by the client and moved under the user once `createBooking` returns.
   */
  draftMedia(uid: string, fileName: string): string {
    return `users/${uid}/drafts/${fileName}`
  },
} as const
