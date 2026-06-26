import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  confidenceToPct,
  isLowConfidence,
  lookupVerifiedFood,
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
