/** Customers for the mock, from the old console's seed. */
import { seed } from '../seed'
import type { AdminCustomer } from '../data/types'

export function seedCustomers(now = Date.now()): { customers: AdminCustomer[] } {
  return {
    customers: seed(now).customers.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      area: c.area,
      addresses: c.addresses,
      joinedAt: new Date(c.joinedAt).getTime(),
      status: c.status,
      blockReason: c.status === 'blocked' ? 'Three no-shows in a month; technicians reported abusive calls.' : undefined,
      walletCredit: Math.round(c.walletCredit * 100),
      referralCode: c.referralCode,
      referrals: c.referrals,
    })),
  }
}
