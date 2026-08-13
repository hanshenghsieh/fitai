import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  confidenceToPct,
  isLowConfidence,
  lookupVerifiedFood,
  parsePhotoApiResponse,
  scaledDimensions,
  NATIVE_PHOTO_MAX_EDGE,
  NATIVE_PHOTO_JPEG_QUALITY,
  type PhotoParseResult,
} from '@/lib/food-capture'
import type { FoodDna } from '@/lib/food-memory'
import {
  buildPhotoLogCommitFromAccuracy,
  createPhotoAccuracyState,
} from '@/lib/nutrition/photo-log-accuracy'

describe('Photo capture — label only, no AI nutrition', () => {
  it('FC1: PhotoParseResult type enforces ai_nutrition_suppressed', () => {
    const result: PhotoParseResult = {
      name: '雞腿便當',
      confidence: 'medium',
      confidence_pct: 60,
      ai_nutrition_suppressed: true,
    }
    assert.equal(result.ai_nutrition_suppressed, true)
    assert.ok(!('calories' in result))
  })

  it('FC2: lookupVerifiedFood not used for photo nutrition writes', () => {
    const dna: FoodDna = {
      frequent: [
        {
          id: 'dna-1',
          name: '椰香綠咖哩嫩雞飯',
          calories: 9999,
          protein_g: 99,
          count: 3,
          last_used: '2026-01-01',
          cluster_hero_image: 'https://example.com/hero.jpg',
        },
      ],
    }
    const hit = lookupVerifiedFood('椰香綠咖哩嫩雞飯', dna)
    assert.ok(hit?.cluster_hero_image)
    const photoState = createPhotoAccuracyState('椰香綠咖哩嫩雞飯')
    if (photoState.v2.outcome.level === 'A') {
      const commit = buildPhotoLogCommitFromAccuracy(photoState, { id: 'fc2' })
      assert.ok(commit.payload)
      assert.notEqual(commit.payload!.calories, 9999)
    }
  })

  it('FC3: lookupVerifiedFood does not match single-use frequent food', () => {
    const dna: FoodDna = {
      frequent: [
        {
          id: 'dna-2',
          name: '神秘便當',
          calories: 500,
          protein_g: 20,
          count: 1,
          last_used: '2026-01-01',
        },
      ],
    }
    assert.equal(lookupVerifiedFood('神秘便當', dna), null)
  })

  it('FC4: low confidence threshold blocks fake precision', () => {
    assert.equal(isLowConfidence(confidenceToPct('low')), true)
    assert.equal(isLowConfidence(confidenceToPct('high')), false)
  })
})

describe('Build 38 BUG 4 — dish-first client-side naming rule', () => {
  it('FC5: composite dish uses dish_name, ignores the per-item breakdown for naming', () => {
    const result = parsePhotoApiResponse({
      data: {
        is_composite_dish: true,
        dish_name: '任意整道料理',
        items: [
          { name: '視覺誤判食材甲', confidence: 'medium' },
          { name: '視覺誤判食材乙', confidence: 'low' },
        ],
      },
    })
    assert.equal(result.name, '任意整道料理')
  })

  it('FC6: genuinely independent multi-item photo still joins with " + "', () => {
    const result = parsePhotoApiResponse({
      data: {
        is_composite_dish: false,
        items: [
          { name: '獨立食物甲', confidence: 'high' },
          { name: '獨立食物乙', confidence: 'high' },
        ],
      },
    })
    assert.equal(result.name, '獨立食物甲 + 獨立食物乙')
  })

  it('FC7: is_composite_dish true but dish_name missing falls back to the join rule (never silently empty)', () => {
    const result = parsePhotoApiResponse({
      data: {
        is_composite_dish: true,
        items: [
          { name: '食物甲', confidence: 'high' },
          { name: '食物乙', confidence: 'high' },
        ],
      },
    })
    assert.equal(result.name, '食物甲 + 食物乙')
  })

  it('FC8: old-shape response (no is_composite_dish/dish_name fields at all) behaves exactly as before', () => {
    const result = parsePhotoApiResponse({
      data: { items: [{ name: '單一食物', confidence: 'high' }] },
    })
    assert.equal(result.name, '單一食物')
  })
})

describe('Build 38 BUG 4 — first-pass photo quality', () => {
  it('IMG1: first-pass max edge raised from the old 512px default, still well inside existing payload caps', () => {
    assert.equal(NATIVE_PHOTO_MAX_EDGE, 1024)
    assert.ok(NATIVE_PHOTO_JPEG_QUALITY >= 0.75)
  })

  it('IMG2: a normal phone photo resolution is not crushed to 512px on the first pass', () => {
    // Typical iPhone photo — long edge far bigger than either candidate max edge.
    const dims = scaledDimensions(3024, 4032, NATIVE_PHOTO_MAX_EDGE)
    assert.equal(Math.max(dims.width, dims.height), 1024)
    assert.notEqual(Math.max(dims.width, dims.height), 512)
  })

  it('IMG3: a photo already smaller than the max edge is never upscaled', () => {
    const dims = scaledDimensions(600, 800, NATIVE_PHOTO_MAX_EDGE)
    assert.equal(dims.width, 600)
    assert.equal(dims.height, 800)
  })
})
