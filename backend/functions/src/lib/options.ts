import { setGlobalOptions } from 'firebase-functions/v2'

/**
 * Deployment options, set where they are guaranteed to be set in time.
 *
 * This does not belong in index.ts. Imports are evaluated before the importing
 * module's own body, so a `setGlobalOptions` call at the top of index.ts runs
 * *after* each handler module has already been built, and those handlers keep
 * the defaults. The symptom is a function deployed to us-central1 while the app
 * calls asia-south1, which reads as a dropped request rather than a
 * misconfiguration. Every handler imports this module first instead.
 */

/**
 * Mumbai, for latency and because customer data stays in India under DPDP.
 * The apps' functions region must match this exactly.
 */
export const REGION = 'asia-south1'

setGlobalOptions({
  region: REGION,
  maxInstances: 20,
})
