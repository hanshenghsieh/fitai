import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { ConvenienceItem } from '@/lib/convenience-store-menu'
import {
  buildNutritionTraceFromStaging,
  formatNutritionTraceLine,
  inferSourceName,
  resolveNutritionTrace,
  tierToTraceSourceType,
  traceCoverageStats,
} from './nutrition-source-trace'
import { compileNutritionTraceFromSources } from './menu-backfill/verification'

function item(partial: Partial<ConvenienceItem> & Pick<ConvenienceItem, 'id' | 'name' | 'store'>): ConvenienceItem {
  return {
    category: 'lunch',
    source: 'convenience',
    role: 'combo',
    portionable: false,
    tags: [],
    calories: 500,
    protein_g: 31,
    carbs_g: 56,
    fat_g: 17,
    price: 89,
    photo_url: '',
    description: '京醬鴨絲飯：31g 蛋白質，500 kcal',
    ...partial,
  }
}

describe('nutrition-source-trace', () => {
  it('maps tiers to trace source types', () => {
    assert.equal(tierToTraceSourceType('official'), 'official')
    assert.equal(tierToTraceSourceType('usda_tfda', 'USDA ref'), 'usda')
    assert.equal(tierToTraceSourceType('usda_tfda', '衛福部資料'), 'mohw')
    assert.equal(tierToTraceSourceType('food_dna_template'), 'food_dna')
  })

  it('resolves explicit nutrition_trace', () => {
    const traced = item({
      id: 't-1',
      name: '舒肥雞胸便當',
      store: '7-11',
      nutrition_trace: buildNutritionTraceFromStaging({
        source_type: 'official',
        source_name: '7-11 官方營養標示',
        verified_at: '2026-06-01T00:00:00.000Z',
        verification_count: 2,
        confidence: 'A',
        last_reviewed: '2026-06-15T00:00:00.000Z',
      }),
    })
    const trace = resolveNutritionTrace(traced)
    assert.equal(trace.source_type, 'official')
    assert.equal(trace.verification_count, 2)
    assert.equal(trace.confidence, 'A')
    assert.ok(formatNutritionTraceLine(trace).includes('官方'))
  })

  it('infers brand trace for convenience items', () => {
    const trace = resolveNutritionTrace(item({ id: 'c-1', name: '測試', store: '全家' }))
    assert.equal(trace.source_type, 'brand')
    assert.equal(inferSourceName({ store: '全家', name: 'x', source: 'convenience' }, 'brand'), '全家 品牌公開菜單')
    assert.equal(trace.verification_count, 1)
  })

  it('compiles trace from staging sources', () => {
    const trace = compileNutritionTraceFromSources({
      sources: [
        {
          priority: 'A',
          source_type: 'official_website',
          source_url: 'https://example.com/nutrition',
          observed_at: '2026-06-10',
          nutrition: { calories: 520, protein_g: 42 },
        },
        {
          priority: 'B',
          source_type: 'ubereats',
          source_url: 'https://ubereats.com/item',
          observed_at: '2026-06-12',
          nutrition: { calories: 525, protein_g: 43 },
        },
      ],
      source_name: '王品牛排 官方菜單',
      confidence: 'A',
      verified_by: 'nutrition-qa',
    })
    assert.equal(trace.source_type, 'official')
    assert.equal(trace.verification_count, 2)
    assert.equal(trace.last_reviewed, '2026-06-12')
  })

  it('reports trace coverage stats', () => {
    const stats = traceCoverageStats([
      item({ id: 'a', name: 'a', store: '7-11' }),
      item({
        id: 'b',
        name: 'b',
        store: '7-11',
        nutrition_trace: buildNutritionTraceFromStaging({
          source_type: 'official',
          source_name: '7-11',
          verified_at: '2026-01-01',
          verification_count: 2,
          confidence: 'A',
        }),
      }),
    ])
    assert.equal(stats.total, 2)
    assert.equal(stats.explicit_trace, 1)
    assert.equal(stats.inferred_trace, 1)
  })
})
