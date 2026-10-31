import { z } from 'zod'
import { defineCallable } from '../lib/callable'
import { ROLES } from '../lib/roles'

/**
 * A health check the apps can call to see that sign-in, App Check and the
 * functions region are wired up: it answers with who the server thinks the
 * caller is. It reads and writes nothing except its rate-limit counter.
 */
export const ping_v1 = defineCallable({
  name: 'ping_v1',
  mode: 'read',
  roles: ROLES,
  input: z.object({}).strict(),
  rateLimit: { max: 10, windowSec: 60 },
  handler: async ({ uid, role, appVerified }) => ({
    ok: true,
    uid,
    role,
    appVerified,
    serverTime: Date.now(),
  }),
})
