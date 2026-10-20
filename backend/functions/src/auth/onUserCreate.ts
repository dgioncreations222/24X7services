import * as functionsV1 from 'firebase-functions/v1'
import { logger } from 'firebase-functions'
import { FieldValue } from 'firebase-admin/firestore'
import { auth, db } from '../lib/admin'
import { REGION } from '../lib/options'
import { isRole, type Role } from '../lib/roles'

/**
 * Runs once for every new account (Google or email/password) and does the two
 * things a client must not be able to do for itself:
 *
 * 1. Set the `role` claim. Every sign-up is a customer; partner and admin are
 *    granted later by scripts/setRole.ts. The app has to refresh its ID token
 *    (`getIdToken(true)`) to see the claim; until then the rules treat a
 *    missing role as customer, so nothing breaks in the gap.
 * 2. Write the half of users/{uid} the rules do not let the client write:
 *    email and role come from the auth account, not from anything typed.
 *
 * The trigger is asynchronous and can run late, so it never overwrites
 * anything that got there first: a role granted by setRole.ts, or a name and
 * photo the customer already saved on the profile screen.
 *
 * This is a 1st-generation trigger because 2nd-generation functions only offer
 * blocking auth triggers, which need Identity Platform enabled on the project.
 * It is pinned to Mumbai with the rest of the backend. setGlobalOptions does
 * not reach 1st-generation functions, so the instance cap is set here too.
 *
 * Retries are on: a 1st-generation trigger that throws is otherwise never run
 * again, and the user would be left without email, role or createdAt, which
 * the rules do not let the app fill in. Every step below is safe to repeat.
 * Retries stop after MAX_RETRY_AGE_MS: a failure that persists that long is a
 * bug or a misconfiguration, and retrying it for the platform's full seven
 * days would only multiply invocations and billed reads and writes. An
 * account left half set up is repaired by running setRole.ts on it.
 */
const MAX_RETRY_AGE_MS = 10 * 60 * 1000

export const onUserCreate = functionsV1
  .region(REGION)
  .runWith({ maxInstances: 20, failurePolicy: true })
  .auth.user()
  .onCreate(async (user, context) => {
    const ageMs = Date.now() - Date.parse(context.timestamp)
    if (ageMs > MAX_RETRY_AGE_MS) {
      logger.error('onUserCreate: giving up on a stale retry', { uid: user.uid, ageMs })
      return
    }

    // users/{uid}.role is the source of truth: setRole.ts writes it first, and
    // the rules check it for admin. This trigger only fills a role that is not
    // there yet, so a late or duplicated run never undoes a role change.
    const ref = db().collection('users').doc(user.uid)
    const role = await db().runTransaction(async (tx): Promise<Role> => {
      const current = (await tx.get(ref)).data() ?? {}
      const docRole: Role = isRole(current.role) ? current.role : 'customer'

      tx.set(
        ref,
        {
          email: user.email ?? undefined,
          role: docRole,
          // Prefill from the Google profile only where the customer has not
          // already set something, and only with values the rules accept, so
          // the customer can still edit the rest of their profile afterwards.
          name: current.name ?? displayName(user.displayName, 80),
          photoUrl: current.photoUrl ?? httpsUrl(user.photoURL, 500),
          createdAt: current.createdAt ?? FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      )
      return docRole
    })

    // The event carries the account as it was at creation, so read the claims
    // fresh, and only set one if setRole.ts has not already done so.
    const { customClaims } = await auth().getUser(user.uid)
    if (!isRole(customClaims?.role)) {
      await auth().setCustomUserClaims(user.uid, { ...customClaims, role })
    }

    logger.info('onUserCreate: new account', {
      uid: user.uid,
      role,
      provider: user.providerData[0]?.providerId,
    })
  })

/**
 * Trimmed to the rules' limit without cutting an emoji in half: whole code
 * points are kept, and the result is at most maxLen UTF-16 units, which is
 * the stricter of the two ways the length could be counted.
 */
function displayName(v: string | undefined, maxLen: number): string | undefined {
  const chars = Array.from(v?.trim() ?? '')
  while (chars.join('').length > maxLen) chars.pop()
  return chars.join('') || undefined
}

/**
 * A URL the rules would reject (too long, or not https) is dropped rather
 * than stored: the rules validate the whole document on every update, so one
 * bad value here would block the customer from ever editing their profile.
 */
function httpsUrl(v: string | undefined, maxLen: number): string | undefined {
  return v && v.length <= maxLen && v.startsWith('https://') && v.length > 8 ? v : undefined
}
