#!/usr/bin/env node
/**
 * Pre-release QA gate — run before telling user "ready to test on TestFlight".
 *
 * Usage:
 *   npm run qa:release-gate
 *   BB_E2E_EMAIL=... BB_E2E_PASSWORD=... npm run qa:release-gate
 */
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')
const REPORT_PATH = path.join(ROOT, 'docs/RELEASE_GATE_REPORT.md')

const steps = []

function runStep(name, cmd, { optional = false, env = {} } = {}) {
  console.log(`\n=== ${name} ===\n> ${cmd}\n`)
  const started = Date.now()
  try {
    execSync(cmd, {
      cwd: ROOT,
      stdio: 'inherit',
      env: { ...process.env, ...env },
    })
    steps.push({ name, status: 'pass', ms: Date.now() - started })
    return true
  } catch (err) {
    steps.push({
      name,
      status: optional ? 'warn' : 'fail',
      ms: Date.now() - started,
      detail: err instanceof Error ? err.message : String(err),
    })
    if (!optional) return false
    console.warn(`[WARN] ${name} failed (optional)`)
    return true
  }
}

function writeReport() {
  const failed = steps.some(s => s.status === 'fail')
  const warned = steps.filter(s => s.status === 'warn')
  const lines = [
    '# Release Gate Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    `## Verdict: ${failed ? '**FAIL** — do not ship / do not ask user to test' : '**PASS** — automated gate clear'}`,
    '',
    warned.length
      ? `> ${warned.length} optional step(s) skipped or warned — see below.`
      : '> All required steps passed.',
    '',
    '## Steps',
    '',
    '| Step | Status | Time |',
    '|------|--------|------|',
    ...steps.map(s => {
      const icon = s.status === 'pass' ? '✅' : s.status === 'warn' ? '⚠️' : '❌'
      return `| ${s.name} | ${icon} ${s.status} | ${s.ms}ms |`
    }),
    '',
    '## Required before TestFlight handoff',
    '',
    '- [ ] `npm run qa:release-gate` — all required steps green',
    '- [ ] Manual TestFlight: IAP subscribe + restore + reinstall',
    '- [ ] Manual: delete meal → switch tab → return (if E2E skipped)',
    '',
    '## Env for full E2E',
    '',
    '```bash',
    'BB_E2E_EMAIL=your@test.com BB_E2E_PASSWORD=secret npm run qa:release-gate',
    '```',
    '',
  ]
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true })
  fs.writeFileSync(REPORT_PATH, lines.join('\n'), 'utf8')
  console.log(`\nReport: ${REPORT_PATH}`)
  return failed
}

console.log('=== BetterBit Release Gate ===\n')

let ok = true
ok = runStep('Unit tests (npm test)', 'npm test') && ok
ok =
  runStep('Regression unit tests', 'npm run qa:release-gate:unit') && ok
ok = runStep('E2E coverage scan', 'npm run qa:e2e-coverage') && ok
ok =
  runStep('Button registry scan (warn only)', 'npm run qa:buttons', { optional: true }) && ok

const hasE2eCreds = !!(process.env.BB_E2E_EMAIL && process.env.BB_E2E_PASSWORD)
if (hasE2eCreds) {
  ok =
    runStep('Food log persist E2E (add + delete + tab)', 'npm run qa:food-log-persist-e2e') &&
    ok
} else {
  console.log('\n=== Food log persist E2E ===')
  console.log('SKIP: set BB_E2E_EMAIL + BB_E2E_PASSWORD for live browser E2E\n')
  steps.push({ name: 'Food log persist E2E', status: 'warn', ms: 0, detail: 'credentials not set' })
}

const failed = writeReport()
if (!ok || failed) {
  console.error('\n[FAIL] Release gate did not pass.')
  process.exit(1)
}
console.log('\n[PASS] Release gate clear.')
