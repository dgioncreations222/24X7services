import type { Address } from '@app/shared/catalog-v2'

import { ADDRESSES, COUPONS, USER, type Coupon, type MockUser } from '@/lib/mock/account'
import { todayKey } from '@/lib/format'
import { mockRequest } from '@/lib/mock/request'
import { useAsync, type AsyncState } from '@/lib/useAsync'

export type { Coupon }
/** The profile the account screens show. */
export type AccountUser = MockUser

/**
 * The signed-in customer's own things. Same split as lib/data/catalog: async
 * functions the backend swap replaces, and hooks the screens call.
 */

export function fetchUser(): Promise<AccountUser> {
  return mockRequest(USER)
}

/** Saved addresses, the default first. */
export function fetchAddressBook(): Promise<Address[]> {
  return mockRequest([...ADDRESSES].sort((a, b) => Number(b.isDefault) - Number(a.isDefault)))
}

/**
 * Offers that have not expired, soonest to expire first. "Today" is the date in
 * India (todayKey), not toISOString(), which is UTC and would keep a coupon
 * that ended at midnight live until 5:30 in the morning.
 */
export function fetchCoupons(today: string = todayKey()): Promise<Coupon[]> {
  const live = COUPONS.filter((c) => c.expiresAt >= today).sort((a, b) => a.expiresAt.localeCompare(b.expiresAt))
  return mockRequest(live)
}

export function useUser(): AsyncState<AccountUser> {
  return useAsync(fetchUser)
}

export function useAddresses(): AsyncState<Address[]> {
  return useAsync(fetchAddressBook)
}

export function useCoupons(): AsyncState<Coupon[]> {
  return useAsync(fetchCoupons)
}
