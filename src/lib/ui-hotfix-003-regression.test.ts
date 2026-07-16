import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import { describe, it } from 'node:test'
import { build } from 'esbuild'

const root = new URL('../../', import.meta.url)
const source = (path: string) => readFileSync(new URL(path, root), 'utf8')

describe('UI-HOTFIX-003 native runtime and shared geometry', () => {
  it('executes the minified browser fallback bundle without initialization TDZ', async () => {
    const result = await build({
      entryPoints: [fileURLToPath(new URL('src/features/today/fallback-today-plan.ts', root))],
      bundle: true,
      format: 'iife',
      globalName: 'BetterBitFallback',
      platform: 'browser',
      minify: true,
      write: false,
      tsconfig: fileURLToPath(new URL('tsconfig.json', root)),
    })
    const context: Record<string, unknown> = {}
    runInNewContext(result.outputFiles[0].text, context)
    const bundled = context.BetterBitFallback as {
      buildFallbackTodayPlan: (
        date: string,
        profile: Record<string, unknown>,
        goal: Record<string, unknown>
      ) => { daily_targets: { calories: number } } | null
    }
    const plan = bundled.buildFallbackTodayPlan(
      '2026-07-16',
      {
        id: 'bundle-user',
        onboarding_completed: true,
        gender: 'male',
        age: 34,
        height_cm: 178,
        weight_kg: 82,
        body_fat_pct: 24,
        activity_level: 'moderate',
        water_ml_target: 2870,
      },
      {
        id: 'bundle-goal',
        user_id: 'bundle-user',
        goal_type: 'lose_fat',
        start_date: '2026-07-16',
        end_date: '2026-10-16',
        target_weight_kg: 76,
        target_body_fat_pct: 18,
        is_active: true,
      }
    )
    assert.ok(plan)
    assert.ok(plan.daily_targets.calories > 1200)
    assert.notEqual(plan.daily_targets.calories, 2000)
  })

  it('keeps fallback calculation free of swallowed initialization errors', () => {
    const fallback = source('src/features/today/fallback-today-plan.ts')
    const calculator = source('src/lib/goal-calculator.ts')
    assert.doesNotMatch(fallback, /try\s*\{[\s\S]*calculateGoalPlan/)
    assert.doesNotMatch(calculator, /function (?:calculate)?DaysInGoal/)
    assert.match(
      calculator,
      /const days = Math\.max\([\s\S]*differenceInDays\(parseISO\(goal\.end_date\), parseISO\(goal\.start_date\)\)/
    )
  })

  it('never renders a raw plan-generation exception', () => {
    const today = source('src/features/today/TodayPageClient.tsx')
    const messages = source('src/lib/generate-plan-errors.ts')
    assert.doesNotMatch(today, /subtext:\s*planGenerateError/)
    assert.match(today, /if \(!todayPlan && planGenerateError\)/)
    assert.match(today, /safeGeneratePlanErrorForDisplay\(planGenerateError\)/)
    assert.match(messages, /default:[\s\S]*計畫暫時無法建立/)
    assert.doesNotMatch(messages, /default:[\s\S]*input\.error\s*\?\?/)
    assert.match(messages, /before initialization\|referenceerror/)
  })

  it('uses one compact header contract for all four main tabs', () => {
    const header = source('src/components/betterbit-v2/V2Header.tsx')
    const today = source('src/components/betterbit-v2/TodayV2Dashboard.tsx')
    const record = source('src/components/record/RecordV2Screen.tsx')
    const analysis = source('src/components/analysis/AnalysisV2Screen.tsx')
    const settings = source('src/components/betterbit-v2/settings/SettingsV2Screen.tsx')
    const shell = source('src/styles/capacitor-ios-shell.css')

    assert.match(header, /app-tab-header__row/)
    assert.doesNotMatch(header, /app-safe-top/)
    for (const page of [today, record, analysis, settings]) {
      assert.match(page, /<V2Header/)
      assert.match(page, /app-tab-page-content/)
    }
    assert.match(shell, /--app-tab-header-row-height:\s*44px/)
    assert.match(shell, /\.app-tab-header\s*\{[\s\S]*padding-block:\s*var\(--app-tab-edge-space\)/)
  })

  it('applies each iOS safe area and bottom-nav clearance exactly once', () => {
    const shell = source('src/styles/capacitor-ios-shell.css')
    const v2 = source('src/styles/betterbit-v2.css')
    const settings = source('src/components/betterbit-v2/settings/SettingsV2Screen.tsx')

    assert.match(shell, /html\.capacitor-ios \.app-shell\s*\{[\s\S]*padding-top:\s*var\(--app-safe-top\)/)
    assert.doesNotMatch(settings, /app-safe-(top|bottom)|app-nav-total/)
    assert.match(v2, /\.app-bottom-nav\.app-bottom-nav--v2\s*\{[\s\S]*padding-bottom:\s*0/)
    assert.match(v2, /\.app-bottom-nav--v2 \.app-bottom-nav__row\s*\{[\s\S]*height:\s*var\(--app-nav-bar-height\)/)
    assert.match(v2, /\.app-bottom-nav--v2 \.app-bottom-nav__row\s*\{[\s\S]*padding:\s*0 12px/)
    assert.doesNotMatch(v2, /\.v2-analysis-inner\s*\{[\s\S]{0,160}app-nav-total/)
    assert.doesNotMatch(v2, /\.v2-record-inner\s*\{[\s\S]{0,160}app-nav-total/)
  })
})
