#!/usr/bin/env node
/**
 * iOS local hybrid build — static export to out/
 * Temporarily excludes src/app/api and src/app/growth (restored in finally).
 * Does NOT affect npm run build (Vercel / API routes preserved).
 *
 * Windows: if EPERM persists, run on Mac (recommended for TestFlight Build 16).
 */
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, renameSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..')
const isWindows = process.platform === 'win32'
const stagingRoot = join(root, '.ios-local-staging')
const IAP_PRODUCT_ID = 'betterbit_pro_monthly'
const IAP_ENTITLEMENT_ID = 'premium'

const EXCLUDE_DIRS = [
  { src: join(root, 'src/app/api'), bak: join(stagingRoot, 'api') },
  { src: join(root, 'src/app/growth'), bak: join(stagingRoot, 'growth') },
]

const moved = []

function pause(ms) {
  const end = Date.now() + ms
  while (Date.now() < end) {
    /* spin */
  }
}

function retryRename(src, dest, attempts = 3) {
  let lastError
  for (let i = 0; i < attempts; i++) {
    try {
      renameSync(src, dest)
      return
    } catch (err) {
      lastError = err
      if (i < attempts - 1 && ['EPERM', 'EACCES', 'EBUSY'].includes(err.code)) {
        pause(200 * (i + 1))
      }
    }
  }
  throw lastError
}

function moveAside({ src, bak }) {
  if (!existsSync(src)) {
    console.log(`[build:ios-local] Skip (not found): ${src}`)
    return false
  }
  if (existsSync(bak)) {
    throw new Error(`Stale backup exists — remove manually and retry: ${bak}`)
  }

  mkdirSync(join(bak, '..'), { recursive: true })

  try {
    retryRename(src, bak)
    moved.push({ src, bak, method: 'rename' })
    console.log(`[build:ios-local] Moved aside: ${src}`)
    return true
  } catch (renameErr) {
    if (!['EPERM', 'EACCES', 'EBUSY'].includes(renameErr.code)) {
      throw renameErr
    }

    console.warn(`[build:ios-local] rename failed (${renameErr.code}), trying copy+remove...`)

    try {
      cpSync(src, bak, { recursive: true })
      rmSync(src, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 })
      moved.push({ src, bak, method: 'copy' })
      console.log(`[build:ios-local] Copied aside: ${src}`)
      return true
    } catch (copyErr) {
      if (existsSync(bak) && !existsSync(src)) {
        moved.push({ src, bak, method: 'copy' })
        return true
      }
      if (existsSync(bak)) {
        try {
          rmSync(bak, { recursive: true, force: true })
        } catch {
          /* ignore cleanup failure */
        }
      }

      if (isWindows) {
        console.error('\n[build:ios-local] Windows EPERM — could not exclude directory.')
        console.error('  Recommended: run on Mac:')
        console.error('    git checkout feature/local-hybrid-build16')
        console.error('    npm install')
        console.error('    NEXT_PUBLIC_API_BASE_URL=https://betterbit.app npm run build:ios-local')
        console.error('  Or close IDE/antivirus locks on src/app/api and retry.\n')
        process.exitCode = 2
        throw copyErr
      }
      throw copyErr
    }
  }
}

function restoreAll() {
  for (let i = moved.length - 1; i >= 0; i--) {
    const { src, bak } = moved[i]
    if (existsSync(src)) continue
    if (!existsSync(bak)) {
      console.error(`[build:ios-local] WARN: missing backup, cannot restore ${src}`)
      continue
    }
    try {
      retryRename(bak, src)
      console.log(`[build:ios-local] Restored: ${src}`)
    } catch {
      try {
        cpSync(bak, src, { recursive: true })
        rmSync(bak, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 })
        console.log(`[build:ios-local] Restored (copy): ${src}`)
      } catch (restoreErr) {
        console.error(`[build:ios-local] FATAL: failed to restore ${src} from ${bak}`)
        console.error(restoreErr.message)
        process.exitCode = 3
      }
    }
  }
  moved.length = 0
}

