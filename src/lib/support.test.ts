/**
 * BetterBit support-email cleanup — the app's real-device "設定 → 聯絡客服
 * → Email 客服" screen was still showing the old FitAI-era address
 * (support@fitai.app). SUPPORT_EMAIL (src/lib/support.ts) was already the
 * single source of truth every consumer imports — the bug was purely its
 * value, plus one file (Footer.tsx, the marketing site) that had drifted
 * into its own separate hardcoded copy of the *correct* email instead of
 * importing the constant. CASE numbering matches the cleanup request.
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { SUPPORT_EMAIL } from '@/lib/support'
import SettingsSupportSection from '@/components/settings/SettingsSupportSection'

const ROOT = process.cwd()

function readSrc(relPath: string): string {
  return readFileSync(path.join(ROOT, relPath), 'utf8')
}

// Every file this session's investigation confirmed sends a real "contact
// support" email (UI display and/or mailto) — the full set that must all
// resolve through the same constant.
const SUPPORT_EMAIL_CONSUMERS = [
  'src/app/privacy/page.tsx',
  'src/app/terms/page.tsx',
  'src/app/support/page.tsx',
  'src/components/settings/SettingsSupportSection.tsx',
  'src/components/betterbit-v2/settings/subpages/ContactSupportView.tsx',
  'src/components/marketing/sections/Footer.tsx',
]

describe('Build 38 — support email cleanup — CASE 1: correct address', () => {
  it('SUPPORT_EMAIL is the current BetterBit support address, not the old FitAI one', () => {
    assert.equal(SUPPORT_EMAIL, 'hansheng@betterbit.tw')
    assert.notEqual(SUPPORT_EMAIL, 'support@fitai.app')
  })

  it('the real "設定 → 聯絡客服 → 跟我們說" screen renders with no trace of the old address', () => {
    // "跟我們說"'s mailto is built inside an onClick handler (a <button>,
    // not a static <a href>), so it isn't present in server-rendered
    // markup — that exact wiring is verified via source scan in CASE 2
    // instead. This render pass proves the real component tree at least
    // mounts cleanly and never leaks the old literal anywhere in its output.
    const html = renderToStaticMarkup(React.createElement(SettingsSupportSection))
    assert.match(html, /跟我們說/)
    assert.equal(html.includes('fitai.app'), false)
  })
})

describe('Build 38 — support email cleanup — CASE 2: mailto recipient matches the displayed address', () => {
  it('every known support-email consumer builds its mailto/display from SUPPORT_EMAIL, not a separate hardcoded literal', () => {
    for (const file of SUPPORT_EMAIL_CONSUMERS) {
      const src = readSrc(file)
      assert.match(src, /SUPPORT_EMAIL/, `${file} must import/use SUPPORT_EMAIL`)
      // No independent hardcoded copy of either the old or the (now correct)
      // literal address — every occurrence must go through the constant, or
      // a second file could silently drift again later (exactly what
      // happened to Footer.tsx before this fix).
      assert.equal(
        /['"`]hansheng@betterbit\.tw['"`]/.test(src),
        false,
        `${file} must reference \${SUPPORT_EMAIL}, not a separate hardcoded literal`
      )
    }
  })
})

describe('Build 38 — support email cleanup — CASE 3: old FitAI address gone from runtime source', () => {
  it('support@fitai.app no longer appears in src/ or the iOS native project (docs/history excluded)', () => {
    // Scope: everything that actually ships in the web/API/iOS runtime.
    // Explicitly excludes docs/*.md and SETUP_GUIDE.md, which are
    // non-runtime historical/tracking documents (see report item M) —
    // DOMAIN_MIGRATION_REPORT.md in particular is a record of a past
    // migration and must keep the old address as history, not be "fixed".
    const offenders: string[] = []
    function walk(dir: string) {
      const { readdirSync, statSync } = require('node:fs') as typeof import('node:fs')
      for (const entry of readdirSync(path.join(ROOT, dir))) {
        if (entry === 'public' || entry === 'node_modules' || entry.startsWith('.')) continue
        const rel = path.join(dir, entry)
        const full = path.join(ROOT, rel)
        const stat = statSync(full)
        if (stat.isDirectory()) {
          walk(rel)
        } else if (/\.(ts|tsx|swift|plist|json)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
          // Test files themselves are allowed to *mention* the old address
          // in comments/fixtures while documenting/locking this exact
          // cleanup (this file included) — only non-test source counts.
          const content = readFileSync(full, 'utf8')
          if (content.includes('support@fitai.app')) offenders.push(rel)
        }
      }
    }
    walk('src')
    walk('ios/App/App')
    assert.deepEqual(offenders, [], `found stale support@fitai.app in: ${offenders.join(', ')}`)
  })
})

describe('Build 38 — support email cleanup — CASE 4: no independent server-side recipient to miss', () => {
  it('the contact form has no support-email-sending API route — it uses mailto only, confirmed in ContactSupportView source', () => {
    const src = readSrc('src/components/betterbit-v2/settings/subpages/ContactSupportView.tsx')
    // handleSubmit ("聯絡表單" submit) must use the same mailto path as
    // handleEmailSupport, not a separate fetch/API call with its own
    // recipient that this fix could have missed.
    assert.match(src, /目前使用 mailto 安全提交/)
    assert.doesNotMatch(src, /fetch\(|apiFetch\(/)
  })
})

describe('Build 38 — support email cleanup — CASE 5: unrelated domains/URLs untouched', () => {
  it('Footer.tsx keeps its non-support URLs exactly as before (Instagram, marketing anchors, legal page paths)', () => {
    const src = readSrc('src/components/marketing/sections/Footer.tsx')
    assert.match(src, /https:\/\/www\.instagram\.com\/betterbit\.tw\//)
    assert.match(src, /#features/)
    assert.match(src, /#how-it-works/)
    assert.match(src, /#pricing/)
    assert.match(src, /#faq/)
    assert.match(src, /\/terms/)
    assert.match(src, /\/privacy/)
  })

  it('app-level API base / Supabase URLs are untouched by this change (support.ts only exports email + display name)', () => {
    const src = readSrc('src/lib/support.ts')
    assert.doesNotMatch(src, /supabase|API_BASE_URL|betterbit\.app/i)
  })
})
