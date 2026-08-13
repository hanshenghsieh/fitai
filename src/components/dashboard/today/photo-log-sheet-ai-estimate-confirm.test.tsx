/**
 * Build 38 BUG 4 — the Level C ("AI estimate" / compound-DB estimate)
 * confirm dead-end: the macro card was shown (show_macros=true) but no
 * control anywhere could set user_confirmed=true, so photoV2ReadyForLog
 * stayed false forever. These tests lock both the state transition
 * (photoV2ReadyForLog) and the actual rendered UI affordance — a boolean
 * check alone would not have caught the missing button.
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { AccuracyConfirmSection } from '@/components/dashboard/today/PhotoLogSheet'
import {
  createPhotoV2State,
  photoV2ReadyForLog,
  updatePhotoV2State,
} from '@/lib/nutrition/search-v2/photo-pipeline'
import { photoAccuracyStateFromV2 } from '@/lib/nutrition/photo-log-accuracy'
import { aiEstimateToCandidate } from '@/lib/nutrition/ai-nutrition-fallback'
import type { AiNutritionEstimate } from '@/lib/claude/schemas'

function levelCState(query: string) {
  const base = createPhotoV2State(query)
  const estimate: AiNutritionEstimate = {
    canonical_name: query,
    estimated_weight_g: 100,
    calories: 150,
    protein_g: 10,
    carbs_g: 15,
    fat_g: 5,
    confidence: 0.6,
    reason: '測試用估算',
    source_type: 'ai_estimate',
  }
  const aiCandidate = aiEstimateToCandidate(estimate, false)
  return {
    ...base,
    outcome: {
      level: 'C' as const,
      action: 'create_official' as const,
      query,
      explanation: aiCandidate.explanation,
      candidates: [aiCandidate],
      official_record: aiCandidate,
    },
  }
}

describe('Build 38 BUG 4 — CASE 3: Level C confirmation state transition', () => {
  it('not ready before confirmation, ready after user_confirmed=true', () => {
    const v2 = levelCState('未知食物不在資料庫')
    assert.equal(photoV2ReadyForLog(v2), false)

    const confirmed = updatePhotoV2State(v2, { user_confirmed: true })
    assert.equal(photoV2ReadyForLog(confirmed), true)
  })
})

describe('Build 38 BUG 4 — CASE 4: UI must expose a real control for the transition', () => {
  it('renders an actionable confirm button when is_ai_estimate && !user_confirmed (not just a boolean)', () => {
    const v2 = levelCState('未知食物不在資料庫')
    const accuracy = photoAccuracyStateFromV2(v2)
    assert.equal(accuracy.is_ai_estimate, true)
    assert.equal(accuracy.show_candidate_picker, false)
    assert.equal(accuracy.answers.user_confirmed, false)

    const html = renderToStaticMarkup(
      React.createElement(AccuracyConfirmSection, {
        accuracy,
        onAccuracyChange: () => {},
      })
    )
    assert.match(html, /<button[^>]*>這樣記錄可以<\/button>/)
  })

  it('confirm button disappears once already confirmed (no duplicate control)', () => {
    const v2 = updatePhotoV2State(levelCState('未知食物不在資料庫'), { user_confirmed: true })
    const accuracy = photoAccuracyStateFromV2(v2)
    const html = renderToStaticMarkup(
      React.createElement(AccuracyConfirmSection, {
        accuracy,
        onAccuracyChange: () => {},
      })
    )
    assert.equal(html.includes('這樣記錄可以'), false)
  })

  it('clicking the confirm button fires onAccuracyChange({ user_confirmed: true })', () => {
    const v2 = levelCState('未知食物不在資料庫')
    const accuracy = photoAccuracyStateFromV2(v2)
    let received: unknown = null
    // Extract the onClick handler directly from the element tree (no jsdom
    // in this test environment) and invoke it — proves the button is wired
    // to the real state-transition callback, not just present in markup.
    const element = React.createElement(AccuracyConfirmSection, {
      accuracy,
      onAccuracyChange: (patch: unknown) => {
        received = patch
      },
    }) as React.ReactElement
    function findButtonOnClick(node: React.ReactNode): (() => void) | null {
      if (!node || typeof node !== 'object') return null
      const el = node as React.ReactElement<any>
      if (el.type === 'button' && typeof el.props?.onClick === 'function') {
        return el.props.onClick
      }
      const children = el.props?.children
      const list = Array.isArray(children) ? children : [children]
      for (const child of list) {
        const found = findButtonOnClick(child)
        if (found) return found
      }
      return null
    }
    // Render function components down to host elements by calling them directly.
    function resolve(node: React.ReactNode): React.ReactNode {
      if (node && typeof node === 'object' && 'type' in (node as any)) {
        const el = node as React.ReactElement<any>
        if (typeof el.type === 'function') {
          return resolve((el.type as (p: unknown) => React.ReactNode)(el.props))
        }
      }
      return node
    }
    const resolved = resolve(element)
    const onClick = findButtonOnClick(resolved)
    assert.ok(onClick, 'expected to find the confirm button onClick handler')
    onClick!()
    assert.deepEqual(received, { user_confirmed: true })
  })
})
