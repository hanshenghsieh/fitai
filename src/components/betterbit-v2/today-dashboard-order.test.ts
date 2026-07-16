import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { join } from 'node:path'

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8')
}

describe('Today dashboard section order', () => {
  it('renders actions and recommendation before the always-visible meal overview', () => {
    const dashboard = source('src/components/betterbit-v2/TodayV2Dashboard.tsx')
    const macros = dashboard.indexOf('{/* Macros row */}')
    const actions = dashboard.indexOf('{showMealActions && (')
    const recommendation = dashboard.indexOf('{interstitial}')
    const overview = dashboard.indexOf('{/* Meal overview stays visible')

    assert.ok(macros >= 0)
    assert.ok(actions > macros)
    assert.ok(recommendation > actions)
    assert.ok(overview > recommendation)
    assert.match(dashboard.slice(overview), /<V2MealOverviewPanel[\s\S]*?foodLogs=\{foodLogs\}/)
  })

  it('keeps the overview above the BetterBitHome water card', () => {
    const home = source('src/components/dashboard/BetterBitHome.tsx')
    const dashboard = home.indexOf('<TodayV2Dashboard')
    const water = home.indexOf('<TodayWaterLog')
    assert.ok(dashboard >= 0)
    assert.ok(water > dashboard)
  })
})
