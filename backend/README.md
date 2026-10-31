# Backend (Firebase)

One backend for all three apps: customer, partner (technician) and admin.
All Firestore rules stay in the one `firestore.rules`, all Storage rules in
the one `storage.rules`, and all Cloud Functions in the one `functions`
codebase, each organised in sections or folders per app. Never add a
second rules file or a separate functions project for one app.
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
| `functions/src/lib/callable.ts` | The wrapper every callable function is written with (see below) |
| `functions/src/lib/flags.ts` | Feature flags in `config/flags`, and their defaults |
| `functions/test` | Rules, wrapper and kill-switch tests, run against the emulator |
| `functions/scripts` | One-off admin scripts (e.g. granting a role) |
| `RUNBOOKS.md` | Deploy, undo, budget + kill-switch, alerts, backups, access |

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
| `npm test` (same as `npm run test:rules`) | Runs all tests (rules, wrapper, kill-switch) against throwaway emulators. GitHub runs the same on every PR that touches `backend/` |
| `npm run typecheck` | TypeScript check |
| `npm run deploy:dev` | Builds, then deploys rules + functions to the dev project. Lead only. Never use a bare `firebase deploy`: it would upload whatever old build is on disk |

## Writing a callable function

Always through `defineCallable` in `functions/src/lib/callable.ts`, never a
bare `onCall`. It runs eight checks in order: signed in, App Check, input
(zod), permission, rate limit, idempotency, transaction, audit. A
`mode: 'write'` handler gets a transaction and must do all its reads before
its writes. Names carry a version: `createBooking_v1`. See `src/ops/ping.ts`
for the smallest example.

- **No call outside Firestore inside a handler** (any HTTP, any SDK that
  sends something). A transaction can run the handler up to five times, and
  each run would send again.
- **Push, WhatsApp, SMS, email, Cloud Tasks, and anything to do with money go
  ONLY through the outbox.** The handler writes an `outbox` document inside
  its transaction; a trigger processes each entry exactly once. Never from
  `after`, never from the handler.
- **`after`** runs once after the commit (not on an idempotent replay) and is
  best effort: a failure is only logged. Use it only for work whose loss
  harms nothing, such as an analytics event or an extra log line.
- **Audit**: `audit: 'booking.cancel'` on the spec writes one entry per call;
  `ctx.audit({ target, before, after, meta })` adds detail. Reads can audit
  too (an admin revealing a phone number). Never store a full phone, address,
  bank or KYC value in an entry: mask it (`+91******3210`) or name the field.
- **Partner and admin** calls are re-checked against `users/{uid}`: the role
  must match and `suspended` must not be `true`. A suspension stops their
  calls within a minute. Customers are not re-checked.
- Expiry is always decided by an `expiresAt` field, never by whether a
  document still exists: TTL deletion runs days late.
- `requiresFlag: 'maps'` (etc.) refuses the call while the kill-switch or an
  admin has that feature off.
- A CPU-heavy function (PDF, CSV export) sets a low `concurrency` and more
  `memory` in `options`.

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
- **Feature flags**: read `config/flags` once at start-up (not a live
  listener) and hide a feature whose flag is `false`. A missing field means
  the default in `flags.ts`.
- **Write calls** marked idempotent need a `requestId` beside the input:
  8-64 characters of `A-Z a-z 0-9 _ -`, made once per user action and
  reused on every retry of that action.

## Secrets

Never commit them. Non-secret settings go in `functions/.env.<projectId>`
(see `functions/.env.example`). Secrets go in Secret Manager:
`firebase functions:secrets:set NAME`.

## Older backend

`customerapp/backend` is the earlier backend (phone OTP, appliance-repair
catalog). It is kept as it is and is not deployed from here. Useful parts are
being carried over into this folder as each phase needs them.
