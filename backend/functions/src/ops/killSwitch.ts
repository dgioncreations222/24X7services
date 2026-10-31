import '../lib/options'
import { onMessagePublished } from 'firebase-functions/v2/pubsub'
import { FieldValue } from 'firebase-admin/firestore'
import { db } from '../lib/admin'
import { FLAGS_DOC, KILLABLE_FLAGS, mergeFlags } from '../lib/flags'
import { log } from '../lib/log'

/**
 * The budget kill-switch.
 *
 * The billing budget publishes its status to the `budget-alerts` Pub/Sub
 * topic several times a day. When the month's cost reaches the budget, this
 * turns off the flags for the features that cost money per use (maps, live
 * tracking, WhatsApp, SMS). Bookings, logins and everything else keep
 * working: it never touches billing itself, because disabling billing shuts
 * the whole project down.
 *
 * Turning the features back on is a manual step, written down in
 * RUNBOOKS.md, so a person decides when spending resumes.
 *
 * The budget, its email alerts and the link to the topic are set up by hand
 * in the Cloud console (RUNBOOKS.md). Until that link exists, nothing ever
 * calls this.
 */
export const BUDGET_TOPIC = 'budget-alerts'

/** The fields of a budget notification this function relies on. */
export interface BudgetNotification {
  budgetDisplayName?: string
  costAmount?: number
  budgetAmount?: number
  currencyCode?: string
}

export const onBudgetAlert = onMessagePublished(
  // A retry would only repeat a decision made from the same numbers, and the
  // budget publishes again within the hour anyway.
  { topic: BUDGET_TOPIC, retry: false, maxInstances: 1 },
  async (event) => {
    let notification: BudgetNotification
    try {
      notification = event.data.message.json as BudgetNotification
    } catch {
      log.error('killSwitch: budget message is not JSON', { messageId: event.data.message.messageId })
      return
    }
    await applyBudgetNotification(notification)
  }
)

export type KillSwitchResult = 'under-budget' | 'already-off' | 'switched-off' | 'bad-message'

/**
 * Most notifications are under budget and cost nothing beyond the call. Over
 * budget, it costs one read, and one write only the first time: once the
 * flags are off, repeat notifications find nothing to change.
 */
export async function applyBudgetNotification(n: BudgetNotification): Promise<KillSwitchResult> {
  const { costAmount, budgetAmount } = n
  if (typeof costAmount !== 'number' || typeof budgetAmount !== 'number' || budgetAmount <= 0) {
    log.error('killSwitch: budget message without cost or budget amount', { notification: n })
    return 'bad-message'
  }
  if (costAmount < budgetAmount) return 'under-budget'

  const ref = db().doc(FLAGS_DOC)
  const result = await db().runTransaction(async (tx): Promise<KillSwitchResult> => {
    const flags = mergeFlags((await tx.get(ref)).data())
    const toTurnOff = KILLABLE_FLAGS.filter((name) => flags[name])
    if (toTurnOff.length === 0) return 'already-off'

    tx.set(
      ref,
      {
        ...Object.fromEntries(toTurnOff.map((name) => [name, false])),
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: 'kill-switch',
      },
      { merge: true }
    )
    tx.create(db().collection('audit').doc(), {
      action: 'killSwitch.flagsOff',
      by: 'kill-switch',
      flags: toTurnOff,
      costAmount,
      budgetAmount,
      currencyCode: n.currencyCode ?? null,
      at: FieldValue.serverTimestamp(),
    })
    return 'switched-off'
  })

  // Logged as an error on purpose: it is what the error alert emails about.
  if (result === 'switched-off') {
    log.error('killSwitch: budget reached, paid features turned off', {
      costAmount,
      budgetAmount,
      currencyCode: n.currencyCode,
      flags: KILLABLE_FLAGS,
    })
  }
  return result
}
