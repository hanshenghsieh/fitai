import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import {
  normalizeOpenFoodFactsProduct,
  validateGtin,
} from '@/lib/barcode-food'
import { calculateFoodRecordNutrition, defaultFoodRecordDraft } from '@/lib/nutrition/p0-common-foods/calculate'

describe('barcode GTIN validation', () => {
  it('accepts valid GTIN variants and strips scanner separators', () => {
    assert.deepEqual(validateGtin('9638 5074'), { valid: true, gtin: '96385074' })
    assert.deepEqual(validateGtin('036000291452'), { valid: true, gtin: '036000291452' })
    assert.deepEqual(validateGtin('400-6381-333931'), { valid: true, gtin: '4006381333931' })
  })

  it('rejects unsupported lengths, non-digits, and bad check digits', () => {
    assert.deepEqual(validateGtin('1234567'), { valid: false })
    assert.deepEqual(validateGtin('4006381333932'), { valid: false })
    assert.deepEqual(validateGtin('400638ABC3931'), { valid: false })
  })
})

describe('Open Food Facts normalization', () => {
  it('normalizes per-100g data and serving metadata as a database estimate', () => {
    const item = normalizeOpenFoodFactsProduct('4006381333931', {
      product_name: 'Test Granola',
      brands: 'Example Foods',
      categories: 'Breakfast cereals, Snacks',
      serving_size: '30 g',
      serving_quantity: 30,
      product_quantity_unit: 'g',
      nutriments: {
        'energy-kcal_100g': 450,
        proteins_100g: 10,
        carbohydrates_100g: 60,
        fat_100g: 18,
        salt_100g: 0.5,
      },
    })

    assert.ok(item)
    assert.equal(item.sourceType, 'database_estimate')
    assert.equal(item.barcodeMetadata?.nutritionBasis, 'per_100g')
    assert.equal(item.normalAmount, 30)
    assert.equal(item.kcalDefault, 135)
    assert.equal(item.sodiumBase_mg, 200)

    const draft = defaultFoodRecordDraft(item)
    assert.equal(draft.barcodeMetadata?.gtin, '4006381333931')
    assert.equal(calculateFoodRecordNutrition(item, draft).calories, 135)
  })

  it('uses per-100ml provenance for drinks and rejects incomplete nutrition', () => {
    const drink = normalizeOpenFoodFactsProduct('96385074', {
      product_name: 'Tea',
      categories: 'Beverages',
      product_quantity_unit: 'ml',
      nutriments: {
        energy_100g: 167.36,
        proteins_100g: 0,
        carbohydrates_100g: 10,
        fat_100g: 0,
        sodium_100g: 0.01,
      },
    })
    assert.ok(drink)
    assert.equal(drink.foodType, 'drink')
    assert.equal(drink.barcodeMetadata?.nutritionBasis, 'per_100ml')
    assert.equal(drink.kcalBase, 40)

    assert.equal(
      normalizeOpenFoodFactsProduct('96385074', {
        product_name: 'Incomplete',
        nutriments: { 'energy-kcal_100g': 100 },
      }),
      null
    )
  })
})

describe('barcode UI wiring', () => {
  it('uses the official scanner, server API, portion sheet, and TodayOS commit path', () => {
    const root = process.cwd()
    const scanner = readFileSync(`${root}/src/lib/barcode-client.ts`, 'utf8')
    const sheet = readFileSync(
      `${root}/src/components/dashboard/today/BarcodeLogSheet.tsx`,
      'utf8'
    )
    const today = readFileSync(`${root}/src/components/dashboard/TodayOS.tsx`, 'utf8')
    const route = readFileSync(
      `${root}/src/app/api/food-barcode/[gtin]/route.ts`,
      'utf8'
    )

    assert.match(scanner, /@capacitor\/barcode-scanner/)
    assert.match(scanner, /CapacitorBarcodeScanner\.scanBarcode/)
    assert.match(scanner, /\/api\/food-barcode\//)
    assert.match(sheet, /FoodTypePortionSheet/)
    assert.match(sheet, /manual-barcode/)
    assert.match(today, /onCommit=\{handleBarcodeSave\}/)
    assert.match(today, /commitLog\(patch\)/)
    assert.match(today, /targetDate=\{captureTargetDate\}/)
    assert.match(today, /open_food_facts_barcode/)
    assert.match(route, /world\.openfoodfacts\.org\/api\/v2\/product/)
    assert.match(route, /INCOMPLETE_PRODUCT/)
    assert.match(route, /NOT_FOUND/)
    assert.match(route, /TIMEOUT/)
  })
})
