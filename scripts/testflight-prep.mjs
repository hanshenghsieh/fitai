#!/usr/bin/env node
/**
 * TestFlight prep — test + build + cap:sync.
 * Archive / Upload must run on Mac (see scripts/testflight-archive-mac.sh).
 */
import { execSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..')
const pbxproj = join(root, 'ios/App/App.xcodeproj/project.pbxproj')
const EXPECTED_BUILD = process.env.IOS_BUILD_NUMBER?.trim() || '16'

function run(cmd, opts = {}) {
  console.log(`\n> ${cmd}`)
  execSync(cmd, { stdio: 'inherit', cwd: root, ...opts })
}

function checkFeatureFlag() {
  const val = process.env.NEXT_PUBLIC_NUTRITION_ACCURACY_V1
  if (val === 'true') {
    console.warn('[WARN] NEXT_PUBLIC_NUTRITION_ACCURACY_V1=true — photo confirm UI will be enabled in this build.')
  } else {
    console.log('[OK] NEXT_PUBLIC_NUTRITION_ACCURACY_V1 is not true (legacy photo flow)')
  }
}

function checkIosBuildNumber() {
  const text = readFileSync(pbxproj, 'utf8')
  const matches = [...text.matchAll(/CURRENT_PROJECT_VERSION = (\d+);/g)]
  const versions = [...new Set(matches.map(m => m[1]))]
  if (versions.length !== 1 || versions[0] !== EXPECTED_BUILD) {
    console.error(`[FAIL] Expected CURRENT_PROJECT_VERSION = ${EXPECTED_BUILD}, got: ${versions.join(', ') || 'none'}`)
    process.exit(1)
  }
  console.log(`[OK] iOS CURRENT_PROJECT_VERSION = ${EXPECTED_BUILD}`)
}

function checkCapacitorServer() {
  const cfgPath = join(root, 'ios/App/App/capacitor.config.json')
  if (!existsSync(cfgPath)) {
    console.warn('[WARN] capacitor.config.json not found yet — cap:sync will create it')
    return
  }
  const cfg = readFileSync(cfgPath, 'utf8')
  const isLocalHybrid = process.env.IOS_BUILD_TARGET?.trim() === 'local-hybrid'

  if (isLocalHybrid) {
    if (!cfg.includes('"webDir": "out"') && !cfg.includes('"webDir":"out"')) {
      console.error('[FAIL] local-hybrid expects webDir "out" in capacitor.config.json')
      process.exit(1)
    }
    if (/"url"\s*:\s*"https?:\/\//.test(cfg)) {
      console.error('[FAIL] local-hybrid must NOT set server.url (remote wrapper)')
      process.exit(1)
    }
    console.log('[OK] Capacitor local hybrid — webDir=out, no server.url')
  } else {
    if (cfg.includes('"webDir": "out"') || cfg.includes('"webDir":"out"')) {
      console.warn('[WARN] webDir is out — Build 15 remote wrapper expects capacitor-www + server.url')
    }
    if (!cfg.includes('betterbit.app') && !/"url"\s*:/.test(cfg)) {
      console.warn('[WARN] capacitor.config.json has no server.url — ensure this is intentional')
    } else if (cfg.includes('betterbit.app')) {
      console.log('[OK] Capacitor server → betterbit.app (Build 15 remote wrapper)')
    }
  }

  if (!cfg.includes('PurchasesPlugin')) {
    console.error('[FAIL] capacitor.config.json missing PurchasesPlugin in packageClassList')
    console.error('       Run: npx cap sync ios — then archive again')
    process.exit(1)
  }
  console.log('[OK] capacitor.config.json includes PurchasesPlugin')
}

console.log('=== TestFlight prep ===\n')
console.log(`IOS_BUILD_TARGET=${process.env.IOS_BUILD_TARGET ?? '(default remote wrapper)'}`)

checkFeatureFlag()
checkIosBuildNumber()
checkCapacitorServer()

const isLocalHybrid = process.env.IOS_BUILD_TARGET?.trim() === 'local-hybrid'

const buildEnv = {
  ...process.env,
  NEXT_PUBLIC_NUTRITION_ACCURACY_V1: process.env.NEXT_PUBLIC_NUTRITION_ACCURACY_V1 ?? 'false',
}

run('npm test')
if (isLocalHybrid) {
  if (!process.env.NEXT_PUBLIC_API_BASE_URL?.trim()) {
    console.error('[FAIL] IOS_BUILD_TARGET=local-hybrid requires NEXT_PUBLIC_API_BASE_URL')
    process.exit(1)
  }
  run('npm run build:ios-local', { env: buildEnv })
} else {
  run('npm run build', { env: buildEnv })
}
run('npm run cap:sync')

console.log('\n=== Prep complete ===')
console.log('Next (Mac + Xcode):')
console.log('  bash scripts/testflight-archive-mac.sh')
console.log('Or: open ios/App/App.xcodeproj → Product → Archive → Upload')
console.log('\nVercel Production checklist:')
console.log('  - NEXT_PUBLIC_APP_STORE_SAFE_MODE=true (hide Stripe for TestFlight)')
console.log('  - NEXT_PUBLIC_NUTRITION_ACCURACY_V1=false or unset')
