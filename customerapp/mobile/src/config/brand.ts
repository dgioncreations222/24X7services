/**
 * Everything that changes when the app is renamed. Nothing else in the codebase
 * should contain the product name as a literal.
 */

export const brand = {
  /** PLACEHOLDER until the lead confirms the final name; every screen reads it from here. */
  name: 'Customer Service',
  fullName: 'Customer Service',
  /** The name in file names and other places a space does not belong. */
  slug: 'customer-service',
  tagline: 'Home appliance repair, done right',

  /** A text wordmark, not an image — see BRAND_LOGOS_ENABLED below. */
  wordmark: 'Customer Service',

  /** DECISION NEEDED: must match the Play Console package before first upload. */
  androidAppId: 'com.twentyfourseven.services',

  supportEmail: 'support@example.com',

  /**
   * The public link a referral share points at. Kept on the live domain:
   * a placeholder must never reach a link a customer sends to a friend.
   * TODO: final domain decide hone pe change karna.
   */
  appUrl: 'https://24x7.app',
} as const

/**
 * Supported brands appear as text wordmarks, never as logos.
 *
 * DECISION NEEDED: this flips to true only once an authorised partner
 * agreement exists. Using a manufacturer's logo without one implies an
 * endorsement the business does not have.
 */
export const BRAND_LOGOS_ENABLED = false

/**
 * Shown wherever manufacturer names appear: the Brand step, the Trusted Brands
 * row on Home, and the About section.
 */
export const BRAND_DISCLAIMER =
  'Independent service provider. Not affiliated with or endorsed by any appliance manufacturer. Brand names and logos are used only to identify appliances we service.'

/**
 * The same sentence, naming the brands actually on screen.
 *
 * The list used to be typed out here, which meant it was wrong the first time
 * a brand was added to the catalog and right again only if somebody
 * remembered. Built from what is being shown, it cannot drift.
 */
export function brandDisclaimer(names: readonly string[]): string {
  if (names.length === 0) return BRAND_DISCLAIMER
  const listed =
    names.length === 1
      ? names[0]
      : `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`
  return (
    'Independent service provider. Not affiliated with or endorsed by ' +
    `${listed}. Brand names and logos are used only to identify appliances ` +
    'we service.'
  )
}

/**
 * Shown on the Appliance Details step. A third-party repair can void a
 * manufacturer warranty, and the customer needs to know that before booking,
 * not after.
 */
export const MANUFACTURER_WARRANTY_NOTICE =
  'If your appliance is still under manufacturer warranty, a third-party repair may affect that warranty. Please check with the manufacturer first.'

/**
 * The promises the app repeats across screens. Deliberately free of anything
 * absolute — no guarantees, no percentages nobody measures.
 */
export const TRUST_POINTS = [
  { key: 'pricing', label: 'Transparent pricing' },
  { key: 'verified', label: 'Verified technicians' },
  { key: 'no-hidden', label: 'No hidden charges' },
  { key: 'approval', label: 'Repairs only after your approval' },
  { key: 'warranty', label: 'Service warranty' },
  { key: 'invoice', label: 'Digital GST invoice' },
  { key: 'support', label: '24/7 support' },
] as const
