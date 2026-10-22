/**
 * Keys that tell one person from another — phone and bank account — without
 * keeping more than needed. Shared by the data layer and the mock seed.
 */

export const digits = (s: string) => s.replace(/\D/g, '')

/** +91 and ten digits, however it was typed; empty if it is not a mobile number. */
export function normalPhone(s: string) {
  const d = digits(s).replace(/^91(?=\d{10}$)/, '')
  return d.length === 10 ? `+91${d}` : ''
}

/**
 * A one-way key for a bank account (IFSC + number), so two technicians cannot
 * share one without the number being kept. FNV-1a here; the backend uses a
 * salted SHA-256 in a Cloud Function.
 */
export function bankKeyOf(ifsc: string, accountNumber: string) {
  let h = 0x811c9dc5
  for (const ch of `${ifsc.toUpperCase()}:${digits(accountNumber)}`) {
    h ^= ch.charCodeAt(0)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return `bk-${h.toString(16)}`
}
