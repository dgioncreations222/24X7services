/**
 * What the network services — and nothing else. Every picker,
 * filter and price table in the console is built from these tables, so a brand or
 * appliance that is not here cannot turn up anywhere on screen.
 */

export const BRANDS = ['samsung', 'lg', 'bosch', 'ifb'] as const
export type Brand = (typeof BRANDS)[number]

export const BRAND_LABEL: Record<Brand, string> = {
  samsung: 'Samsung',
  lg: 'LG',
  bosch: 'Bosch',
  ifb: 'IFB',
}

export const APPLIANCES = ['washer', 'fridge', 'oven', 'ac', 'geyser'] as const
export type Appliance = (typeof APPLIANCES)[number]

export const APPLIANCE_LABEL: Record<Appliance, string> = {
  washer: 'Washing Machine',
  fridge: 'Refrigerator',
  oven: 'Oven',
  ac: 'AC',
  geyser: 'Geyser',
}

/** Visit + labour, before parts. Applied when a bill is first opened. */
export const LABOUR_RATE: Record<Appliance, number> = {
  washer: 549,
  fridge: 649,
  oven: 499,
  ac: 699,
  geyser: 449,
}

export function applianceTitle(brand: Brand, appliance: Appliance): string {
  return `${BRAND_LABEL[brand]} ${APPLIANCE_LABEL[appliance]}`
}

export const inr = (n: number) =>
  '₹' + Math.round(n).toLocaleString('en-IN')
