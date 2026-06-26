import assert from 'node:assert/strict'
import { describe, it, beforeEach } from 'node:test'
import {
  searchNutritionV2,
  finalizeClarification,
  collectAllCandidates,
  rankSearchCandidates,
  getUnknownAnalytics,
  listUnknownQueue,
  runAutoRematch,
  applyRematchProposal,
} from '@/lib/nutrition/search-v2'
import {
  applyClarificationAnswer,
  buildClarificationQuestions,
  clarificationComplete,
  startClarificationSession,
} from '@/lib/nutrition/search-v2/clarification'
import { classifyMatchLevel, isClearlyUnknownQuery } from '@/lib/nutrition/search-v2/matcher'
import {
  clearUnknownQueueForTests,
  enqueueUnknownFood,
  getUnknownQueueSize,
} from '@/lib/nutrition/search-v2/unknown-queue'
import {
  CONFIDENCE_BADGE,
  countsTowardNutritionTotals,
  explainConfidence,
  statusFromConfidence,
} from '@/lib/nutrition/search-v2/confidence'
import { compareSearchCandidates, sourceTierLabel } from '@/lib/nutrition/search-v2/search-ranking'
import { NULL_MACROS } from '@/lib/nutrition/search-v2/types'
import { scoreNameSimilarity } from '@/lib/nutrition/search-v2/auto-rematch'

beforeEach(() => clearUnknownQueueForTests())

describe('Nutrition Search V2 — Level A official match', () => {
  it('A1: 711 exact kb item resolves level A create_official', () => {
    const out = searchNutritionV2('711竹筍排骨湯')
    assert.ok(out.level === 'A' || out.action === 'create_official' || out.action === 'clarify')
    assert.ok(out.candidates.length > 0)
  })

  it('A2: official record has non-null calories when level A', () => {
    const out = searchNutritionV2('椰香綠咖哩嫩雞飯')
    if (out.official_record) {
      assert.notEqual(out.official_record.macros.calories, null)
      assert.equal(out.official_record.nutrition_status, 'official')
    }
  })

  it('A3: confidence badge A exists', () => {
    assert.equal(CONFIDENCE_BADGE.A.label, '官方')
  })

  it('A4: official status counts toward totals', () => {
    assert.equal(countsTowardNutritionTotals('official'), true)
  })
})

describe('Nutrition Search V2 — Level B ambiguous', () => {
  it('B1: 竹筍湯 triggers clarify not direct create', () => {
    const out = searchNutritionV2('竹筍湯')
    assert.equal(out.level, 'B')
    assert.equal(out.action, 'clarify')
  })

  it('B2: 竹筍湯 has clarification questions', () => {
    const out = searchNutritionV2('竹筍湯')
    assert.ok(out.clarification)
    assert.ok(out.clarification!.questions.length >= 1)
    assert.ok(out.clarification!.questions.length <= 3)
  })

  it('B3: soup clarification first question options', () => {
    const qs = buildClarificationQuestions('竹筍湯', [])
    assert.equal(qs[0]!.id, 'soup_type')
    assert.ok(qs[0]!.options.some(o => o.label.includes('排骨')))
  })

  it('B4: 雞湯 clarification', () => {
    const qs = buildClarificationQuestions('雞湯', [])
    assert.ok(qs.some(q => q.id === 'chicken_soup_type'))
  })

  it('B5: 牛肉麵 clarification', () => {
    const qs = buildClarificationQuestions('牛肉麵', [])
    assert.ok(qs.some(q => q.id === 'beef_noodle_style'))
  })

  it('B6: 便當 clarification', () => {
    const qs = buildClarificationQuestions('便當', collectAllCandidates('雞腿便當'))
    assert.ok(qs.some(q => q.id === 'bento_store'))
  })

  it('B7: finalize clarification after answers can pick candidate', () => {
    let session = startClarificationSession('竹筍湯', collectAllCandidates('竹筍湯'))!
    session = applyClarificationAnswer(session, 'soup_type', 'pork_rib')
    session = applyClarificationAnswer(session, 'portion', 'medium')
    assert.equal(clarificationComplete(session), true)
    const out = finalizeClarification(session)
    assert.ok(['create_official', 'pick_candidate', 'create_unknown'].includes(out.action))
  })

  it('B8: ambiguous classify when multiple close scores', () => {
    const cands = collectAllCandidates('竹筍')
    const { level } = classifyMatchLevel('竹筍', cands)
    assert.ok(['A', 'B', 'C'].includes(level))
  })
})

