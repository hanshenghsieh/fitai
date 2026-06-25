#!/usr/bin/env node
/**
 * Static button handler verification for BetterBit QA.
 * Run: npm run qa:buttons
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { BUTTON_REGISTRY } from './button-registry.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')
const REPORT_PATH = path.join(ROOT, 'docs/APP_BUTTON_QA_REPORT.md')

function readFile(rel) {
  const full = path.join(ROOT, rel.replace(/\//g, path.sep))
  if (!fs.existsSync(full)) return null
  return fs.readFileSync(full, 'utf8')
}

function staticCheck(entry) {
  const content = readFile(entry.file)
  if (!content) {
    return { ok: false, issue: `File not found: ${entry.file}`, severity: 'P0' }
  }
  const missing = entry.patterns.filter(p => !content.includes(p))
  if (missing.length > 0) {
    return {
      ok: false,
      issue: `Missing patterns: ${missing.join(', ')}`,
      severity: 'P1',
    }
  }
  return { ok: true, issue: '', severity: '' }
}

function escapeCell(s) {
  return String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ')
}

function main() {
  const results = BUTTON_REGISTRY.map(entry => {
    const check = staticCheck(entry)
    return {
      ...entry,
      static_handler_found: check.ok ? 'yes' : 'no',
      dynamic_click_tested: 'manual',
      result: check.ok ? 'pass' : 'fail',
      issue: check.issue,
      severity: check.ok ? '' : check.severity,
      fix_applied: '',
    }
  })

  const pass = results.filter(r => r.result === 'pass').length
  const fail = results.filter(r => r.result === 'fail').length

  const lines = [
    '# BetterBit App Button QA Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Summary',
    '',
    `| Metric | Count |`,
    `|--------|-------|`,
    `| Total buttons | ${results.length} |`,
    `| Static pass | ${pass} |`,
    `| Static fail | ${fail} |`,
    `| Dynamic (manual/E2E) | ${results.length} pending manual |`,
    '',
    '## Methodology',
    '',
    '1. **Static verification** — `npm run qa:buttons` scans source for onClick / href / onSubmit patterns.',
    '2. **Dynamic verification** — Manual checklist on iOS WebView + desktop mobile viewport. Playwright not installed; Puppeteer available but requires running dev server.',
    '',
    '## Manual QA Checklist (dynamic)',
    '',
    'For each button below, verify on device:',
    '- Tap responds',
    '- No console error',
    '- Correct navigation / modal open-close',
    '- Not obscured at 390×844',
    '- iOS WebView (Capacitor) works',
    '',
    '## Results',
    '',
    '| page | button_name | selector_or_text | static_handler_found | dynamic_click_tested | result | issue | severity | fix_applied |',
    '|---|---|---|---|---|---|---|---|---|',
  ]

  for (const r of results) {
    lines.push(
      `| ${escapeCell(r.page)} | ${escapeCell(r.button_name)} | ${escapeCell(r.selector_or_text)} | ${r.static_handler_found} | ${r.dynamic_click_tested} | ${r.result} | ${escapeCell(r.issue)} | ${r.severity} | ${r.fix_applied} |`
    )
  }

  lines.push('')
  lines.push('## Known issues (non-blocking)')
  lines.push('')
  lines.push('| Issue | Severity | Notes |')
  lines.push('|-------|----------|-------|')
  lines.push('| NotificationPrompt buttons lack `type="button"` | P3 | Low risk outside forms |')
  lines.push('| Workout expand / exercise toggle icon-only | P3 | Consider aria-label |')
  lines.push('| Settings privacy rows use `window.location.href` | P3 | Works; full page nav |')
  lines.push('| PhotoLogSheet backdrop closes without save prompt | P3 | UX edge case |')
  lines.push('| Display-only settings rows (Email, 你的資料) | P3 | Intentional |')
  lines.push('')

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true })
  fs.writeFileSync(REPORT_PATH, lines.join('\n'), 'utf8')

  console.log(`QA scan complete: ${pass}/${results.length} static pass, ${fail} fail`)
  console.log(`Report: ${REPORT_PATH}`)
  if (fail > 0) {
    for (const r of results.filter(x => x.result === 'fail')) {
      console.error(`FAIL [${r.page}] ${r.button_name}: ${r.issue}`)
    }
    process.exit(1)
  }
}

main()
