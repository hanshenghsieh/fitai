#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..')
const srcRoot = join(root, 'src')

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, acc)
    else if (/\.(tsx?|jsx?)$/.test(name)) acc.push(p)
  }
  return acc
}

const IMPORT = "import { apiFetch } from '@/lib/api/client'\n"
let updated = 0

for (const file of walk(srcRoot)) {
  let content = readFileSync(file, 'utf8')
  if (!/fetch\(['`]\/api\//.test(content)) continue

  content = content.replace(/fetch\((['`])(\/api\/[^'"`]+)\1/g, 'apiFetch($1$2$1')
  content = content.replace(/,\s*credentials:\s*['"]include['"]/g, '')
  content = content.replace(/credentials:\s*['"]include['"],\s*/g, '')

  if (!content.includes("from '@/lib/api/client'")) {
    const lines = content.split('\n')
    let lastImport = -1
    for (let i = 0; i < lines.length; i++) {
      if (/^import\s/.test(lines[i])) lastImport = i
    }
    if (lastImport >= 0) lines.splice(lastImport + 1, 0, IMPORT.trimEnd())
    else lines.unshift(IMPORT.trimEnd())
    content = lines.join('\n')
  }

  writeFileSync(file, content)
  updated++
  console.log('updated', file.replace(root, ''))
}

console.log(`Done. ${updated} files updated.`)
