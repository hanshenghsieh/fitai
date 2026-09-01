/**
 * Real-device bug report: tapping the rendered no-result CTA in
 * TodayFoodMore appeared to go straight to the old manual-estimate flow,
 * with no visible AI fallback. Every prior test for this feature
 * (text-search-ai-fallback-controller.test.ts, text-search-ai-fallback.test.ts)
 * exercised TextSearchAiFallbackController / resolveNutritionWithAiFallback
 * directly — never the actual <TodayFoodMore> render tree, never a real
 * DOM click on the actual rendered button. A wiring mistake in the JSX
 * itself (wrong prop, dead branch, stale closure) would not have been
 * caught by those tests. This file renders the real component into a real
 * DOM (jsdom) and drives it exactly as a user would: type -> tap the
 * rendered primary CTA -> observe network calls and rendered state.
 *
 * Uses jsdom + react-dom/client + act — no @testing-library dependency,
 * kept to the minimum needed to prove the actual click path.
 */
import assert from 'node:assert/strict'
import { test, mock, before, beforeEach, afterEach } from 'node:test'
import { JSDOM } from 'jsdom'

let dom: JSDOM

before(() => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' })
  const g = globalThis as unknown as Record<string, unknown>
  g.window = dom.window as unknown
  g.document = dom.window.document
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true })
  g.HTMLInputElement = dom.window.HTMLInputElement
  g.HTMLElement = dom.window.HTMLElement
  g.Event = dom.window.Event
  g.MouseEvent = dom.window.MouseEvent
  g.requestAnimationFrame = (cb: FrameRequestCallback) => dom.window.setTimeout(() => cb(Date.now()), 0) as unknown as number
  g.cancelAnimationFrame = (id: number) => dom.window.clearTimeout(id)
  g.IS_REACT_ACT_ENVIRONMENT = true

  mock.module('@/lib/supabase/client', {
    namedExports: {
      createClient: () => ({
        auth: {
          getSession: async () => ({ data: { session: { access_token: 'fake-jwt-token' } } }),
        },
      }),
    },
  })
})

type FetchCall = { url: string; body: unknown }
let fetchCalls: FetchCall[] = []
let aiEstimateResolve: ((res: { status: number; body: unknown }) => void) | null = null

function installFetchMock() {
  fetchCalls = []
  aiEstimateResolve = null
  ;(globalThis as unknown as { fetch: typeof fetch }).fetch = (async (
    input: RequestInfo | URL,
    init?: RequestInit
  ) => {
    const url = typeof input === 'string' ? input : input.toString()
    const body = init?.body ? JSON.parse(init.body as string) : undefined
    fetchCalls.push({ url, body })

    if (url.includes('/api/food-text/ai-estimate')) {
      const result = await new Promise<{ status: number; body: unknown }>(resolve => {
        aiEstimateResolve = resolve
      })
      return new Response(JSON.stringify(result.body), { status: result.status })
    }
    // /api/analytics/track and anything else — swallowed by the caller anyway.
    return new Response('{}', { status: 200 })
  }) as typeof fetch
}

beforeEach(() => {
  installFetchMock()
})

afterEach(() => {
  fetchCalls = []
  aiEstimateResolve = null
})

async function renderHarness(initialQuery: string) {
  const React = await import('react')
  const { createRoot } = await import('react-dom/client')
  const { act } = await import('react')
  const TodayFoodMore = (await import('./TodayFoodMore')).default
  const { searchFoodMenu } = await import('@/lib/food-search')

  const container = dom.window.document.createElement('div')
  dom.window.document.body.appendChild(container)
  const root = createRoot(container)

  const picked: unknown[] = []
  const estimateCreated: string[] = []
  let currentQuery = initialQuery

  function Harness({ query }: { query: string }) {
    const results = searchFoodMenu(query, 6)
    return React.createElement(TodayFoodMore, {
      open: true,
      targetDate: '2026-08-28',
      onClose: () => {},
      activeSlot: 'meal1' as const,
      query,
      onQueryChange: (q: string) => {
        currentQuery = q
        act(() => {
          root.render(React.createElement(Harness, { query: currentQuery }))
        })
      },
      searchResults: results,
      onPickSearch: (item: unknown) => picked.push(item),
      frequentList: [],
      selectedFrequentId: '',
      onSelectFrequent: () => {},
      onCommitFrequent: () => {},
      onCreateEstimate: (name: string) => estimateCreated.push(name),
    })
  }

  act(() => {
    root.render(React.createElement(Harness, { query: currentQuery }))
  })

  return {
    container,
    body: dom.window.document.body,
    picked,
    estimateCreated,
    act,
    setQuery: (q: string) => {
      currentQuery = q
      act(() => {
        root.render(React.createElement(Harness, { query: currentQuery }))
      })
    },
    cleanup: () => {
      act(() => root.unmount())
      container.remove()
    },
  }
}

