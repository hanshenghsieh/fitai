/**
 * Build 38 BUG 5 — DiceMealPreview must never render "0 kcal" for a meal
 * that includes an item Betterbit genuinely never estimated nutrition for.
 * CASE numbering matches the fix-phase request (CASE 3/4/5 here).
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import DiceMealPreview, { type MealPreviewItem } from '@/components/dashboard/DiceMealPreview'

function item(overrides: Partial<MealPreviewItem> = {}): MealPreviewItem {
  return {
    id: 'i1',
    name: '測試品項',
    store: '測試店家',
    source: 'convenience',
    category: 'lunch',
    role: 'main',
    portionable: false,
    tags: [],
    calories: 100,
    protein_g: 10,
    carbs_g: 10,
    fat_g: 10,
    price: 0,
    photo_url: '',
    description: '',
    nutrition_status: 'official',
    ...overrides,
  }
}

describe('Build 38 BUG 5 — CASE 3: unknown item never renders "0 kcal"', () => {
  it('a single unknown item renders the pending label, not 0 kcal', () => {
    const html = renderToStaticMarkup(
      React.createElement(DiceMealPreview, {
        items: [
          item({
            calories: null,
            protein_g: null,
            carbs_g: null,
            fat_g: null,
            nutrition_status: 'unknown',
          }),
        ],
      })
    )
    assert.equal(html.includes('0 kcal'), false, 'must not render a literal "0 kcal"')
    assert.match(html, /待確認/)
  })
})

describe('Build 38 BUG 5 — CASE 4: known item unchanged (no regression on the previously-fixed macro bug)', () => {
  it('a known 226/5.4/51/1 item still renders its real totals, not "待確認"', () => {
    const html = renderToStaticMarkup(
      React.createElement(DiceMealPreview, {
        items: [
          item({
            calories: 226,
            protein_g: 5.4,
            carbs_g: 51,
            fat_g: 1,
            nutrition_status: 'official',
          }),
        ],
      })
    )
    assert.match(html, /226 kcal/)
    assert.equal(html.includes('待確認'), false)
  })
})

describe('Build 38 BUG 5 — CASE 5: mixed known + unknown items', () => {
  it('one unknown item among known items still shows the pending label, not a partial confident total', () => {
    const html = renderToStaticMarkup(
      React.createElement(DiceMealPreview, {
        items: [
          item({ id: 'known', calories: 300, protein_g: 20, carbs_g: 30, fat_g: 10, nutrition_status: 'official' }),
          item({
            id: 'unknown',
            calories: null,
            protein_g: null,
            carbs_g: null,
            fat_g: null,
            nutrition_status: 'unknown',
          }),
        ],
      })
    )
    // Must not silently sum the known item alone and present it as if it
    // were the whole meal's confident total.
    assert.equal(html.includes('300 kcal'), false)
    assert.match(html, /待確認/)
  })

  it('all-known items still sum normally (no false-positive pending state)', () => {
    const html = renderToStaticMarkup(
      React.createElement(DiceMealPreview, {
        items: [
          item({ id: 'a', calories: 300, protein_g: 20, carbs_g: 30, fat_g: 10, nutrition_status: 'official' }),
          item({ id: 'b', calories: 150, protein_g: 5, carbs_g: 20, fat_g: 5, nutrition_status: 'official' }),
        ],
      })
    )
    assert.match(html, /450 kcal/)
    assert.equal(html.includes('待確認'), false)
  })
})
