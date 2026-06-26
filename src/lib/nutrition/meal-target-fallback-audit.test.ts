import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { auditMenuForMealTargetFallback } from './meal-target-fallback-audit'
import type { ConvenienceItem } from '@/lib/convenience-store-menu'

function item(partial: Partial<ConvenienceItem> & Pick<ConvenienceItem, 'id' | 'name' | 'store'>): ConvenienceItem {
  return {
    source: 'convenience',
    category: 'lunch',
    role: 'main',
    portionable: false,
    tags: [],
    calories: 400,
    protein_g: 25,
    carbs_g: 40,
    fat_g: 12,
    price: 80,
    photo_url: '',
    description: 'verified',
    ...partial,
  }
}

describe('meal-target-fallback-audit', () => {
  it('flags exact 632/22 placeholder signature', () => {
    const report = auditMenuForMealTargetFallback([
      item({ id: 'bad', name: '假品項', store: '7-11', calories: 632, protein_g: 22 }),
      item({ id: 'ok', name: '真品項', store: '7-11', calories: 103, protein_g: 8 }),
    ])
    assert.equal(report.pass, false)
    assert.ok(report.issues.some(i => i.kind === 'meal_target_fallback' && i.id === 'bad'))
    assert.ok(!report.issues.some(i => i.kind === 'meal_target_fallback' && i.id === 'ok'))
  })

  it('passes varied realistic macros', () => {
    const report = auditMenuForMealTargetFallback([
      item({ id: 'a', name: '雞胸', store: '7-11', calories: 210, protein_g: 24 }),
      item({ id: 'b', name: '沙拉', store: '7-11', calories: 180, protein_g: 9 }),
    ])
    assert.equal(report.pass, true)
  })
})
