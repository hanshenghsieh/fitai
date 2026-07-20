import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { join } from 'node:path'

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8')
}

describe('Today dashboard section order', () => {
  it('embeds the existing Day 1 guide between the date and calorie ring', () => {
    const dashboard = source('src/components/betterbit-v2/TodayV2Dashboard.tsx')
    const home = source('src/components/dashboard/BetterBitHome.tsx')
    const guide = source('src/components/dashboard/today/Day1GuideBanner.tsx')
    const mainCard = dashboard.indexOf('{/* Main calorie card */}')
    const date = dashboard.indexOf('{todayLabel}', mainCard)
    const embeddedGuide = dashboard.indexOf('{day1Guide ? <div', date)
    const ring = dashboard.indexOf('<V2ProgressRing', embeddedGuide)

    assert.ok(mainCard >= 0)
    assert.ok(date > mainCard)
    assert.ok(embeddedGuide > date)
    assert.ok(ring > embeddedGuide)
    assert.equal(home.match(/<Day1GuideBanner/g)?.length, 1)
    assert.match(home, /day1Guide=\{[\s\S]*?<Day1GuideBanner/)
    assert.match(guide, /今日飲食總覽中的餐點可長按拖移順序或刪除/)
    assert.match(guide, /bb_day1_guide_dismissed/)
    assert.doesNotMatch(guide, /<BBCard|absolute/)
  })

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
