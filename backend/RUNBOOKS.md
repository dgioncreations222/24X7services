# Runbooks

Step-by-step for the jobs that are done by hand: deploying, undoing a deploy,
the money safety net, and what to do when something breaks. Commands run from
`backend/functions` unless a step says otherwise.

Project: `customer-service-dev-ff0dc` (the only one for now), region
`asia-south1`.

---

## 1. Deploy

1. On a clean checkout of `main`, run `npm ci`.
2. Run `npm run typecheck` and `npm run test:rules`. Both must pass.
3. Run `npm run deploy:dev`. It builds first. **Never run a bare
   `firebase deploy`**: it skips the build and can push stale code.
4. Afterwards, call `ping_v1` from an app (or check Functions in the console)
   to confirm the functions answer.

Functions need the Blaze plan. Rules and indexes can be deployed on any plan
with `firebase deploy --only firestore:rules,storage --project dev --config ../firebase.json`.

## 2. Undo a bad deploy

**Functions.** Deploy the last good commit:

```
git switch --detach <last-good-commit>
cd backend/functions && npm ci && npm run deploy:dev
git switch main
```

Then fix forward on a branch as usual.

**Rules.** Firebase console, Firestore (or Storage), Rules, then the history
on the left: pick the previous version and press **Restore**. Then fix the
rules file in the repo so the next deploy does not bring the bad version back.

## 3. Feature flags

The document `config/flags` in Firestore switches paid features:
`maps`, `tracking`, `whatsapp`, `sms`, `onlinePayments`, `appCheckEnforce`.
A missing field means the default in `functions/src/lib/flags.ts`. Functions
see a change within a minute.

**Turn a feature off by hand:** Firestore console, `config/flags`, set the
field to `false`. Create the document if it does not exist.

**After the kill-switch fired:** it turns `maps`, `tracking`, `whatsapp` and
`sms` off when the month's cost reaches the budget, and writes an `audit`
entry with action `killSwitch.flagsOff`. To turn them back on:

1. Find out why the cost jumped (Billing, Reports, group by SKU). Fix it.
2. Raise the budget for the month if needed (section 4).
3. Set the four fields back to `true` in `config/flags`.

**App Check emergency:** if real users are being rejected for App Check, set
`appCheckEnforce` to `false`. Calls are then allowed and logged.

## 4. Billing budget and kill-switch (once the card is added)

1. Firebase console, **Upgrade** to the Blaze plan, with the company card.
2. Deploy once (section 1). This creates the `budget-alerts` Pub/Sub topic
   that the kill-switch listens to.
3. Google Cloud console, Billing, **Budgets & alerts**, **Create budget**:
   - Scope: project `customer-service-dev-ff0dc`, all services.
   - Amount: specified amount, ₹25,000, monthly.
   - Thresholds: 50%, 80%, 100% of **actual** cost.
   - Notifications: tick email to billing admins, and add the company email
     through **Link Monitoring email notification channels**.
   - Tick **Connect a Pub/Sub topic to this budget** and choose
     `projects/customer-service-dev-ff0dc/topics/budget-alerts`.
4. Check: the budget page shows the topic as connected. The kill-switch
   function logs nothing while cost is under budget; that is expected.

## 5. Error alerts (once the card is added)

One alert for any error logged by a function. Every unexpected failure and
the kill-switch log at error level, so this one alert covers both.

1. Google Cloud console, Logging, **Logs Explorer**. Query:
   ```
   severity>=ERROR
   resource.type="cloud_run_revision" OR resource.type="cloud_function"
   ```
2. **Actions, Create log alert**. Name it `Function errors`.
3. Notification: minimum time between notifications **5 minutes**, channel
   = the company email.
4. Save. Test by calling `ping_v1` from a build with a broken handler, or wait
   for the next real error.

## 6. Cleanup of expired records (TTL)

`idempotency` and `rateLimits` documents carry an `expiresAt` field. The code
never relies on them being deleted, but they should not pile up.

Firestore console, **Time-to-live**, **Create policy** twice:
collection group `idempotency`, field `expiresAt`; collection group
`rateLimits`, field `expiresAt`. Deletion runs up to a few days late; that
is fine.

## 7. Backups and restore (set up in B10)

Needs the Blaze plan. From any folder, with `gcloud` signed in:

```
gcloud firestore backups schedules create --project=customer-service-dev-ff0dc \
  --database="(default)" --recurrence=daily --retention=7d
gcloud firestore databases update --project=customer-service-dev-ff0dc \
  --database="(default)" --enable-pitr
```

**Restore drill** (do it once, by someone other than the lead): list backups
with `gcloud firestore backups list --project=customer-service-dev-ff0dc`,
then restore into a new database, never over `(default)`:

```
gcloud firestore databases restore --project=customer-service-dev-ff0dc \
  --source-backup=<backup name from the list> --destination-database=restore-test
```

Open `restore-test` in the console, check a few documents, then delete it.

## 8. People and access

**New admin of the app:** `npm run set-role -- <email> admin --project dev`.
The person signs in once first, so the account exists.

**Remove an admin:** `npm run set-role -- <email> customer --project dev`.
Admin calls stop within a minute; the rules stop them at once.

**Second Firebase owner** (so prod work does not stop when the lead is away):
Google Cloud console, IAM, **Grant access**, the person's Google account,
role **Owner**. They should run the restore drill (section 7) once.

## 9. Log level

Deployed functions log warnings and errors only, to keep Cloud Logging cheap.
For more detail while debugging, add `LOG_LEVEL=info` (or `debug`) to
`functions/.env.customer-service-dev-ff0dc`, deploy, and remove it again
afterwards. The emulator
always logs everything.
