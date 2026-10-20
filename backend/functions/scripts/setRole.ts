/**
 * Grant or change an account's role.
 *
 *   npm run set-role -- <email> <customer|partner|admin>            (emulator)
 *   npm run set-role -- <email> <customer|partner|admin> --project dev
 *
 * Without --project it talks to the local Auth/Firestore emulators, so trying
 * it out cannot touch real accounts. With --project it uses your own gcloud
 * login, set up once with:
 *
 *   gcloud auth application-default login
 *   gcloud auth application-default set-quota-project <projectId>
 *
 * (Firebase Auth's admin API rejects a personal login with no quota project.)
 * Only someone with
 * access to that Firebase project can run it, which is the point: roles are
 * granted from here, never by an app.
 *
 * The user's sessions are revoked so they sign in again with the new role. An
 * ID token already issued stays valid until it expires (up to an hour); the
 * rules close that gap for admin by also checking users/{uid}.role.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { isRole, ROLES } from '../src/lib/roles'

const USAGE = `Usage: npm run set-role -- <email> <${ROLES.join('|')}> [--project dev]`

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const projectFlag = args.indexOf('--project')
  const alias = projectFlag >= 0 ? args[projectFlag + 1] : undefined
  if (projectFlag >= 0 && (!alias || alias.startsWith('--'))) fail(USAGE)

  const [email, role, ...extra] = args.filter(
    (_, i) => projectFlag < 0 || (i !== projectFlag && i !== projectFlag + 1)
  )
  if (!email || !isRole(role) || extra.length > 0) fail(USAGE)

  let projectId = 'demo-customer-service'
  if (alias) {
    // An emulator variable left in the shell would send the "real" run to the
    // emulator while this script reported the real project.
    if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) {
      fail('Emulator environment variables are set in this shell; unset them to target a real project.')
    }
    const rc = JSON.parse(readFileSync(join(__dirname, '..', '..', '.firebaserc'), 'utf8'))
    projectId = rc.projects?.[alias] ?? fail(`No project alias "${alias}" in .firebaserc`)
  } else {
    process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099'
    process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080'
  }

  initializeApp({ projectId })
  const user = await getAuth().getUserByEmail(email)

  await getAuth().setCustomUserClaims(user.uid, { ...user.customClaims, role })
  await getAuth().revokeRefreshTokens(user.uid)
  await getFirestore()
    .collection('users')
    .doc(user.uid)
    .set({ role, updatedAt: FieldValue.serverTimestamp() }, { merge: true })

  console.log(`${email} is now "${role}" on ${projectId}${alias ? '' : ' (emulator)'}. They must sign in again.`)
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)))
