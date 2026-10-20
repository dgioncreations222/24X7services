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
| `npm run test:rules` | Runs the rules tests against a throwaway emulator |
| `npm run typecheck` | TypeScript check |
| `npm run deploy:dev` | Deploys rules + functions to the dev project. Lead only |

## Secrets

Never commit them. Non-secret settings go in `functions/.env.<projectId>`
(see `functions/.env.example`). Secrets go in Secret Manager:
`firebase functions:secrets:set NAME`.

## Older backend

`customerapp/backend` is the earlier backend (phone OTP, appliance-repair
catalog). It is kept as it is and is not deployed from here. Useful parts are
being carried over into this folder as each phase needs them.
