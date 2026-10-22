
import { httpsCallable, FunctionsError } from 'firebase/functions'
import {
  CALLABLES,
  type CallableInput,
  type CallableName,
  type CallableResult,
} from '@app/shared'
import { demoMode, functions } from './firebase'
import { demoCall } from './demo'

/**
 * The typed way to call a Cloud Function.
 *
 * Both ends read the same registry, so the argument and the return value of
 * `callFn('checkServiceability', …)` are whatever the schemas say they are, and
 * a changed field is a compile error on both sides. The result is parsed as
 * well as typed: a deployed function one version behind the app returns a shape
 * the schema rejects, which is a caught error rather than `undefined` reaching
 * a template.
 */
export async function callFn<N extends CallableName>(
  name: N,
  input: CallableInput<N>
): Promise<CallableResult<N>> {
  const spec = CALLABLES[name]
  const parsed = spec.input.parse(input) as CallableInput<N>
  if (demoMode) {
    return spec.result.parse(await demoCall(name, parsed)) as CallableResult<N>
  }
  const fn = httpsCallable<unknown, unknown>(functions(), name)
  const response = await fn(parsed)
  return spec.result.parse(response.data) as CallableResult<N>
}

/**
 * What to put on screen when a call fails.
 *
 * `invalid-argument` and `failed-precondition` carry wording the function chose
 * for a person to read, so they pass through. Everything else is ours to
 * explain, and the raw message is not fit for a customer.
 */
/** The server refused because of the booking's state (cancelled, already paid…), not the network. */
export function isFailedPrecondition(error: unknown): boolean {
  return error instanceof FunctionsError && error.code === 'functions/failed-precondition'
}

export function friendlyError(error: unknown): string {
  if (error instanceof FunctionsError) {
    switch (error.code) {
      case 'functions/invalid-argument':
      case 'functions/failed-precondition':
      case 'functions/not-found':
      case 'functions/permission-denied':
        return error.message
      case 'functions/unauthenticated':
        return 'Please sign in to continue.'
      case 'functions/resource-exhausted':
        return 'Too many attempts. Please wait a moment and try again.'
      case 'functions/unavailable':
      case 'functions/deadline-exceeded':
        return 'We could not reach the server. Check your connection and try again.'
      default:
        return 'Something went wrong. Please try again.'
    }
  }

  return 'Something went wrong. Please try again.'
}