function failFastEnv() {
  const apiBase =
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim()

  if (!apiBase) {
    console.error('[build:ios-local] NEXT_PUBLIC_API_BASE_URL is required.')
    console.error('  Example: NEXT_PUBLIC_API_BASE_URL=https://betterbit.app npm run build:ios-local')
    process.exit(1)
  }

  const iapEnabled = process.env.NEXT_PUBLIC_APPLE_IAP_ENABLED?.trim()
  const revenueCatKey =
    process.env.NEXT_PUBLIC_REVENUECAT_IOS_API_KEY?.trim()
  const productId = process.env.NEXT_PUBLIC_APPLE_IAP_PRODUCT_ID?.trim()
  const entitlementId =
    process.env.NEXT_PUBLIC_APPLE_IAP_ENTITLEMENT_ID?.trim()
  const iapErrors = []
  if (iapEnabled !== 'true') {
    iapErrors.push('NEXT_PUBLIC_APPLE_IAP_ENABLED must be true')
  }
  if (!revenueCatKey?.startsWith('appl_')) {
    iapErrors.push('NEXT_PUBLIC_REVENUECAT_IOS_API_KEY must be present and use an appl_ public key')
  }
  if (productId !== IAP_PRODUCT_ID) {
    iapErrors.push(`NEXT_PUBLIC_APPLE_IAP_PRODUCT_ID must equal ${IAP_PRODUCT_ID}`)
  }
  if (entitlementId !== IAP_ENTITLEMENT_ID) {
    iapErrors.push(`NEXT_PUBLIC_APPLE_IAP_ENTITLEMENT_ID must equal ${IAP_ENTITLEMENT_ID}`)
  }
  if (iapErrors.length > 0) {
    for (const error of iapErrors) {
      console.error(`[build:ios-local] ${error}.`)
    }
    process.exit(1)
  }
  console.log('[build:ios-local] RevenueCat public config present and identifiers match.')

  // Apex betterbit.app 308-redirects to www; WKWebView drops CORS redirects.
  // Bake in the canonical www host so native mutations don't hit the redirect.
  const canonical = apiBase
    .replace(/\/$/, '')
    .replace(/^https:\/\/betterbit\.app/i, 'https://www.betterbit.app')
  if (canonical !== apiBase.replace(/\/$/, '')) {
    console.log(`[build:ios-local] normalized API base → ${canonical}`)
  }

  return {
    ...process.env,
    NEXT_PUBLIC_BUILD_TARGET: 'ios-local',
    NEXT_PUBLIC_API_BASE_URL: canonical,
  }
}

let restored = false
function ensureRestore() {
  if (!restored) {
    restoreAll()
    restored = true
  }
}

process.on('exit', ensureRestore)
process.on('SIGINT', () => {
  ensureRestore()
  process.exit(130)
})
process.on('SIGTERM', () => {
  ensureRestore()
  process.exit(143)
})

const env = failFastEnv()

try {
  for (const dir of EXCLUDE_DIRS) {
    moveAside(dir)
  }

  const nextCache = join(root, '.next')
  if (existsSync(nextCache)) {
    try {
      rmSync(nextCache, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 })
      console.log('[build:ios-local] Cleared .next cache')
    } catch (err) {
      console.warn(`[build:ios-local] Could not clear .next (${err.code ?? err.message}) — continuing`)
    }
  }

  const cmd = isWindows ? 'npx.cmd' : 'npx'
  const result = spawnSync(cmd, ['next', 'build'], {
    env,
    stdio: 'inherit',
    shell: true,
    cwd: root,
  })

  if (result.status !== 0) {
    process.exitCode = result.status ?? 1
  } else {
    const outIndex = join(root, 'out', 'index.html')
    if (!existsSync(outIndex)) {
      console.error('[build:ios-local] Build succeeded but out/index.html missing.')
      process.exitCode = 1
    } else {
      console.log('[build:ios-local] OK — out/ generated.')
    }
  }
} catch (err) {
  if (!process.exitCode) process.exitCode = 1
  if (err.message && process.exitCode !== 2) {
    console.error('[build:ios-local]', err.message)
  }
} finally {
  ensureRestore()
}

process.exit(process.exitCode ?? 0)
