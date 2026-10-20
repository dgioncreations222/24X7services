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
 */
export const onUserCreate = functionsV1
  .region(REGION)
  .runWith({ maxInstances: 20, failurePolicy: true })
  .auth.user()
  .onCreate(async (user) => {
    // The event carries the account as it was at creation, so its claims are
    // almost always empty. Read them fresh, or a role granted by setRole.ts in
    // the meantime would be overwritten.
    const { customClaims } = await auth().getUser(user.uid)
    const existingRole = customClaims?.role
    const role: Role = isRole(existingRole) ? existingRole : 'customer'

    if (!isRole(existingRole)) {
      await auth().setCustomUserClaims(user.uid, { ...customClaims, role })
    }

    const ref = db().collection('users').doc(user.uid)
    await db().runTransaction(async (tx) => {
      const current = (await tx.get(ref)).data() ?? {}

      tx.set(
        ref,
        {
          email: user.email ?? undefined,
          // The claim is the source of truth; the document mirrors it.
          role,
          // Prefill from the Google profile only where the customer has not
          // already set something, and only with values the rules accept, so
          // the customer can still edit the rest of their profile afterwards.
          name: current.name ?? (user.displayName?.trim().slice(0, 80) || undefined),
          photoUrl: current.photoUrl ?? fitsRules(user.photoURL, 500),
          createdAt: current.createdAt ?? FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      )
    })

    logger.info('onUserCreate: new account', {
      uid: user.uid,
      role,
      provider: user.providerData[0]?.providerId,
    })
  })

/** A string the rules would reject is dropped rather than stored. */
function fitsRules(v: string | undefined, maxLen: number): string | undefined {
  return v && v.length <= maxLen ? v : undefined
}
