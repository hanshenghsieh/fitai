import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { TextSearchAiFallbackController, type AiFallbackResolution } from './text-search-ai-fallback-controller'
import type { SearchV2Candidate } from './search-v2/types'

function candidate(name: string): SearchV2Candidate {
  return {
    id: `c-${name}`,
    name,
    macros: { calories: 200, protein: 10, fat: 5, carbs: 20, fiber: null, sugar: null, sodium: null },
    nutrition_status: 'estimated',
    nutrition_confidence: 'C',
    nutrition_source: 'AI 營養估算',
    source_tier: 'official',
    match_score: 70,
    explanation: '🟡 AI 營養估算',
    estimate_provenance: 'ai_estimate',
  }
}

function deferred<T>() {
  let resolve!: (v: T) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('TextSearchAiFallbackController — cost/cancellation regression (PART 20)', () => {
  it('1. resolver is never called before trigger()', () => {
    let calls = 0
    new TextSearchAiFallbackController(async () => {
      calls++
      return { success: true, outcome: 'ai_fallback', candidate: candidate('x') }
    })
    assert.equal(calls, 0)
  })

  it('2. one submitted query invokes the resolver exactly once', async () => {
    let calls = 0
    const controller = new TextSearchAiFallbackController(async (): Promise<AiFallbackResolution> => {
      calls++
      return { success: true, outcome: 'ai_fallback', candidate: candidate('麥脆雞') }
    })
    await controller.trigger('麥脆雞')
    assert.equal(calls, 1)
    assert.equal(controller.getPhase().status, 'success')
  })

  it('3. calling trigger() again while a request is still loading does not invoke the resolver a second time', async () => {
    let calls = 0
    const first = deferred<AiFallbackResolution>()
    const controller = new TextSearchAiFallbackController(async () => {
      calls++
      return first.promise
    })
    const p1 = controller.trigger('麥脆雞')
    // second tap while still loading — must be a no-op, not a second request
    await controller.trigger('麥脆雞')
    assert.equal(calls, 1)
    first.resolve({ success: true, outcome: 'ai_fallback', candidate: candidate('麥脆雞') })
    await p1
    assert.equal(controller.getPhase().status, 'success')
  })

  it('4. reset() discards a still-pending request — its late resolution never overwrites the phase', async () => {
    const pending = deferred<AiFallbackResolution>()
    const controller = new TextSearchAiFallbackController(async () => pending.promise)
    const p1 = controller.trigger('麥脆雞')
    controller.reset()
    assert.equal(controller.getPhase().status, 'idle')
    pending.resolve({ success: true, outcome: 'ai_fallback', candidate: candidate('麥脆雞') })
    await p1
    assert.equal(controller.getPhase().status, 'idle', 'a resolution arriving after reset() must not resurrect a stale success')
  })

  it('5. triggering a newer query while an older one is in flight discards the older result', async () => {
    const older = deferred<AiFallbackResolution>()
    const newer = deferred<AiFallbackResolution>()
    let call = 0
    const controller = new TextSearchAiFallbackController(async () => {
      call++
      return call === 1 ? older.promise : newer.promise
    })
    const p1 = controller.trigger('多多綠')
    const p2 = controller.trigger('夏威夷披薩')
    older.resolve({ success: true, outcome: 'ai_fallback', candidate: candidate('多多綠') })
    newer.resolve({ success: true, outcome: 'ai_fallback', candidate: candidate('夏威夷披薩') })
    await Promise.all([p1, p2])
    const phase = controller.getPhase()
    assert.equal(phase.status, 'success')
    if (phase.status === 'success') assert.equal(phase.query, '夏威夷披薩', 'the stale (older) query result must not win')
  })

  it('6. a failed request does not retry or loop — it settles once into "failed" and stays there', async () => {
    let calls = 0
    const controller = new TextSearchAiFallbackController(async (): Promise<AiFallbackResolution> => {
      calls++
      return { success: false, reason: 'api_error' }
    })
    await controller.trigger('鹹酥雞')
    assert.equal(calls, 1)
    const phase = controller.getPhase()
    assert.equal(phase.status, 'failed')
    if (phase.status === 'failed') assert.equal(phase.reason, 'api_error')
    // no internal setTimeout/retry scheduled — a second tick changes nothing on its own
    await new Promise(r => setTimeout(r, 10))
    assert.equal(calls, 1)
  })

  it('6b. a resolver that throws is treated as a network_error failure, not left unresolved', async () => {
    const controller = new TextSearchAiFallbackController(async () => {
      throw new Error('boom')
    })
    await controller.trigger('鹹酥雞')
    const phase = controller.getPhase()
    assert.equal(phase.status, 'failed')
    if (phase.status === 'failed') assert.equal(phase.reason, 'network_error')
  })

  it('7. a successful AI result sits in "success" — nothing in this module logs/commits it; only an explicit caller action (handlePrimaryAction) can do that', async () => {
    const controller = new TextSearchAiFallbackController(async (): Promise<AiFallbackResolution> => ({
      success: true,
      outcome: 'ai_fallback',
      candidate: candidate('麥脆雞'),
    }))
    await controller.trigger('麥脆雞')
    assert.equal(controller.getPhase().status, 'success')
    // the controller has no commit/save method at all — confirming there is
    // no code path by which "success" alone can write a FoodLog entry.
    assert.equal('commit' in controller, false)
    assert.equal('save' in controller, false)
  })
})
