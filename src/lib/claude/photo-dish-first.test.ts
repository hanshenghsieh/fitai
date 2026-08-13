/**
 * Build 38 BUG 4 — dish-first vision identification regression tests.
 * A photo of a composite dish (potato/cucumber salad) was decomposed by the
 * vision prompt into unrelated per-ingredient guesses (potato chips / lime /
 * seasoning powder). These tests lock the *systemic* prompt rule and schema
 * shape — never assert on any specific food name from that incident.
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { FoodPhotoParseSchema } from '@/lib/claude/schemas'

const CLIENT_SOURCE = readFileSync(
  path.join(process.cwd(), 'src/lib/claude/client.ts'),
  'utf8'
)

describe('Build 38 BUG 4 — CASE 1: dish-first vision prompt', () => {
  it('prompt instructs dish-first identification before ingredient decomposition', () => {
    // Generic rule keywords only — must not assert any specific food name.
    assert.match(CLIENT_SOURCE, /已經組合完成的料理/)
    assert.match(CLIENT_SOURCE, /不要.{0,60}拆成多個獨立食物/)
    assert.match(CLIENT_SOURCE, /is_composite_dish/)
    assert.match(CLIENT_SOURCE, /dish_name/)
  })

  it('prompt still forbids the model from estimating/outputting nutrition numbers', () => {
    assert.match(CLIENT_SOURCE, /不得估算或輸出任何營養數值/)
  })

  it('prompt does not hardcode any specific food name from the incident', () => {
    for (const banned of ['馬鈴薯沙拉', '洋芋片', '小黃瓜', '萊姆', '青檸']) {
      assert.equal(CLIENT_SOURCE.includes(banned), false, `prompt must not hardcode "${banned}"`)
    }
  })
})

describe('Build 38 BUG 4 — CASE 2: schema still supports genuinely independent multi-item photos', () => {
  it('accepts a composite-dish response (is_composite_dish + dish_name, single logical item)', () => {
    const parsed = FoodPhotoParseSchema.parse({
      is_composite_dish: true,
      dish_name: '任意整道料理名稱',
      items: [{ name: '任意整道料理名稱', confidence: 'high' }],
      meal_summary: '一份任意料理',
    })
    assert.equal(parsed.is_composite_dish, true)
    assert.equal(parsed.dish_name, '任意整道料理名稱')
  })

  it('accepts a genuinely-independent multi-item response (is_composite_dish false, several items)', () => {
    const parsed = FoodPhotoParseSchema.parse({
      is_composite_dish: false,
      items: [
        { name: '獨立食物甲', confidence: 'high' },
        { name: '獨立食物乙', confidence: 'medium' },
        { name: '獨立食物丙', confidence: 'high' },
      ],
      meal_summary: '三樣分開擺放的食物',
    })
    assert.equal(parsed.is_composite_dish, false)
    assert.equal(parsed.items.length, 3)
  })

  it('dish_name/is_composite_dish are optional — old-shape responses (pre-FIX1) still validate', () => {
    const parsed = FoodPhotoParseSchema.parse({
      items: [{ name: '任意食物', confidence: 'medium' }],
    })
    assert.equal(parsed.is_composite_dish, undefined)
    assert.equal(parsed.dish_name, undefined)
  })
})
