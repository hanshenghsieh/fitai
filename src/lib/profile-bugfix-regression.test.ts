import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { calculateGoalPlan } from '@/lib/goal-calculator'
import type { Goal, UserProfile } from '@/types'

const root = new URL('../../', import.meta.url)
const source = (path: string) => readFileSync(new URL(path, root), 'utf8')

const profile = {
  gender: 'male',
  age: 35,
  height_cm: 175,
  weight_kg: 70,
  body_fat_pct: 20,
  activity_level: 'moderate',
} as UserProfile

const goal = {
  goal_type: 'lose_fat',
  target_weight_kg: 69,
  start_date: '2026-07-17',
  end_date: '2026-10-15',
} as Goal

describe('BUGFIX-PROFILE-001', () => {
  it('keeps auto daily calories strictly decreasing by selected pace with a deadline', () => {
    const plan = (fat_loss_pace: 'conservative' | 'standard' | 'aggressive') =>
      calculateGoalPlan(profile, goal, {
        fat_loss_pace,
        calorie_mode: 'auto',
        target_days: 90,
      })

    const conservative = plan('conservative')
    const standard = plan('standard')
    const aggressive = plan('aggressive')
    assert.ok(conservative.dailyCalories > standard.dailyCalories)
    assert.ok(standard.dailyCalories > aggressive.dailyCalories)
    assert.ok(conservative.proteinGrams < standard.proteinGrams)
    assert.ok(standard.proteinGrams < aggressive.proteinGrams)
    assert.ok(conservative.carbsGrams > standard.carbsGrams)
    assert.ok(standard.carbsGrams > aggressive.carbsGrams)
    assert.ok(conservative.fatGrams > standard.fatGrams)
    assert.ok(standard.fatGrams > aggressive.fatGrams)
  })

  it('derives macros and calorie-bank intensity from the same pace state and clears caches', () => {
    const goals = source('src/components/betterbit-v2/settings/subpages/GoalsSettingsView.tsx')
    assert.match(goals, /const bankIntensity = paceToCalorieBankIntensity\(pace\)/)
    assert.doesNotMatch(goals, /setBankIntensity/)
    assert.match(goals, /invalidateUserPreferencesCache\(\)/)
    assert.match(goals, /invalidateSettingsSave\(initial\.profile\.id\)/)
    assert.match(goals, /router\.refresh\(\)/)
    assert.match(goals, /autoPlan\?\.proteinGrams/)
    assert.match(goals, /autoPlan\?\.carbsGrams/)
    assert.match(goals, /autoPlan\?\.fatGrams/)
  })

  it('renders delete-account confirmation as a centered viewport portal', () => {
    const dialog = source('src/components/settings/SettingsDeleteAccountSection.tsx')
    const css = source('src/styles/betterbit-v2.css')
    assert.match(dialog, /V2OverlayPortal/)
    assert.match(dialog, /className="v2-delete-account-overlay"/)
    assert.match(css, /\.v2-delete-account-overlay\s*\{[\s\S]*position:\s*fixed/)
    assert.match(css, /\.v2-delete-account-overlay\s*\{[\s\S]*place-items:\s*center/)
    assert.match(css, /max\(16px, var\(--app-safe-top\)\)/)
    assert.match(css, /max\(16px, var\(--app-safe-bottom\)\)/)
  })

  it('keeps birthday edits in a draft until explicit completion', () => {
    const view = source('src/components/betterbit-v2/settings/subpages/ProfileSettingsView.tsx')
    assert.match(view, /if \(!raw\) return 'YYYY\/MM\/DD'/)
    assert.match(view, /const \[birthDraft, setBirthDraft\]/)
    assert.match(view, /aria-label="出生年份"/)
    assert.match(view, /aria-label="出生月份"/)
    assert.match(view, /aria-label="出生日期"/)
    assert.match(view, /setBirthDate\(birthDraft\)/)
    assert.match(view, /✓ 完成/)
    assert.doesNotMatch(view, /type="date"/)
  })
})
