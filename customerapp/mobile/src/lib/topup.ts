
import { formatPaise, type Paise } from '@app/shared'
import { callFn } from './callables'
import { CheckoutDismissed, openCheckout } from './checkout'
import { brand } from '@/config/brand'

/**
 * Putting money into the balance, from the customer's side.
 *
 * Three calls, the same three the booking payment makes: raise the order, open
 * the sheet, tell the server what came back. The amount is sent once, to raise
 * the order, and is bounded by the server before it reaches the gateway; every
 * later step reads it off the record the server wrote, so nothing here can
 * credit a balance by asking nicely.
 */

export type TopupOutcome =
  /** Money arrived. `balance` is what the account holds now. */
  | { kind: 'added'; balance: Paise }
  /** The sheet was closed. Nothing was charged and nothing is wrong. */
  | { kind: 'cancelled' }

export async function topUp(
  amount: Paise,
  customer?: { name?: string; phone?: string }
): Promise<TopupOutcome> {
  const order = await callFn('createTopupOrder', { amount })

  let result
  try {
    result = await openCheckout({
      keyId: order.keyId,
      orderId: order.orderId,
      amountPaise: order.amount,
      description: `${formatPaise(order.amount)} to your ${brand.name} balance`,
      customerName: customer?.name,
      customerPhone: customer?.phone,
    })
  } catch (error) {
    // Closing the sheet is not a failure and must not be reported as one. Any
    // other error is: it means the sheet could not be opened at all.
    if (error instanceof CheckoutDismissed) return { kind: 'cancelled' }
    throw error
  }

  // There is no 'unsettled' outcome here, unlike a booking payment. If this
  // call fails after a capture, the webhook still credits the balance from
  // the same order record with the same movement id — the money is not lost,
  // it is just slower to appear, and the screen says so.
  const verified = await callFn('verifyTopup', result)
  return { kind: 'added', balance: verified.balance }
}
