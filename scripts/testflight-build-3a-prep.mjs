#!/usr/bin/env node
/**
 * TestFlight Build 3a prep — flag=false, iOS build 3, test + build + cap:sync.
 * Archive / Upload must run on Mac (see scripts/testflight-archive-mac.sh).
 */
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..')
const pbxproj = join(root, 'ios/App/App.xcodeproj/project.pbxproj')

function run(cmd, opts = {}) {
  console.log(`\n> ${cmd}`)
  execSync(cmd, { stdio: 'inherit', cwd: root, ...opts })
}

function checkFeatureFlag() {
  const val = process.env.NEXT_PUBLIC_NUTRITION_ACCURACY_V1
  if (val === 'true') {
    console.error('\n[FAIL] NEXT_PUBLIC_NUTRITION_ACCURACY_V1=true — Build 3a requires false or unset.')
    process.exit(1)
  }
  console.log('[OK] NEXT_PUBLIC_NUTRITION_ACCURACY_V1 is not true (legacy photo flow)')
}

function checkIosBuildNumber() {
  const text = readFileSync(pbxproj, 'utf8')
  const matches = [...text.matchAll(/CURRENT_PROJECT_VERSION = (\d+);/g)]
  const versions = [...new Set(matches.map(m => m[1]))]
  if (versions.length !== 1 || versions[0] !== '3') {
    console.error(`[FAIL] Expected CURRENT_PROJECT_VERSION = 3, got: ${versions.join(', ') || 'none'}`)
    process.exit(1)
  }
  console.log('[OK] iOS CURRENT_PROJECT_VERSION = 3')
}

function checkCapacitorServer() {
  const cfg = readFileSync(join(root, 'ios/App/App/capacitor.config.json'), 'utf8')
  if (!cfg.includes('https://betterbit.app')) {
    console.warn('[WARN] capacitor.config.json server.url is not https://betterbit.app')
    console.warn('       TestFlight loads remote web — deploy Vercel Production before testing.')
  } else {
    console.log('[OK] Capacitor server → https://betterbit.app')
  }
}

console.log('=== TestFlight Build 3a prep ===\n')

checkFeatureFlag()
checkIosBuildNumber()
checkCapacitorServer()

const buildEnv = {
  ...process.env,
  NEXT_PUBLIC_NUTRITION_ACCURACY_V1: 'false',
}

run('npm test')
run('npm run build', { env: buildEnv })
run('npm run cap:sync')

console.log('\n=== Prep complete ===')
console.log('Next (Mac + Xcode 26):')
console.log('  bash scripts/testflight-archive-mac.sh')
console.log('Or: open ios/App/App.xcodeproj → Product → Archive → Upload')
console.log('\nBefore TestFlight test: deploy Vercel Production with NUTRITION_ACCURACY_V1 unset/false.')
