import { getApps, initializeApp, type App } from 'firebase-admin/app'
import { getAuth, type Auth } from 'firebase-admin/auth'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'

/**
 * One admin app, one Firestore handle and one Auth handle for the whole bundle.
 *
 * Every function is bundled into a single lib/index.js, so anything created at
 * module scope is created on every cold start of every function, including the
 * ones that never use it. These are lazy so a function pays only for what it
 * actually uses.
 */

let app: App | undefined
let firestore: Firestore | undefined

export function adminApp(): App {
  if (!app) {
    app = getApps().length > 0 ? (getApps()[0] as App) : initializeApp()
  }
  return app
}

export function db(): Firestore {
  if (!firestore) {
    firestore = getFirestore(adminApp())
    // An optional field left `undefined` is a field the caller did not set, and
    // writing it as null would make "absent" and "cleared" the same thing.
    firestore.settings({ ignoreUndefinedProperties: true })
  }
  return firestore
}

export function auth(): Auth {
  return getAuth(adminApp())
}
