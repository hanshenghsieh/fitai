import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const root = new URL('../../', import.meta.url)
const source = (path: string) => readFileSync(new URL(path, root), 'utf8')

describe('REG-BOOTSTRAP-001 registration and onboarding contract', () => {
  it('does not report registration success before the profile row exists', () => {
    const route = source('src/app/api/auth/register/route.ts')
    const profileWrite = route.indexOf('const profileRes = await fetch')
    const profileCheck = route.indexOf('if (!profileRes.ok)')
    const success = route.indexOf('return jsonWithCors({ userId, email }')

    assert.ok(profileWrite >= 0)
    assert.ok(profileCheck > profileWrite)
    assert.ok(success > profileCheck)
    const failureCleanup = route.slice(profileCheck, success)
    assert.match(failureCleanup, /auth\/v1\/admin\/users\/\$\{userId\}/)
    assert.match(failureCleanup, /method:\s*'DELETE'/)
  })

  it('keeps onboarding incomplete until profile, goal, and plan verify', () => {
    const onboarding = source('src/app/onboarding/page.tsx')
    const pending = onboarding.indexOf('onboarding_completed: false')
    const goal = onboarding.indexOf("from('goals')")
    const generate = onboarding.indexOf("apiFetch('/api/generate-plan'")
    const complete = onboarding.indexOf(".update({ onboarding_completed: true })")
    const verify = onboarding.indexOf("select('generation_status, plan_data')")
    const redirect = onboarding.indexOf("window.location.assign('/dashboard?welcome=1&login=1')")

    assert.ok(pending >= 0)
    assert.ok(goal > pending)
    assert.ok(generate > goal)
    assert.ok(complete > generate)
    assert.ok(verify > complete)
    assert.ok(redirect > verify)
  })

  it('makes onboarding retries idempotent without schema changes', () => {
    const onboarding = source('src/app/onboarding/page.tsx')
    const analyticsLoader = source('src/lib/app/analytics-data.ts')
    assert.match(onboarding, /const primaryGoalId = activeGoals\?\.\[0\]\?\.id/)
    assert.match(onboarding, /primaryGoalId[\s\S]*?from\('goals'\)\.update\(goalPayload\)/)
    assert.match(onboarding, /duplicateGoalIds[\s\S]*?is_active: false/)
    assert.doesNotMatch(onboarding, /from\('body_measurements'\)/)
    assert.doesNotMatch(analyticsLoader, /from\('body_measurements'\)/)
  })

  it('loads profile and goal without selecting a non-existent profile goal_type', () => {
    const loader = source('src/features/today/today-data-loader.ts')
    const profileSelect = loader.slice(
      loader.indexOf(".from('user_profiles')"),
      loader.indexOf(".from('goals')")
    )
    assert.doesNotMatch(profileSelect, /goal_type/)
    assert.match(profileSelect, /\.maybeSingle\(\)/)
    assert.match(loader, /goal:\s*Goal \| null/)
    assert.match(loader, /if \(profileResult\.error\) throw/)
  })

  it('never paints the fixed 2000 calorie stub during bootstrap', () => {
    const fallback = source('src/features/today/fallback-today-plan.ts')
    const today = source('src/features/today/TodayPageClient.tsx')
    assert.doesNotMatch(fallback, /const calories = 2000/)
    assert.match(fallback, /calculateGoalPlan\(profile, goal\)/)
    assert.match(today, /if \(!profile\?\.onboarding_completed\)/)
    assert.match(today, /if \(!resolvedTodayPlan\)/)
  })

  it('keeps incomplete users behind the onboarding guard', () => {
    const guard = source('src/features/auth/AppAuthGuard.tsx')
    assert.match(guard, /if \(!profile\?\.onboarding_completed\)/)
    assert.match(guard, /router\.replace\('\/onboarding'\)/)
  })
})
