import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  evaluateTop100Term,
  loadTop100Fixture,
  runTop100FoodLogQa,
  summarizeTop100Results,
} from './top100-food-log-qa'

/** Milestone A baseline — raise as search coverage improves */
const MIN_PASS_RATE = 0.88

describe('Top 100 Taiwan food log QA', () => {
  it('loads exactly 100 curated search terms', () => {
    const fixture = loadTop100Fixture()
    assert.equal(fixture.terms.length, 100)
    assert.ok(fixture.version)
  })

  it(`pass rate ≥ ${MIN_PASS_RATE * 100}% across all terms`, () => {
    const results = runTop100FoodLogQa()
    const { passed, total, failed } = summarizeTop100Results(results)
    const rate = passed / total
    if (rate < MIN_PASS_RATE) {
      const lines = failed
        .slice(0, 15)
        .map(f => `  ${f.id} [${f.category}] "${f.query}": ${f.failures.join('; ')}`)
      assert.fail(
        `${passed}/${total} passed (${(rate * 100).toFixed(1)}%). Failures:\n${lines.join('\n')}${
          failed.length > 15 ? `\n  … +${failed.length - 15} more` : ''
        }`
      )
    }
  })

  it('critical convenience + protein terms resolve with macros', () => {
    const critical = ['t011', 't021', 't037', 't039', 't040', 't041', 't026', 't001', 't071']
    const byId = new Map(loadTop100Fixture().terms.map(t => [t.id, t]))
    for (const id of critical) {
      const term = byId.get(id)!
      const result = evaluateTop100Term(term)
      assert.ok(result.pass, `${term.query}: ${result.failures.join('; ')}`)
    }
  })

  it('ambiguous and homemade queries never invent calories', () => {
    const unknownIds = ['t096', 't097', 't098', 't099', 't100']
    const byId = new Map(loadTop100Fixture().terms.map(t => [t.id, t]))
    for (const id of unknownIds) {
      const term = byId.get(id)!
      const result = evaluateTop100Term(term)
      assert.ok(result.pass, `${term.query}: ${result.failures.join('; ')}`)
      assert.equal(result.textAction, 'create_unknown')
    }
  })
})
