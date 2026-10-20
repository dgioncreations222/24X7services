import * as functionsV1 from 'firebase-functions/v1'
import { logger } from 'firebase-functions'
import { FieldValue } from 'firebase-admin/firestore'
import { auth, db } from '../lib/admin'
import { REGION } from '../lib/options'
import type { Role } from '../lib/roles'

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
 * This is a 1st-generation trigger because 2nd-generation functions only offer
 * blocking auth triggers, which need Identity Platform enabled on the project.
 * It is pinned to Mumbai with the rest of the backend.
 */
export const onUserCreate = functionsV1
  .region(REGION)
  .auth.user()
  .onCreate(async (user) => {
    const role: Role = 'customer'

    await auth().setCustomUserClaims(user.uid, { role })

    await db()
      .collection('users')
      .doc(user.uid)
      .set(
        {
          email: user.email ?? undefined,
          // Prefill from the Google profile. Trimmed to what the rules accept
          // so the customer can still edit the rest of their profile.
          name: user.displayName?.trim().slice(0, 80) || undefined,
          photoUrl: user.photoURL ?? undefined,
          role,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        // Merge, because the profile screen may have written first.
        { merge: true }
      )

    logger.info('onUserCreate: new customer', {
      uid: user.uid,
      provider: user.providerData[0]?.providerId,
    })
  })
