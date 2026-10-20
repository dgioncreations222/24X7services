// Every deployed function is exported from here, and only from here.
// Customer-side functions are built first; partner and admin functions are
// added when those apps are ready for them.

import './lib/options'

export { onUserCreate } from './auth/onUserCreate'
