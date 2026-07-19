import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { foodAllowedByDiet } from '@/lib/recommendation/dietary-preference-filter'
import { getDishTemplates, getVariantsForTemplate } from '@/lib/recommendation/dish-first/catalog'
import { getRecommendationFoodsV2 } from '@/lib/recommendation/v2/food-data'
import { rollDishFirstRecommendation } from '@/lib/recommendation/dish-first/engine'
import { rollRecommendationV2 } from '@/lib/recommendation/v2/engine'
import { computeTodayMealState } from '@/lib/engines/next-meal-engine'
import {
  buildLocalReminderSchedule,
  TEST_NOTIFICATION_ID,
} from '@/lib/notifications/local-reminders'
import { DEFAULT_NOTIFICATION_SETTINGS } from '@/lib/settings/user-settings-types'

const root = new URL('../../', import.meta.url)
const source = (path: string) => readFileSync(new URL(path, root), 'utf8')

describe('BUGFIX-PREFERENCES-NOTIFICATIONS-001', () => {
  it('blocks explicit egg foods and aliases without treating protein copy as egg', () => {
    const context = { restrictions: ['no_egg'] }
    for (const name of ['茶葉蛋', '水煮蛋', '滷蛋', '荷包蛋', '炒蛋', '蛋餅', '蔥蛋']) {
      assert.equal(foodAllowedByDiet({ name }, context), false, name)
    }
    assert.equal(foodAllowedByDiet({ name: '高蛋白雞胸沙拉', tags: ['高蛋白'] }, context), true)
    assert.equal(foodAllowedByDiet({ name: '早餐捲', aliases: ['雞蛋早餐捲'] }, context), false)
    assert.equal(foodAllowedByDiet({ name: '早餐盤', tags: ['egg'] }, context), false)
  })

  it('supports beef and dairy preferences using tags, aliases and safe keywords', () => {
    assert.equal(
      foodAllowedByDiet({ name: '招牌丼飯', aliases: ['牛五花丼'] }, { restrictions: ['no_beef'] }),
      false
    )
    assert.equal(
      foodAllowedByDiet({ name: '原味優格杯', tags: ['dairy'] }, { restrictions: ['no_dairy'] }),
      false
    )
    assert.equal(
      foodAllowedByDiet({ name: '無糖豆奶' }, { restrictions: ['no_dairy'] }),
      true
    )
  })

  it('removes egg candidates from dish variants and V2 recommendation metadata', () => {
    const context = { restrictions: ['no_egg'] }
    const dishCandidates = getDishTemplates().flatMap(template => [
      template,
      ...getVariantsForTemplate(template.id),
    ])
    const knownEggCandidates = dishCandidates.filter(item => /茶葉蛋|水煮蛋|蛋餅|滷蛋/.test(item.name))
    assert.ok(knownEggCandidates.length > 0)
    assert.equal(knownEggCandidates.every(item => !foodAllowedByDiet(item, context)), true)

    const v2EggCandidates = getRecommendationFoodsV2().filter(item =>
      /茶葉蛋|水煮蛋|蛋餅|滷蛋/.test(item.name)
    )
    assert.ok(v2EggCandidates.length > 0)
    assert.equal(v2EggCandidates.every(item => !foodAllowedByDiet(item, context)), true)
  })

  it('applies the dietary gate inside both active recommendation engines', () => {
    const dietary = { restrictions: ['no_egg'] }
    const dayState = {
      ...computeTodayMealState({
        todayFoodLogs: [],
        normalTargetKcal: 2000,
        proteinTargetG: 120,
        fatTargetG: 65,
        carbsTargetG: 250,
        mealSlot: 'breakfast',
      }),
      allowDiceAndSuggest: true,
    }

    for (let seed = 1; seed <= 40; seed += 1) {
      const dish = rollDishFirstRecommendation({
        meal_type: 'breakfast',
        day_state: dayState,
        dietary_preferences: dietary,
        seed: seed * 7919,
      }).result
      if (dish) {
        assert.equal(foodAllowedByDiet(dish.template, dietary), true)
        if (dish.variant) assert.equal(foodAllowedByDiet(dish.variant, dietary), true)
        assert.equal(
          dish.brandItems.every(item =>
            foodAllowedByDiet({ name: item.itemName, aliases: item.aliases, tags: item.tags }, dietary)
          ),
          true
        )
      }

      const v2 = rollRecommendationV2({
        meal_type: 'breakfast',
        daily_targets: { calories: 2000, protein_g: 120, carbs_g: 250, fat_g: 65 },
        day_state: dayState,
        today_food_logs: [],
        dietary_preferences: dietary,
        seed: seed * 3571,
      }).suggestion
      assert.equal(
        (v2?.lines ?? []).every(line =>
          foodAllowedByDiet({ name: line.item.name, tags: line.item.tags }, dietary)
        ),
        true
      )
    }
  })

  it('builds deterministic local schedules and removes disabled reminder classes', () => {
    const enabled = buildLocalReminderSchedule({
      ...DEFAULT_NOTIFICATION_SETTINGS,
      breakfast_enabled: true,
      breakfast_time: '07:45',
      lunch_enabled: false,
      dinner_enabled: false,
      snack_enabled: false,
      water_enabled: false,
      weight_log_enabled: false,
      weekly_review_enabled: false,
    })
    assert.deepEqual(enabled.map(item => item.id), [1101])
    assert.deepEqual(enabled[0]?.schedule?.on, { hour: 7, minute: 45 })
    assert.equal(enabled[0]?.schedule?.repeats, true)

    const disabled = buildLocalReminderSchedule({
      ...DEFAULT_NOTIFICATION_SETTINGS,
      breakfast_enabled: false,
      lunch_enabled: false,
      dinner_enabled: false,
      snack_enabled: false,
      water_enabled: false,
      weight_log_enabled: false,
      weekly_review_enabled: false,
    })
    assert.deepEqual(disabled, [])
    assert.equal(TEST_NOTIFICATION_ID, 1901)
  })

  it('uses local calendar schedules, unique IDs, quiet hours and weekly recurrence', () => {
    const schedule = buildLocalReminderSchedule({
      ...DEFAULT_NOTIFICATION_SETTINGS,
      breakfast_enabled: false,
      lunch_enabled: false,
      dinner_enabled: false,
      water_enabled: true,
      water_interval_hours: 3,
      quiet_hours_enabled: true,
      quiet_hours_start: '22:30',
      quiet_hours_end: '08:00',
      weight_log_enabled: true,
      weight_log_per_week: 2,
      weekly_review_enabled: true,
      weekly_review_day: 0,
      weekly_review_time: '20:15',
    })
    const ids = schedule.map(item => item.id)
    assert.equal(new Set(ids).size, ids.length)
    const waterHours = schedule
      .filter(item => item.extra?.kind === 'water')
      .map(item => item.schedule?.on?.hour)
    assert.deepEqual(waterHours, [8, 11, 14, 17, 20])
    assert.deepEqual(
      schedule.find(item => item.id === 1401)?.schedule?.on,
      { weekday: 1, hour: 20, minute: 15 }
    )
  })

  it('wires one runtime UI source and disables every unimplemented interface control', () => {
    const view = source('src/components/betterbit-v2/settings/subpages/InterfaceSettingsView.tsx')
    const runtime = source('src/lib/settings/ui-preferences-runtime.ts')
    const shell = source('src/components/app/AppRouteShell.tsx')
    assert.match(view, /label="動畫效果"[\s\S]*animations_enabled/)
    assert.match(view, /label="減少動畫"[\s\S]*reduced_motion/)
    for (const label of ['首頁顯示重點', '數字顯示', '營養素顯示', '卡片密度', '主題色調', '底部主按鈕']) {
      const row = view.slice(view.indexOf(`label="${label}"`), view.indexOf(`label="${label}"`) + 180)
      assert.match(row, /subtitle="即將推出"/, label)
      assert.match(row, /disabled/, label)
    }
    assert.match(runtime, /localStorage\.setItem\(STORAGE_KEY/)
    assert.match(shell, /applyUiPreferencesRuntime\(preferences\.ui\)/)
  })

  it('distinguishes native permission, local scheduling, Web Push and denied UI', () => {
    const view = source('src/components/betterbit-v2/settings/subpages/NotificationsSettingsView.tsx')
    const runtime = source('src/lib/notifications/local-reminders.ts')
    const config = source('capacitor.config.ts')
    assert.match(view, /permission === 'granted' && value/)
    assert.match(view, /前往 iOS 設定/)
    assert.match(view, /90 秒測試通知/)
    assert.match(view, /伺服器 Push 即將開放/)
    assert.match(runtime, /await cancelManagedLocalReminders\(\)[\s\S]*LocalNotifications\.schedule/)
    assert.match(runtime, /new Date\(Date\.now\(\) \+ Math\.max\(60, delaySeconds\)/)
    assert.match(config, /presentationOptions: \['badge', 'sound', 'banner', 'list'\]/)
  })
})
