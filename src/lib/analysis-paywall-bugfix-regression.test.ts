import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { formatAnalysisTrendDate } from '@/components/analysis/AnalysisV2Screen'

const root = new URL('../../', import.meta.url)
const source = (path: string) => readFileSync(new URL(path, root), 'utf8')

describe('BUGFIX-ANALYSIS-PAYWALL-001', () => {
  it('formats local analysis dates without a UTC day shift', () => {
    assert.equal(formatAnalysisTrendDate('2026-07-16'), '7 月 16 日')
  })

  it('supports tap selection, active dots, repeat close and outside close', () => {
    const analysis = source('src/components/analysis/AnalysisV2Screen.tsx')
    const css = source('src/styles/betterbit-v2.css')
    assert.match(analysis, /data-analysis-point=/)
    assert.match(analysis, /data-active=\{active \? 'true' : 'false'\}/)
    assert.match(analysis, /current === points\[i\]\.date \? null : points\[i\]\.date/)
    assert.match(analysis, /document\.addEventListener\('pointerdown', closeOutside\)/)
    assert.match(analysis, /data-analysis-tooltip/)
    assert.match(analysis, /clamp\(58px,[\s\S]*calc\(100% - 58px\)/)
    assert.match(css, /\.v2-analysis-line-chart\s*\{[\s\S]*touch-action:\s*pan-y/)
    assert.match(css, /\.v2-analysis-chart-wrap\s*\{[\s\S]*overflow:\s*visible/)
    assert.match(css, /\.v2-analysis-dot--active/)
  })

  it('keeps the existing empty/single-state threshold and enables only weight interaction', () => {
    const analysis = source('src/components/analysis/AnalysisV2Screen.tsx')
    assert.match(analysis, /const hasData = values\.length >= 2/)
    assert.match(analysis, /title="體重趨勢"[\s\S]*stagger=\{160\}[\s\S]*interactive/)
    assert.doesNotMatch(analysis, /title="體脂趨勢"[\s\S]{0,220}interactive/)
  })

  it('uses one bounded flex scroll region for both local legal documents', () => {
    const layout = source('src/components/legal/LegalPageLayout.tsx')
    const shell = source('src/styles/capacitor-ios-shell.css')
    const terms = source('src/app/terms/page.tsx')
    const privacy = source('src/app/privacy/page.tsx')

    assert.match(terms, /LegalPageLayout title="服務條款"/)
    assert.match(privacy, /LegalPageLayout title="隱私權政策"/)
    assert.match(layout, /className="legal-page-shell"/)
    assert.match(layout, /className="legal-page-scroll"/)
    assert.match(layout, /scrollTo\(\{ top: 0, left: 0 \}\)/)
    assert.match(shell, /\.legal-page-shell\s*\{[\s\S]*display:\s*flex[\s\S]*height:\s*100dvh[\s\S]*overflow:\s*hidden/)
    assert.match(shell, /\.legal-page-scroll\s*\{[\s\S]*flex:\s*1 1 auto[\s\S]*min-height:\s*0[\s\S]*overflow-y:\s*auto/)
    assert.match(shell, /-webkit-overflow-scrolling:\s*touch/)
    assert.match(shell, /\.legal-page-main\s*\{[\s\S]*--app-safe-bottom/)
  })

  it('returns to the local paywall with its selected plan intact', () => {
    const paywall = source('src/components/betterbit-v2/ProSubscriptionV2View.tsx')
    assert.match(paywall, /href="\/terms"/)
    assert.match(paywall, /href="\/privacy"/)
    assert.match(paywall, /PAYWALL_PLAN_SESSION_KEY/)
    assert.match(paywall, /sessionStorage\.setItem\(PAYWALL_PLAN_SESSION_KEY, next\)/)
    assert.match(paywall, /saved === 'monthly' \|\| saved === 'yearly'/)
  })
})