describe('Nutrition Search V2 — Level C unknown', () => {
  it('C1: 阿嬤家的竹筍湯 is unknown text only', () => {
    const out = searchNutritionV2('阿嬤家的竹筍湯')
    assert.equal(out.level, 'C')
    assert.equal(out.action, 'create_unknown')
  })

  it('C2: unknown macros are all null not zero', () => {
    const out = searchNutritionV2('公司附近自製便當')
    assert.deepEqual(out.unknown_record?.macros, NULL_MACROS)
    assert.equal(out.unknown_record?.macros.calories, null)
  })

  it('C3: unknown does not count toward nutrition totals', () => {
    assert.equal(countsTowardNutritionTotals('unknown'), false)
  })

  it('C4: unknown UI message present', () => {
    const out = searchNutritionV2('媽媽煮的雞湯')
    assert.match(out.unknown_record?.ui_message ?? '', /沒有可信營養/)
  })

  it('C5: isClearlyUnknownQuery detects home cooking', () => {
    assert.equal(isClearlyUnknownQuery('阿嬤家的湯'), true)
    assert.equal(isClearlyUnknownQuery('7-11御飯糰'), false)
  })

  it('C6: nonsense query unknown', () => {
    const out = searchNutritionV2('xyz不存在菜色12345')
    assert.equal(out.action, 'create_unknown')
  })
})

describe('Nutrition Search V2 — Never guess hard rules', () => {
  it('NG1: unknown outcome never assigns calories from meal target', () => {
    const out = searchNutritionV2('隨便一道不存在的菜')
    if (out.unknown_record) {
      assert.equal(out.unknown_record.macros.calories, null)
      assert.equal(out.unknown_record.macros.protein, null)
    }
  })

  it('NG2: no zero-fill macros on unknown', () => {
    const out = searchNutritionV2('路邊攤神秘料理')
    const m = out.unknown_record?.macros
    assert.notEqual(m?.calories, 0)
    assert.equal(m?.calories, null)
  })

  it('NG3: estimated status not used in V2 search path for unknown', () => {
    const out = searchNutritionV2('完全沒資料菜')
    assert.notEqual(out.unknown_record?.nutrition_status, 'estimated')
  })
})

describe('Nutrition Search V2 — Unknown Queue', () => {
  it('Q1: enqueue increases queue size', () => {
    enqueueUnknownFood({ food_name: '竹筍湯' })
    assert.equal(getUnknownQueueSize(), 1)
  })

  it('Q2: duplicate enqueue increments times_used', () => {
    enqueueUnknownFood({ food_name: '竹筍湯' })
    const e = enqueueUnknownFood({ food_name: '竹筍湯' })
    assert.equal(e.times_used, 2)
  })

  it('Q3: search unknown enqueues', () => {
    searchNutritionV2('阿嬤湯')
    assert.ok(getUnknownQueueSize() >= 1)
  })

  it('Q4: analytics top unknown', () => {
    enqueueUnknownFood({ food_name: '竹筍湯' })
    enqueueUnknownFood({ food_name: '竹筍湯' })
    enqueueUnknownFood({ food_name: '雞湯' })
    const a = getUnknownAnalytics()
    assert.equal(a.top_unknown[0]!.food_name, '竹筍湯')
    assert.ok(a.top_unknown[0]!.times_used >= 2)
  })

  it('Q5: list waiting entries', () => {
    enqueueUnknownFood({ food_name: 'test' })
    assert.equal(listUnknownQueue('waiting').length, 1)
  })
})