function findPrimaryButton(root: HTMLElement): HTMLButtonElement {
  const buttons = Array.from(root.querySelectorAll('button'))
  const btn = buttons.find(b => /建立|加入|正在查找/.test(b.textContent ?? ''))
  assert.ok(btn, `expected to find the primary CTA button in the rendered tree; saw buttons: ${buttons.map(b => b.textContent).join(' | ')}`)
  return btn as HTMLButtonElement
}

test('real-device repro: 麥脆雞 (DB miss) — tapping the rendered CTA triggers AI fallback, not the old manual-estimate flow', async () => {
  const { body, picked, estimateCreated, act, cleanup } = await renderHarness('麥脆雞')
  try {
    const bodyText = body.textContent ?? ''
    assert.match(bodyText, /找不到「麥脆雞」/, 'sanity check: reproduces the reported idle state')

    const btn = findPrimaryButton(body)
    assert.equal(btn.textContent, '建立「麥脆雞」', 'the exact rendered CTA text from the bug report')

    await act(async () => {
      btn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
      // handlePrimaryAction fires triggerAiFallback fire-and-forget; let its
      // internal awaits (apiFetch -> fetch) actually reach the network call
      // before we inspect fetchCalls.
      await new Promise(r => dom.window.setTimeout(r, 0))
    })

    // The old manual-estimate flow must NOT have fired on this first tap.
    assert.equal(estimateCreated.length, 0, 'onCreateEstimate must NOT be called on the first tap for a DB miss — that would skip AI fallback entirely')

    const aiCalls = fetchCalls.filter(c => c.url.includes('/api/food-text/ai-estimate'))
    assert.equal(aiCalls.length, 1, 'exactly one AI-estimate request must be sent')
    assert.deepEqual(aiCalls[0]!.body, { query: '麥脆雞' })

    assert.match(body.textContent ?? '', /正在幫你查找/, 'loading state must be visible while the AI request is in flight')

    // Resolve the AI request.
    await act(async () => {
      aiEstimateResolve!({
        status: 200,
        body: {
          success: true,
          outcome: 'ai_fallback',
          candidate: {
            id: 'ai-estimate-1',
            name: '麥脆雞腿',
            macros: { calories: 320, protein: 18, fat: 14, carbs: 25, fiber: null, sugar: null, sodium: null },
            nutrition_status: 'estimated',
            nutrition_confidence: 'C',
            nutrition_source: 'AI 營養估算',
            source_tier: 'official',
            match_score: 75,
            explanation: '🟡 AI 營養估算',
            estimate_provenance: 'ai_estimate',
          },
        },
      })
      // let the controller's post-await state update flush
      await new Promise(r => dom.window.setTimeout(r, 0))
    })

    assert.match(body.textContent ?? '', /麥脆雞腿/, 'the AI estimate result must be rendered')
    assert.equal(picked.length, 0, 'no FoodLog may be committed before the user explicitly confirms')

    const confirmBtn = findPrimaryButton(body)
    assert.match(confirmBtn.textContent ?? '', /加入「麥脆雞腿」/)

    act(() => {
      confirmBtn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
    })

    assert.equal(picked.length, 1, 'tapping 加入 must commit exactly one result')
    assert.equal((picked[0] as { searchSource: string }).searchSource, 'ai_estimate')
    assert.equal(fetchCalls.filter(c => c.url.includes('/api/food-text/ai-estimate')).length, 1, 'still exactly one AI request total — confirming did not trigger another')
  } finally {
    cleanup()
  }
})

test('real-device repro: 蛋餅 (DB hit) — AI fallback is never invoked', async () => {
  const { body, picked, act, cleanup } = await renderHarness('蛋餅')
  try {
    assert.doesNotMatch(body.textContent ?? '', /找不到/, 'sanity check: 蛋餅 must resolve locally, not hit the no-result branch')

    const buttons = Array.from(body.querySelectorAll('button'))
    const searchHitBtn = buttons.find(b => (b.textContent ?? '').includes('蛋餅'))
    assert.ok(searchHitBtn, 'expected a rendered local search-result row for 蛋餅')

    act(() => {
      searchHitBtn!.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
    })
    const primary = findPrimaryButton(body)
    act(() => {
      primary.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
    })

    assert.equal(fetchCalls.filter(c => c.url.includes('/api/food-text/ai-estimate')).length, 0, 'AI must never be called for a local hit')
    assert.equal(picked.length, 1, 'the local hit should still commit normally')
  } finally {
    cleanup()
  }
})

test('Enter key and the bottom CTA tap take the exact same code path for a DB miss', async () => {
  const { body, act, cleanup } = await renderHarness('多多綠')
  try {
    const input = body.querySelector('input[type="text"]') as HTMLInputElement
    assert.ok(input)
    await act(async () => {
      input.dispatchEvent(
        new dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
      )
      await new Promise(r => dom.window.setTimeout(r, 0))
    })
    assert.equal(fetchCalls.filter(c => c.url.includes('/api/food-text/ai-estimate')).length, 1, 'Enter must trigger AI fallback exactly like tapping the button does')
  } finally {
    cleanup()
  }
})
