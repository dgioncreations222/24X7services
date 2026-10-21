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
