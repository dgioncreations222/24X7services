import { logger } from 'firebase-functions'

/**
 * The backend's logger: firebase-functions' logger with a level filter in
 * front of it.
 *
 * Cloud Logging bills by volume once past the free allowance, and a busy
 * function that logs every call at info level is the usual way that line
 * grows. Deployed functions therefore log warnings and errors only, unless
 * LOG_LEVEL says otherwise; the emulator logs everything, since that is where
 * the detail is wanted and it costs nothing.
 *
 * LOG_LEVEL is read from the environment (functions/.env, or .env.<project>),
 * one of: debug, info, warn, error.
 */

const LEVELS = ['debug', 'info', 'warn', 'error'] as const
type Level = (typeof LEVELS)[number]

function minLevel(): number {
  const configured = process.env.LOG_LEVEL as Level | undefined
  if (configured && LEVELS.includes(configured)) return LEVELS.indexOf(configured)
  return process.env.FUNCTIONS_EMULATOR === 'true' ? 0 : LEVELS.indexOf('warn')
}

function enabled(level: Level): boolean {
  return LEVELS.indexOf(level) >= minLevel()
}

export const log = {
  debug(message: string, data?: object): void {
    if (enabled('debug')) logger.debug(message, data)
  },
  info(message: string, data?: object): void {
    if (enabled('info')) logger.info(message, data)
  },
  warn(message: string, data?: object): void {
    if (enabled('warn')) logger.warn(message, data)
  },
  // Errors are never filtered: they are what the error alert counts.
  error(message: string, data?: object): void {
    logger.error(message, data)
  },
}
