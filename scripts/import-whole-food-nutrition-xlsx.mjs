/**
 * Import BetterBit whole food nutrition model from Excel.
 * Usage: node scripts/import-whole-food-nutrition-xlsx.mjs [path-to-xlsx]
 * Default: data/nutrition/BetterBit_whole_food_nutrition_model_expanded_5x.xlsx
 */
import * as XLSX from 'xlsx'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const defaultPath = join(root, 'data', 'nutrition', 'BetterBit_whole_food_nutrition_model_expanded_5x.xlsx')
const xlsxPath = process.argv[2] ?? defaultPath
const outDir = join(root, 'src', 'lib', 'nutrition', 'home-cooked', 'data')

/** Extra AI / user labels → food_id */
const EXTRA_LABEL_ALIASES = {
  SF001: ['鮭魚', '鮭魚塊', '三文魚', '鮭'],
  SO001: ['豆腐', '板豆腐'],
  SO002: ['嫩豆腐'],
  VG004: ['高麗菜'],
  VG013: ['紅蘿蔔', '紅蘿蔔块', '胡蘿蔔'],
  ME009: ['絞肉', '炒絞肉', '豬絞肉', '牛絞肉', '肉末'],
  ME001: ['雞胸', '雞胸肉'],
  ME004: ['豬里肌'],
  ME008: ['牛里肌'],
  ST001: ['白飯', '米饭'],
  SO036: ['豆芽', '豆芽菜', '黃豆芽'],
  SO037: ['綠豆芽'],
}

function mapCategory(excelCategory) {
  if (excelCategory === '主食/澱粉') return 'carb'
  if (['肉類/蛋白質', '蛋類', '海鮮/魚類', '豆類/植物蛋白', '乳品'].includes(excelCategory)) return 'protein'
  if (['蔬菜', '水果'].includes(excelCategory)) return 'veg'
  if (['堅果/種子', '油脂'].includes(excelCategory)) return 'fat'
  return 'other'
}

function buildAliases(foodName, foodId) {
  const aliases = new Set([foodName])
  const noParen = foodName.replace(/（.*?）/g, '').replace(/\(.*?\)/g, '').trim()
  if (noParen && noParen !== foodName) aliases.add(noParen)
  for (const a of EXTRA_LABEL_ALIASES[foodId] ?? []) aliases.add(a)
  return [...aliases]
}

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

const wb = XLSX.read(readFileSync(xlsxPath))
const ingredientRows = XLSX.utils.sheet_to_json(wb.Sheets['IngredientDB'])
const oilRows = XLSX.utils.sheet_to_json(wb.Sheets['Oil_Rules'])
const sauceRows = XLSX.utils.sheet_to_json(wb.Sheets['Sauce_Rules'])

const ingredients = ingredientRows.map(row => {
  const id = String(row.food_id).toLowerCase()
  const name_zh = String(row.food_name).trim()
  return {
    id,
    food_id: String(row.food_id),
    name_zh,
    category: mapCategory(String(row.category)),
    excel_category: String(row.category),
    state: row.state ? String(row.state) : undefined,
    aliases: buildAliases(name_zh, String(row.food_id)),
    calories_per_100: num(row.kcal_100g),
    protein_g_per_100: num(row.protein_g_100g),
    carbs_g_per_100: num(row.carb_g_100g),
    fat_g_per_100: num(row.fat_g_100g),
    sodium_mg_per_100: row.sodium_mg_100g != null ? num(row.sodium_mg_100g) : undefined,
    default_unit: 'g',
    source: row.source ? String(row.source) : 'betterbit_xlsx',
    note: row.note ? String(row.note) : undefined,
  }
})

const oilRules = oilRows.map(row => ({
  lookup_key: String(row.lookup_key),
  cooking_method: String(row.cooking_method),
  oil_level: String(row.oil_level),
  oil_g_per_meal: num(row.oil_g_per_meal),
  note: row.note ? String(row.note) : undefined,
}))

const sauceRules = sauceRows.map(row => ({
  sauce_level: String(row.sauce_level),
  kcal: num(row.kcal),
  protein_g: num(row.protein_g),
  fat_g: num(row.fat_g),
  carb_g: num(row.carb_g),
  sodium_mg: num(row.sodium_mg),
  note: row.note ? String(row.note) : undefined,
}))

const meta = {
  imported_at: new Date().toISOString(),
  source_file: xlsxPath,
  ingredient_count: ingredients.length,
  version: 'BetterBit_whole_food_nutrition_model_expanded_5x',
}

mkdirSync(outDir, { recursive: true })
writeFileSync(join(outDir, 'ingredient-db.json'), JSON.stringify(ingredients, null, 2))
writeFileSync(join(outDir, 'oil-rules.json'), JSON.stringify(oilRules, null, 2))
writeFileSync(join(outDir, 'sauce-rules.json'), JSON.stringify(sauceRules, null, 2))
writeFileSync(join(outDir, 'meta.json'), JSON.stringify(meta, null, 2))

console.log(`Imported ${ingredients.length} foods, ${oilRules.length} oil rules, ${sauceRules.length} sauce rules`)
console.log(`→ ${outDir}`)
