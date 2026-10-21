/**
 * Pretend network for lib/data while there is no backend. Every read and
 * write goes through `mockRequest`, which waits 300–800 ms and can be told
 * to fail — so loading skeletons, error states and retries can be seen and
 * tested on a desk with good Wi-Fi.
 *
 * Firebase replaces this file; nothing outside lib/ imports it, except the
 * dev screen that flips the failure switch.
 */

export type FailureMode = 'off' | 'once' | 'always'

const config = { minDelay: 300, maxDelay: 800, failure: 'off' as FailureMode }

/** The error a failed mock request throws — the shape a network error will have. */
export class NetworkError extends Error {
  constructor(message = 'Network request failed') {
    super(message)
    this.name = 'NetworkError'
  }
}

/**
 * Whether a failed call is worth trying again because the connection dropped:
 * the mock's NetworkError, or Firebase's 'unavailable' / 'deadline-exceeded'
 * codes once Firebase replaces this file.
 */
export function isNetworkError(e: unknown): boolean {
  if (e instanceof NetworkError) return true
  const code = (e as { code?: unknown } | null)?.code
  return typeof code === 'string' && /(^|\/)(unavailable|deadline-exceeded)$/.test(code)
}

/** Make the next request fail (`once`), every request fail (`always`), or none. */
export function setMockFailure(mode: FailureMode) {
  config.failure = mode
}

export function getMockFailure(): FailureMode {
  return config.failure
}

/** Change the simulated latency, e.g. 0 to make tests instant. */
export function setMockDelay(minMs: number, maxMs = minMs) {
  config.minDelay = minMs
  config.maxDelay = Math.max(minMs, maxMs)
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/** Run `work` after a network-like delay, or throw NetworkError if failing. */
export async function mockRequest<T>(work: () => T): Promise<T> {
  await wait(config.minDelay + Math.random() * (config.maxDelay - config.minDelay))
  if (config.failure !== 'off') {
    if (config.failure === 'once') config.failure = 'off'
    throw new NetworkError()
  }
  return work()
}

/**
 * An upload that reports progress, for photos. Calls `onProgress` with 0–1
 * a few times along the way, then resolves; fails like any other request.
 */
export async function mockUpload(onProgress?: (fraction: number) => void): Promise<void> {
  const steps = 5
  for (let i = 1; i <= steps; i++) {
    await wait((config.minDelay + Math.random() * (config.maxDelay - config.minDelay)) / steps)
    if (config.failure !== 'off' && i === 3) {
      if (config.failure === 'once') config.failure = 'off'
      throw new NetworkError('Upload interrupted')
    }
    onProgress?.(i / steps)
  }
}
