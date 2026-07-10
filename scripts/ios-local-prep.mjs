#!/usr/bin/env node
/**
 * iOS local hybrid prep — build static export (out/) then cap sync.
 * Requires NEXT_PUBLIC_API_BASE_URL (feature Vercel preview recommended).
 */
import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..')
const outIndex = join(root, 'out', 'index.html')

function run(cmd, env = process.env) {
  console.log(`\n> ${cmd}`)
  execSync(cmd, { stdio: 'inherit', cwd: root, env })
}

const apiBase =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
  process.env.NEXT_PUBLIC_APP_URL?.trim()

if (!apiBase) {
  console.error('[ios:local:prep] NEXT_PUBLIC_API_BASE_URL is required.')
  console.error('  Use feature branch Vercel preview URL (Bearer JWT + CORS APIs).')
  console.error('  Example: NEXT_PUBLIC_API_BASE_URL=https://<preview>.vercel.app npm run ios:local:prep')
  process.exit(1)
}

console.log(`[ios:local:prep] API base: ${apiBase.replace(/\/$/, '')}`)

run('npm run build:ios-local', {
  ...process.env,
  NEXT_PUBLIC_API_BASE_URL: apiBase.replace(/\/$/, ''),
})

if (!existsSync(outIndex)) {
  console.error('[ios:local:prep] FAIL — out/index.html missing after build:ios-local')
  process.exit(1)
}

run('npx cap sync ios')

console.log('\n[ios:local:prep] OK — local assets synced to ios/.')
console.log('Next: npm run ios:local:open (Mac) → Run on Simulator / device')
console.log('Do NOT Archive / Upload until preview API + local shell validated.')
