import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import {
  addDaysToDateKey,
  normalizePlanTimeZone,
  weekStartForTimeZone,
} from './weekly-plan-week'

const source = (path: string) =>
  readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

describe('AUTH-ONBOARDING-RUNTIME-FIX-005 weekly plan contract', () => {
  it('uses the iPhone timezone at the UTC Sunday to local Monday boundary', () => {
    const observedTime = new Date('2026-07-19T17:21:00.000Z')
    assert.equal(weekStartForTimeZone(observedTime, 'Asia/Taipei'), '2026-07-20')
    assert.equal(weekStartForTimeZone(observedTime, 'UTC'), '2026-07-13')
  })

  it('normalizes invalid zones and adds days without host timezone drift', () => {
    assert.equal(normalizePlanTimeZone('not/a-zone'), 'Asia/Taipei')
    assert.equal(addDaysToDateKey('2026-07-20', 6), '2026-07-26')
  })

  it('returns the generated server week key and verifies that exact key before completion', () => {
    const route = source('src/app/api/generate-plan/route.ts')
    const onboarding = source('src/app/onboarding/page.tsx')
    const verify = onboarding.indexOf(".eq('week_start', result.week_start)")
    const complete = onboarding.indexOf(".update({ onboarding_completed: true })")

    assert.match(route, /week_start:\s*result\.weekStart/)
    assert.match(onboarding, /JSON\.stringify\(\{ timezone: timeZone \}\)/)
    assert.ok(verify >= 0)
    assert.ok(complete > verify)
  })

  it('keeps full name and injuries out of required plan validation', () => {
    const generator = source('src/lib/generate-weekly-plan.ts')
    const validation = generator.slice(
      generator.indexOf('function requiredPlanFields'),
      generator.indexOf('export async function generateWeeklyPlanForUser')
    )

    assert.doesNotMatch(validation, /full_name|display_name|email/)
    assert.doesNotMatch(validation, /injuries/)
  })
})
