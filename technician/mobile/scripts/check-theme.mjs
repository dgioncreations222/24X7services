// Fails when src/lib/theme.ts and the @theme block in src/global.css disagree,
// so a colour changed in one place cannot quietly differ in the other.
//
//   node scripts/check-theme.mjs

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const css = readFileSync(join(root, 'src/global.css'), 'utf8')
const ts = readFileSync(join(root, 'src/lib/theme.ts'), 'utf8')

const camel = (s) => s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase())
const fromCss = new Map([...css.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)].map(([, k, v]) => [camel(k), v.toLowerCase()]))
const fromTs = new Map([...ts.matchAll(/^\s*([a-zA-Z0-9]+):\s*'(#[0-9a-fA-F]{3,8})',?\s*$/gm)].map(([, k, v]) => [k, v.toLowerCase()]))

const problems = []
for (const [k, v] of fromCss) {
  if (!fromTs.has(k)) problems.push(`theme.ts is missing ${k} (${v})`)
  else if (fromTs.get(k) !== v) problems.push(`${k}: global.css ${v}, theme.ts ${fromTs.get(k)}`)
}
for (const k of fromTs.keys()) if (!fromCss.has(k)) problems.push(`theme.ts has ${k}, global.css does not`)

if (problems.length) {
  console.error(`Theme tokens out of sync:\n  ${problems.join('\n  ')}`)
  process.exit(1)
}
console.log(`Theme tokens in sync (${fromCss.size} colours).`)
