import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const root = new URL('../../', import.meta.url)

function source(path: string): string {
  return readFileSync(new URL(path, root), 'utf8')
}

function cssBlock(css: string, selector: string): string {
  return css.match(new RegExp(`\\.${selector}\\s*\\{[^}]*\\}`))?.[0] ?? ''
}

describe('UI-RESTORE-001 accepted behavior', () => {
  it('keeps Today on the complete dashboard without weekly-plan generation UI', () => {
    const today = source('src/features/today/TodayPageClient.tsx')
    assert.match(today, /buildFallbackTodayPlan/)
    assert.match(today, /<BetterBitHome/)
    assert.doesNotMatch(today, /TodayPlanEmpty|GeneratePlanButton|幫我排本週/)
    assert.equal(
      existsSync(new URL('src/components/dashboard/GeneratePlanButton.tsx', root)),
      false
    )
    assert.equal(
      existsSync(new URL('src/components/dashboard/today/TodayPlanEmpty.tsx', root)),
      false
    )
  })

  it('redirects the retired weekly-plan route back to Today', () => {
    const weeklyPlan = source('src/app/(app)/weekly-plan/page.tsx')
    assert.match(weeklyPlan, /router\.replace\(['"]\/dashboard['"]\)/)
    assert.doesNotMatch(weeklyPlan, /生成本週計畫|幫我排本週/)
  })

  it('keeps login hard navigation and mounts the complete Today route', () => {
    const login = source('src/app/login/page.tsx')
    const guard = source('src/features/auth/AppAuthGuard.tsx')
    const today = source('src/features/today/TodayPageClient.tsx')
    assert.match(login, /window\.location\.assign\(['"]\/dashboard\?login=1['"]\)/)
    assert.match(guard, /waitForSession/)
    assert.match(guard, /login=1/)
    assert.match(today, /<BetterBitHome/)
    assert.doesNotMatch(today, /TodayPlanEmpty/)
  })

  it('uses the authenticated session user for dashboard mutations after hydration', () => {
    const today = source('src/features/today/TodayPageClient.tsx')
    const home = source('src/components/dashboard/BetterBitHome.tsx')
    const client = source('src/lib/supabase/client.ts')

    assert.match(today, /userId=\{userId\}/)
    assert.match(home, /interface Props \{[\s\S]*?userId: string/)
    assert.match(home, /const syncUserId = userId/)
    assert.match(home, /if \(!syncUserId \|\| serverFp === localFp\) return/)
    assert.match(client, /return createBrowserClient\(projectUrl,\s*SUPABASE_ANON_KEY\)/)
    assert.match(client, /storageKey:\s*NATIVE_AUTH_STORAGE_KEY/)
  })

  it('keeps notification token creation user-initiated and fail-safe', () => {
    const prompt = source('src/components/dashboard/NotificationPrompt.tsx')
    const firebase = source('src/lib/firebase.ts')
    const mountEffect = prompt.slice(prompt.indexOf('useEffect(() =>'), prompt.indexOf('if (!isSupported'))

    assert.doesNotMatch(mountEffect, /requestNotificationPermission|getToken/)
    assert.match(prompt, /onClick=\{handleEnableNotifications\}/)
    assert.match(firebase, /if \(!isFirebaseConfigured\(\)\) return null/)
    assert.doesNotMatch(firebase, /console\.error/)
  })

  it('keeps all four main tabs and BottomNav on one overflow-safe mobile shell', () => {
    const shell = source('src/styles/capacitor-ios-shell.css')
    const v2Css = source('src/styles/betterbit-v2.css')
    const dashboard = source('src/components/betterbit-v2/TodayV2Dashboard.tsx')
    const record = source('src/components/record/RecordV2Screen.tsx')
    const analysis = source('src/components/analysis/AnalysisV2Screen.tsx')
    const settings = source('src/components/betterbit-v2/settings/SettingsV2Screen.tsx')
    const layout = source('src/app/(app)/layout.tsx')
    const bottomNav = source('src/components/dashboard/BottomNav.tsx')
    const navBlock = cssBlock(v2Css, 'app-bottom-nav--v2')

    assert.match(shell, /--app-tab-max-width:\s*512px/)
    assert.match(shell, /--app-nav-fab-overhang:\s*24px/)
    assert.match(cssBlock(shell, 'app-tab-column'), /width:\s*calc\(100%\s*-\s*24px\)/)
    assert.match(cssBlock(shell, 'app-tab-column'), /box-sizing:\s*border-box/)
    assert.match(navBlock, /max-width:\s*var\(--app-tab-max-width\)/)
    assert.match(navBlock, /left:\s*0/)
    assert.match(navBlock, /right:\s*0/)
    assert.match(navBlock, /margin-inline:\s*auto/)
    assert.doesNotMatch(navBlock, /left:\s*50%|transform:\s*translateX/)
    assert.match(layout, /<\/main>\s*<BottomNav \/>/)
    assert.equal((bottomNav.match(/href:\s*'\/(?:dashboard|weekly|progress|settings)'/g) ?? []).length, 4)
    assert.match(bottomNav, /aria-label="拍照記錄"/)
    assert.match(
      v2Css,
      /padding-bottom:\s*calc\(var\(--app-nav-total\)\s*\+\s*var\(--app-nav-fab-overhang\)\s*\+\s*12px\)/
    )
    for (const viewportWidth of [320, 390, 1024]) {
      const railWidth = Math.min(viewportWidth - 24, 512)
      const railLeft = (viewportWidth - railWidth) / 2
      const usableRowWidth = railWidth - 2 - 24
      const fourTabsAndFab = 4 * 52 + 56
      assert.ok(railLeft >= 12)
      assert.ok(usableRowWidth >= fourTabsAndFab)
    }
    for (const page of [dashboard, record, analysis, settings]) {
      assert.match(page, /app-tab-column/)
    }
    assert.doesNotMatch(settings, /max-w-\[640px\]|paddingLeft:\s*20/)
  })

  it('keeps accepted meal movement wired through the durable dashboard mutation path', () => {
    const dashboard = source('src/components/betterbit-v2/TodayV2Dashboard.tsx')
    const overview = source('src/components/betterbit-v2/V2MealOverviewPanel.tsx')
    const home = source('src/components/dashboard/BetterBitHome.tsx')
    const record = source('src/lib/record/record-page-data.ts')

    assert.match(dashboard, /Meal overview stays visible after recommendation/)
    assert.match(overview, /slot:\s*'before_sleep'/)
    assert.match(overview, /groupTodayMealOverviewLogs/)
    assert.match(overview, /onMoveLog\(logId,\s*slot\)/)
    assert.match(home, /moveTodayMealLogSlot/)
    assert.match(home, /handleLogFood\(nextLogs/)
    assert.match(record, /foodLogNutritionDayKey/)
    assert.match(record, /normalizeFoodLogSlot/)
  })

  it('removes the old Record bottom CTA', () => {
    const record = source('src/components/record/RecordV2Screen.tsx')
    const css = source('src/styles/betterbit-v2.css')
    assert.doesNotMatch(record, /拍照辨識\s*\/\s*新增餐點|v2-record-bottom-cta/)
    assert.doesNotMatch(css, /v2-record-bottom-cta/)
  })

  it('keeps Record daily cards in a seven-column non-scrolling grid', () => {
    const css = source('src/styles/betterbit-v2.css')
    const scroll = cssBlock(css, 'v2-record-week-scroll')
    const row = cssBlock(css, 'v2-record-week-row')
    assert.match(scroll, /overflow-x:\s*hidden/)
    assert.doesNotMatch(scroll, /overflow-x:\s*(?:auto|scroll)/)
    assert.match(row, /display:\s*grid/)
    assert.match(row, /grid-template-columns:\s*repeat\(7,\s*minmax\(0,\s*1fr\)\)/)
  })

  it('keeps Welcome and Splash as separate screens and assets', () => {
    const welcome = source('src/components/marketing/LandingPage.tsx')
    const loadingShell = source('src/features/auth/AppAuthLoadingShell.tsx')
    const splash = source('src/features/auth/BetterBitSplashScreen.tsx')
    const rootLoading = source('src/app/loading.tsx')
    assert.match(welcome, /開始使用/)
    assert.match(welcome, /href="\/login"/)
    assert.doesNotMatch(welcome, /BetterBitSplashScreen/)
    assert.match(loadingShell, /BetterBitSplashScreen/)
    assert.match(rootLoading, /BetterBitSplashScreen/)
    assert.doesNotMatch(splash, /開始使用|href="\/login"|href="\/register"/)
    assert.equal(existsSync(new URL('public/brand/betterbit-logo.png', root)), true)
  })

  it('keeps auth redirects on clean hard navigations without restoring old routing', () => {
    const login = source('src/app/login/page.tsx')
    const onboarding = source('src/app/onboarding/page.tsx')
    const rootRedirect = source('src/features/auth/RootRedirectClient.tsx')
    assert.match(login, /window\.location\.assign/)
    assert.match(onboarding, /window\.location\.assign/)
    assert.match(rootRedirect, /AppAuthLoadingShell/)
    assert.match(rootRedirect, /LandingPage/)
    assert.doesNotMatch(login, /router\.push\(['"]\/dashboard['"]\)/)
  })

  it('breaks the four accepted Today runtime import cycles that caused TDZ risk', () => {
    const foodDisplay = source('src/lib/nutrition/food-log-display.ts')
    const mealTrust = source('src/lib/nutrition/meal-trust-display.ts')
    const goal = source('src/lib/goal-calculator.ts')
    const fatLoss = source('src/lib/fat-loss-pace.ts')
    const parser = source('src/lib/nutrition/home-cooked/parse-meal-label.ts')
    const quickAdjust = source('src/lib/nutrition/home-cooked/meal-quick-adjust.ts')
    const textPipeline = source('src/lib/nutrition/search-v2/text-log-pipeline.ts')
    const searchIndex = source('src/lib/nutrition/search-v2/index.ts')

    assert.match(foodDisplay, /nutrition-pending-status/)
    assert.match(mealTrust, /nutrition-pending-status/)
    assert.doesNotMatch(mealTrust, /food-log-display/)
    assert.match(goal, /@\/lib\/bmr-tdee/)
    assert.match(fatLoss, /@\/lib\/bmr-tdee/)
    assert.doesNotMatch(fatLoss, /@\/lib\/goal-calculator/)
    assert.doesNotMatch(parser, /meal-quick-adjust/)
    assert.match(quickAdjust, /export function withSuggestedDefaults/)
    assert.match(textPipeline, /search-nutrition-v2-core/)
    assert.doesNotMatch(textPipeline, /search-v2\/index/)
    assert.match(searchIndex, /search-nutrition-v2-core/)
  })

  it('does not reintroduce water-local persistence', () => {
    const home = source('src/components/dashboard/BetterBitHome.tsx')
    assert.equal(existsSync(new URL('src/lib/water-intake-storage.ts', root)), false)
    assert.doesNotMatch(
      home,
      /water-intake-storage|resolveWaterIntake|writeWaterIntake|confirmWaterIntake/
    )
  })
})
