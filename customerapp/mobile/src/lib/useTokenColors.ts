import { useCSSVariable } from 'uniwind'

/**
 * Colours from global.css by token name, for the props that want a string
 * rather than a className: gradient stops, SVG fills. `'tone-blue-1'` reads
 * `--color-tone-blue-1`. Hex values live in global.css and nowhere else.
 */
export function useTokenColors<const T extends readonly string[]>(names: T): { [K in keyof T]: string } {
  const values = useCSSVariable(names.map((name) => `--color-${name}`)) as (string | number | undefined)[]
  return values.map((value) => (typeof value === 'string' ? value : 'transparent')) as { [K in keyof T]: string }
}