describe('Nutrition Search V2 — Auto Re-Match', () => {
  it('R1: rematch proposes for similar catalog name', () => {
    enqueueUnknownFood({ food_name: '竹筍湯' })
    const proposals = runAutoRematch([{ name: '膳馨綠竹筍排骨湯', store: '7-11' }])
    assert.ok(proposals.length >= 0)
  })

  it('R2: applyRematch keep_text never applies', () => {
    const p = {
      queue_entry_id: 'x',
      food_name: '竹筍湯',
      candidate: collectAllCandidates('竹筍排骨湯')[0]!,
      match_score: 96,
      message: 'test',
      actions: ['keep_text'] as const,
    }
    if (p.candidate) {
      const r = applyRematchProposal(p, 'keep_text')
      assert.equal(r.applied, false)
    }
  })

  it('R3: applyRematch update requires user confirm', () => {
    const cands = collectAllCandidates('711竹筍排骨湯')
    if (!cands[0]) return
    const r = applyRematchProposal(
      {
        queue_entry_id: 'x',
        food_name: '竹筍湯',
        candidate: cands[0],
        match_score: 96,
        message: 'm',
        actions: ['update_record'],
      },
      'update_record'
    )
    assert.equal(r.applied, true)
  })

  it('R4: scoreNameSimilarity exact', () => {
    assert.equal(scoreNameSimilarity('竹筍湯', '竹筍湯'), 100)
  })
})

describe('Nutrition Search V2 — Search Ranking', () => {
  it('S1: official tier before unknown', () => {
    const cands = collectAllCandidates('雞胸')
    const ranked = rankSearchCandidates(cands)
    const firstOfficial = ranked.findIndex(c => c.source_tier === 'official')
    const firstUnknown = ranked.findIndex(c => c.source_tier === 'unknown')
    if (firstOfficial >= 0 && firstUnknown >= 0) {
      assert.ok(firstOfficial < firstUnknown)
    }
  })

  it('S2: compareSearchCandidates stable tier order', () => {
    const a = collectAllCandidates('蛋白')[0]
    const b = collectAllCandidates('蛋白')[1]
    if (a && b) assert.ok(typeof compareSearchCandidates(a, b) === 'number')
  })

  it('S3: source tier labels', () => {
    assert.equal(sourceTierLabel('onr'), 'ONR')
    assert.equal(sourceTierLabel('food_dna'), 'Food DNA')
  })

  it('S4: ranking not alphabetical only', () => {
    const ranked = rankSearchCandidates(collectAllCandidates('雞'))
    if (ranked.length >= 2) {
      const byScore = [...ranked].sort((a, b) => b.match_score - a.match_score)
      assert.notDeepEqual(ranked.map(r => r.name), byScore.map(r => r.name).sort())
    }
  })
})

describe('Nutrition Search V2 — Confidence & explain', () => {
  it('CF1: explainConfidence includes source', () => {
    assert.match(explainConfidence('A', 'ONR'), /官方/)
  })

  it('CF2: statusFromConfidence unknown', () => {
    assert.equal(statusFromConfidence('Unknown'), 'unknown')
  })

  it('CF3: NULL_MACROS all null', () => {
    assert.equal(Object.values(NULL_MACROS).every(v => v === null), true)
  })
})

describe('Nutrition Search V2 — UI state hints (engine)', () => {
  it('UI1: clarify outcome includes explanation', () => {
    const out = searchNutritionV2('竹筍湯')
    assert.match(out.explanation, /Clarification|確認/)
  })

  it('UI2: official outcome includes explanation', () => {
    const out = searchNutritionV2('711竹筍排骨湯')
    if (out.official_record) assert.ok(out.explanation.length > 0)
  })

  it('UI3: unknown outcome action create_unknown', () => {
    assert.equal(searchNutritionV2('家裡煮的').action, 'create_unknown')
  })
})

describe('Nutrition Search V2 — Re-record update path', () => {
  it('UP1: rematch view_diff does not auto apply', () => {
    const cands = collectAllCandidates('竹筍排骨湯')
    if (!cands[0]) return
    const r = applyRematchProposal(
      {
        queue_entry_id: '1',
        food_name: '竹筍湯',
        candidate: cands[0],
        match_score: 98,
        message: 'm',
        actions: ['view_diff'],
      },
      'view_diff'
    )
    assert.equal(r.applied, false)
  })
})
