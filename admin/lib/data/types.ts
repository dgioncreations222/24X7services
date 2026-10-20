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

/* -------------------------------------------------------------- Catalog */

/** Paise, as everywhere money is stored; shown as rupees. */
export type Paise = number

/**
 * TODO(catalog-v2): Member 1's Category. Until it lands these are local, in
 * the shape the shared CatalogAppliance already has (id, name, image, order,
 * active), so the swap is a rename.
 */
export interface Category {
  id: string
  name: string
  description: string
  /** A path under /public or a data: URL picked on this device. */
  image?: string
  order: number
  active: boolean
}

/** TODO(catalog-v2): Member 1's Service. Mirrors shared CatalogService's fields. */
export interface Service {
  id: string
  categoryId: string
  name: string
  description: string
  price: Paise
  durationMinutes: number
  included: string[]
  excluded: string[]
  images: string[]
  faqs: { q: string; a: string }[]
  order: number
  active: boolean
}

export type QuestionKind = 'options' | 'text' | 'number' | 'photo'

/**
 * TODO(catalog-v2): Member 1's Question. What the booking asks the customer
 * about this service — "Front load or top load?" — built here, not in code.
 */
export interface Question {
  id: string
  serviceId: string
  label: string
  kind: QuestionKind
  /** For `options`. */
  options: string[]
  /** For `options`: pick several rather than one. */
  multiple: boolean
  /** For `number`, e.g. "litres". */
  unit?: string
  help?: string
  required: boolean
  order: number
}

/** TODO(ratecard.ts): the shared RateCardItem proposal. */
export interface RateCardItem {
  id: string
  categoryId: string
  name: string
  price: Paise
  active: boolean
  order: number
  updatedAt: number
}

/** The shared ServiceArea: one pincode customers can book in. */
export interface ServiceArea {
  pincode: string
  city: string
  area: string
  active: boolean
}
