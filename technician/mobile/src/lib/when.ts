/** Dates for job screens, from epoch ms. */

/** 4:30 PM */
export function clock(ms: number): string {
  return new Date(ms).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase()
}

const startOf = (ms: number) => {
  const d = new Date(ms)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/** Today / Tomorrow / Yesterday / Mon, 20 Oct */
export function day(ms: number): string {
  const diff = Math.round((startOf(ms) - startOf(Date.now())) / 86_400_000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  return new Date(ms).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
}

export const isToday = (ms: number) => startOf(ms) === startOf(Date.now())

/** 20 Oct */
export function shortDate(ms: number): string {
  return new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

/**
 * How long ago, as a string for t() and its number: `t(a.text, { n: a.n })`.
 * Past a day it is the date itself.
 */
export function ago(ms: number): { text: string; n?: number } {
  const min = Math.max(0, Math.round((Date.now() - ms) / 60_000))
  if (min < 1) return { text: 'just now' }
  if (min < 60) return { text: '{n} min ago', n: min }
  const h = Math.round(min / 60)
  if (h < 24) return { text: '{n} h ago', n: h }
  return { text: shortDate(ms) }
}
