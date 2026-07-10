#!/usr/bin/env node
/**
 * iOS local hybrid dry-run build — static export to out/
 * Temporarily moves src/app/api aside (API stays on Vercel; not bundled in iOS shell).
 * Does NOT affect npm run build (Vercel / API routes preserved).
 */
import { spawnSync } from 'node:child_process'
import { existsSync, renameSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..')
const apiDir = join(root, 'src/app/api')
const apiBak = join(root, 'src/app/api.__ios_local_bak')

let apiMoved = false
if (existsSync(apiDir)) {
  if (existsSync(apiBak)) {
    console.error('[build:ios-local] Stale api.__ios_local_bak exists — remove manually and retry.')
    process.exit(1)
  }
  renameSync(apiDir, apiBak)
  apiMoved = true
  console.log('[build:ios-local] Temporarily moved src/app/api aside (remote API on Vercel).')
}

function restoreApi() {
  if (apiMoved && existsSync(apiBak) && !existsSync(apiDir)) {
    renameSync(apiBak, apiDir)
    console.log('[build:ios-local] Restored src/app/api')
  }
}

process.on('exit', restoreApi)
process.on('SIGINT', () => {
  restoreApi()
  process.exit(130)
})
process.on('SIGTERM', () => {
  restoreApi()
  process.exit(143)
})

const env = {
  ...process.env,
  NEXT_PUBLIC_BUILD_TARGET: 'ios-local',
}

const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const result = spawnSync(cmd, ['next', 'build'], {
  env,
  stdio: 'inherit',
  shell: true,
  cwd: root,
})

restoreApi()
process.exit(result.status ?? 1)
