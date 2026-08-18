import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Row } from './page'
import { KPI_ALERT_COLOR } from '@/lib/founder-dashboard/kpi-alerts'

/**
 * Founder Attention System — render regression for the actual presentation
 * mechanism every alert-colored KPI in page.tsx goes through (Row's
 * valueColor prop). This does not render the full page (that needs a
 * Supabase client + admin auth session, out of scope for a "don't
 * refactor for tests" render check) — it proves the one shared rendering
 * primitive works, per PHASE 9's explicit "extract a pure presentation
 * helper" fallback.
 */
describe('Founder Attention System — Row render regression', () => {
  it('a danger-level KPI renders its value in the danger red color', () => {
    const html = renderToStaticMarkup(
      React.createElement(Row, { label: '拍照解析率', value: '26.1%', valueColor: KPI_ALERT_COLOR.danger })
    )
    assert.match(html, /26\.1%/)
    assert.match(html, new RegExp(KPI_ALERT_COLOR.danger!.replace('#', '')))
  })

  it('a normal-level KPI (no valueColor) renders with no color override at all', () => {
    const html = renderToStaticMarkup(React.createElement(Row, { label: '拍照解析率', value: '92%' }))
    assert.match(html, /92%/)
    // No danger or insufficient-data color leaked in when valueColor is omitted.
    assert.doesNotMatch(html, new RegExp(KPI_ALERT_COLOR.danger!.replace('#', '')))
    assert.doesNotMatch(html, new RegExp(KPI_ALERT_COLOR.insufficient_data!.replace('#', '')))
  })

  it('an insufficient_data KPI renders in the grey insufficient-data color, never the danger color', () => {
    const html = renderToStaticMarkup(
      React.createElement(Row, { label: '拍照解析率', value: '資料不足', valueColor: KPI_ALERT_COLOR.insufficient_data })
    )
    assert.match(html, /資料不足/)
    assert.match(html, new RegExp(KPI_ALERT_COLOR.insufficient_data!.replace('#', '')))
    assert.doesNotMatch(html, new RegExp(KPI_ALERT_COLOR.danger!.replace('#', '')))
  })

  it('the label itself is never recolored by valueColor — only the value span changes', () => {
    const dangerHtml = renderToStaticMarkup(
      React.createElement(Row, { label: '拍照解析率', value: '26.1%', valueColor: KPI_ALERT_COLOR.danger })
    )
    const normalHtml = renderToStaticMarkup(React.createElement(Row, { label: '拍照解析率', value: '92%' }))
    // Label color (#666) is identical regardless of the value's alert level.
    const labelColorMatch = /color:#666/
    assert.match(dangerHtml, labelColorMatch)
    assert.match(normalHtml, labelColorMatch)
  })
})
