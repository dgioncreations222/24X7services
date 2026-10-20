# Backend (Firebase)

One backend for all three apps: customer, partner (technician) and admin.
Only the customer side is being built for now. Roles are already in place so
partner and admin can be added without rewriting the rules.

| Path | What it is |
|---|---|
| `firebase.json` | Where the rules and functions are, and the emulator ports |
| `.firebaserc` | Which Firebase project `dev` refers to |
| `firestore.rules` | Who can read and write which documents. Deny-by-default |
| `storage.rules` | Same, for uploaded files |
| `firestore.indexes.json` | Composite indexes for queries |
| `functions/src` | Cloud Functions (TypeScript, bundled with esbuild) |
| `functions/test` | Rules tests, run against the emulator |
| `functions/scripts` | One-off admin scripts (e.g. granting a role) |

## Roles

The `role` custom claim on the auth token: `customer`, `partner` or `admin`.
Every sign-up becomes a `customer` (`onUserCreate`). Partner and admin are
granted only by the lead:

```
npm run set-role -- someone@example.com admin                 # emulator
npm run set-role -- someone@example.com admin --project dev   # real project
```

For `--project`, log in once with your own Google account:
`gcloud auth application-default login` and then
`gcloud auth application-default set-quota-project customer-service-dev-ff0dc`.

Admin access is checked against both the token and `users/{uid}.role`, so a
demotion takes effect immediately.

## Setup (once)

Needs Node 22, Java 21 (for the emulators) and `npm i -g firebase-tools`.

```
cd backend/functions
npm install
```

## Everyday commands (from `backend/functions`)

| Command | What it does |
|---|---|
| `npm run emulators` | Runs Firestore/Auth/Functions/Storage locally. UI at http://localhost:4000. Uses a `demo-` project, so it can never touch real data |
| `npm run test:rules` | Runs the Firestore and Storage rules tests against throwaway emulators |
| `npm run typecheck` | TypeScript check |
| `npm run deploy:dev` | Builds, then deploys rules + functions to the dev project. Lead only. Never use a bare `firebase deploy`: it would upload whatever old build is on disk |

## Rules the apps must follow

The rules reject anything else, so these are not suggestions:

- **Catalog lists** need `limit(n)` with n ≤ 100. Prefer a cached copy over
  live queries; the catalog is the most-read data and the biggest cost.
- **Addresses** are saved to the first free id of `a0`..`a9` (max 10), and
  listed with `limit(10)`. Add a new one inside a transaction that checks the
  slot is still empty, or two quick saves can land on the same slot.
  `defaultAddressId` is one of those ids.
- **Profile** is saved with `updateDoc` or `setDoc(..., { merge: true })`,
  never a plain `setDoc`. Timestamps use `serverTimestamp()`.
- **Profile photo** goes to `users/{uid}/profile/avatar`, at most 2 MB, and
  only one upload per change of photo. Compress before upload. The app
  cannot delete it, only replace it.
- No `onSnapshot` on a whole collection; paginate instead.

## Secrets

Never commit them. Non-secret settings go in `functions/.env.<projectId>`
(see `functions/.env.example`). Secrets go in Secret Manager:
`firebase functions:secrets:set NAME`.

## Older backend

`customerapp/backend` is the earlier backend (phone OTP, appliance-repair
catalog). It is kept as it is and is not deployed from here. Useful parts are
being carried over into this folder as each phase needs them.
