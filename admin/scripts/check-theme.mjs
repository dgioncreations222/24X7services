// Fails when a colour is written out in code instead of using a token, or
// when lib/theme.ts and the @theme block in app/globals.css disagree.
//
//   node scripts/check-theme.mjs

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const css = readFileSync(join(root, 'app/globals.css'), 'utf8')
const ts = readFileSync(join(root, 'lib/theme.ts'), 'utf8')

const camel = (s) => s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase())
const fromCss = new Map([...css.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)].map(([, k, v]) => [camel(k), v.toLowerCase()]))
const fromTs = [...ts.matchAll(/^\s*([a-zA-Z0-9]+):\s*'(#[0-9a-fA-F]{3,8})',?\s*$/gm)].map(([, k, v]) => [k, v.toLowerCase()])

const problems = []
for (const [k, v] of fromTs) {
  if (!fromCss.has(k)) problems.push(`lib/theme.ts has ${k}, app/globals.css has no --color token for it`)
  else if (fromCss.get(k) !== v) problems.push(`${k}: globals.css ${fromCss.get(k)}, theme.ts ${v}`)
}

// Hex or rgb() in code, outside comments and lib/theme.ts.
const LITERAL = /#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?(?:[0-9a-fA-F]{2})?\b|rgba?\(/
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path)
    else if (/\.tsx?$/.test(name) && relative(root, path) !== join('lib', 'theme.ts')) {
      readFileSync(path, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          const code = line.replace(/\/\/.*$/, '').replace(/^\s*\*.*$/, '')
          if (LITERAL.test(code)) problems.push(`${relative(root, path)}:${i + 1} writes a colour out — use a token`)
        })
    }
  }
}
for (const dir of ['app', 'components', 'lib']) walk(join(root, dir))

if (problems.length) {
  console.error(`Theme check failed:\n  ${problems.join('\n  ')}`)
  process.exit(1)
}
console.log(`Theme check passed (${fromCss.size} colour tokens, no colours written out).`)
