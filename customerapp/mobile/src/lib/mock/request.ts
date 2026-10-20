/**
 * Every mock read goes through here, so the screens see what a network gives
 * them: a pause, and now and then a failure. A screen that has only ever been
 * fed instant data has never shown its skeleton, and a screen that has never
 * failed has an error state nobody has looked at.
 *
 * `EXPO_PUBLIC_MOCK_DELAY_MS` sets the pause (default 400; 0 for none).
 * `EXPO_PUBLIC_MOCK_FAIL=1` makes every read fail, to check each screen's error
 * state. `setMockFailure()` does the same from code, for one screen at a time.
 */

const DELAY_MS = Number(process.env.EXPO_PUBLIC_MOCK_DELAY_MS ?? 400)
let failing = process.env.EXPO_PUBLIC_MOCK_FAIL === '1'

/** Turn mock failures on or off while the app is running. */
export function setMockFailure(on: boolean): void {
  failing = on
}

export class MockNetworkError extends Error {
  constructor() {
    super('Could not reach the server. Check your connection and try again.')
    this.name = 'MockNetworkError'
  }
}

/** Resolves to `value` after the mock delay, or rejects when failures are on. */
export function mockRequest<T>(value: T): Promise<T> {
  return new Promise((resolve, reject) => {
    setTimeout(() => (failing ? reject(new MockNetworkError()) : resolve(value)), DELAY_MS)
  })
}
