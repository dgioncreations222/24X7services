import type { Paise } from './data'

/** ₹1,234 — whole rupees, Indian grouping. Money is paise everywhere else. */
export function rupees(p: Paise): string {
  return `₹${Math.round(p / 100).toLocaleString('en-IN')}`
}
