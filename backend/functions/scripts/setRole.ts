/**
 * Grant or change an account's role.
 *
 *   npm run set-role -- <email> <customer|partner|admin>            (emulator)
 *   npm run set-role -- <email> <customer|partner|admin> --project dev
 *
 * Without --project it talks to the local Auth/Firestore emulators, so trying
 * it out cannot touch real accounts. With --project it uses your own gcloud
 * login (`gcloud auth application-default login`), and only someone with
 * access to that Firebase project can run it, which is the point: roles are
 * granted by the lead, never by an app.
 *
 * The user has to sign out and back in (or refresh their token) to pick up the
 * new role.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { isRole, ROLES } from '../src/lib/roles'

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const projectFlag = args.indexOf('--project')
  const alias = projectFlag >= 0 ? args[projectFlag + 1] : undefined
  const [email, role] = args.filter((_, i) => projectFlag < 0 || (i !== projectFlag && i !== projectFlag + 1))

  if (!email || !isRole(role)) {
    console.error(`Usage: npm run set-role -- <email> <${ROLES.join('|')}> [--project dev]`)
    process.exit(1)
  }

  let projectId = 'demo-customer-service'
  if (alias) {
    const rc = JSON.parse(readFileSync(join(__dirname, '..', '..', '.firebaserc'), 'utf8'))
    projectId = rc.projects?.[alias]
    if (!projectId) {
      console.error(`No project alias "${alias}" in .firebaserc`)
      process.exit(1)
    }
  } else {
    process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099'
    process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080'
  }

  initializeApp({ projectId })
  const user = await getAuth().getUserByEmail(email)

  await getAuth().setCustomUserClaims(user.uid, { ...user.customClaims, role })
  await getFirestore()
    .collection('users')
    .doc(user.uid)
    .set({ role, updatedAt: FieldValue.serverTimestamp() }, { merge: true })

  console.log(`${email} is now "${role}" on ${projectId}${alias ? '' : ' (emulator)'}.`)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
