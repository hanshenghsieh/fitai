import type { UserProfile } from '@/types'
import {
  PROTEINS,
  CARBS,
  VEGETABLES,
  FATS,
  COOKING_METHODS,
  ZAIJIAN_COMBO_NOTES,
  type HomeIngredient,
  type CookingMethod,
  type ComboTag,
} from './home-ingredient-db'

export interface HomeMealItem {
  id: string
  name: string
  name_zh: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  portion: string
  preparation: string
}

export interface HomeMealCombo {
  combo_id: string
  type: 'breakfast' | 'lunch' | 'dinner'
  type_zh: string
  name_zh: string
  items: HomeMealItem[]
  total_calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  steps: string[]
  zaijian_note: string
  tags: ComboTag[]
}

const MEAL_SLOT = { breakfast: 0, lunch: 1, dinner: 2 } as const

function filterProteins(profile: UserProfile): HomeIngredient[] {
  let list = [...PROTEINS]
  if (profile.is_vegan) list = list.filter(p => p.vegan)
  else if (profile.is_vegetarian) {
    list = list.filter(p => !['salmon', 'tuna', 'pork_loin', 'beef', 'shrimp', 'chicken_breast', 'chicken_thigh'].includes(p.id))
  }
  for (const dislike of profile.disliked_foods ?? []) {
    list = list.filter(p => !p.name_zh.includes(dislike))
  }
  return list.length ? list : [PROTEINS.find(p => p.id === 'tofu')!]
}

function comboKey(proteinId: string, carbId: string, vegId: string, methodId: string): string {
  return `${proteinId}|${carbId}|${vegId}|${methodId}`
}

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function scaleItem(ing: HomeIngredient, amount: number, preparation: string): HomeMealItem {
  const factor = ing.unit === '顆' ? amount * 50 : ing.unit === '片' ? amount * 35 : amount
  const div = ing.unit === '顆' ? 50 : ing.unit === '片' ? 35 : 100
  const portion =
    ing.unit === '顆' ? `${amount}顆` : ing.unit === '片' ? `${amount}片` : ing.unit === 'ml' ? `${amount}ml` : `${amount}g`
  return {
    id: `${ing.id}-${amount}`,
    name: ing.id,
    name_zh: ing.name_zh,
    calories: Math.round((ing.caloriesPer100g * factor) / div),
    protein_g: Math.round((ing.proteinPer100g * factor) / div),
    carbs_g: Math.round((ing.carbsPer100g * factor) / div),
    fat_g: Math.round((ing.fatPer100g * factor) / div),
    portion,
    preparation,
  }
}

function buildSteps(method: CookingMethod, protein: HomeIngredient, carb: HomeIngredient, veg: HomeIngredient): string[] {
  if (method.id === 'one_pot') {
    return [
      `${protein.name_zh}、${carb.name_zh}、${veg.name_zh} 洗好切好。`,
      `鍋裡加水或高湯，全部丟進去煮 15–20 分鐘。`,
      `調味起鍋，裝碗。`,
    ]
  }
  if (method.id === 'soup') {
    return [
      `${protein.name_zh} 先${method.verb}熟。`,
      `加入 ${veg.name_zh} 和 ${carb.name_zh === '白飯' || carb.name_zh === '半碗飯' ? '少量飯' : carb.name_zh}。`,
      `滾 10 分鐘，起鍋。`,
    ]
  }
  return [
    `${protein.name_zh} ${method.verb}好。`,
    `${carb.name_zh} ${carb.id === 'oats' ? '煮' : carb.id.includes('toast') ? '烤' : '加熱'}。`,
    `${veg.name_zh} ${method.id === 'steamed' ? '蒸' : '燙'}一下，組合上桌。`,
  ]
}

function tagsForCombo(method: CookingMethod, protein: HomeIngredient, carb: HomeIngredient, dayIndex: number): ComboTag[] {
  const tags = new Set<ComboTag>(['normal'])
  for (const t of method.tags ?? []) tags.add(t)
  for (const t of protein.tags ?? []) tags.add(t)
  for (const t of carb.tags ?? []) tags.add(t)
  if (dayIndex >= 5) tags.add('weekend')
  if (dayIndex === 6) tags.add('comfort')
  return [...tags]
}

function scaleComboToTargets(
  protein: HomeIngredient,
  carb: HomeIngredient,
  veg: HomeIngredient,
  method: CookingMethod,
  targetCalories: number,
  targetProtein: number
): HomeMealItem[] {
  const prep = method.verb
  const proteinGramsNeeded = Math.round(targetProtein * 0.55)
  let proteinAmount =
    protein.unit === '顆'
      ? Math.max(1, Math.round(proteinGramsNeeded / 6))
      : Math.max(80, Math.round((proteinGramsNeeded / protein.proteinPer100g) * 100))

  const proteinItem = scaleItem(protein, proteinAmount, prep)
  let remainingCals = targetCalories - proteinItem.calories

  let carbAmount =
    carb.unit === '片'
      ? Math.max(1, Math.round(remainingCals / 120))
      : Math.max(50, Math.round((remainingCals / carb.caloriesPer100g) * 100))
  if (carb.id === 'half_rice') carbAmount = Math.min(carbAmount, 90)

  const carbItem = scaleItem(carb, carbAmount, carb.id === 'oats' ? '煮' : '加熱')
  remainingCals -= carbItem.calories

  const vegAmount = remainingCals > 200 ? 180 : 150
  const vegItem = scaleItem(veg, vegAmount, method.id === 'steamed' ? '蒸' : '燙')

  const items = [proteinItem, carbItem, vegItem]

  if (targetCalories - items.reduce((s, i) => s + i.calories, 0) > 80) {
    const fat = FATS[hashStr(protein.id + carb.id) % FATS.length]!
    items.push(scaleItem(fat, fat.defaultAmount, '搭配'))
  }

  return items
}

export function enumerateComboKeys(profile?: UserProfile): string[] {
  const proteins = profile ? filterProteins(profile) : PROTEINS
  const keys: string[] = []
  for (const p of proteins) {
    for (const c of CARBS) {
      for (const v of VEGETABLES) {
        for (const m of COOKING_METHODS) {
          keys.push(comboKey(p.id, c.id, v.id, m.id))
        }
      }
    }
  }
  return keys
}

export function countUniqueCombos(profile?: UserProfile): number {
  return enumerateComboKeys(profile).length
}

function buildComboFromIndices(
  mealType: 'breakfast' | 'lunch' | 'dinner',
  dayIndex: number,
  targetCalories: number,
  targetProtein: number,
  profile: UserProfile,
  pi: number,
  ci: number,
  vi: number,
  mi: number
): HomeMealCombo {
  const proteins = filterProteins(profile)
  const protein = proteins[pi % proteins.length]!
  const carb = CARBS[ci % CARBS.length]!
  const veg = VEGETABLES[vi % VEGETABLES.length]!
  const method = COOKING_METHODS[mi % COOKING_METHODS.length]!

  const id = comboKey(protein.id, carb.id, veg.id, method.id)
  const items = scaleComboToTargets(protein, carb, veg, method, targetCalories, targetProtein)
  const type_zh = mealType === 'breakfast' ? '早餐' : mealType === 'lunch' ? '午餐' : '晚餐'
  const name_zh = `${method.name_zh}${protein.name_zh} + ${carb.name_zh} + ${veg.name_zh}`
  const noteIdx = hashStr(id + String(dayIndex)) % ZAIJIAN_COMBO_NOTES.length

  return {
    combo_id: id,
    type: mealType,
    type_zh,
    name_zh,
    items,
    total_calories: items.reduce((s, i) => s + i.calories, 0),
    protein_g: items.reduce((s, i) => s + i.protein_g, 0),
    carbs_g: items.reduce((s, i) => s + i.carbs_g, 0),
    fat_g: items.reduce((s, i) => s + i.fat_g, 0),
    steps: buildSteps(method, protein, carb, veg),
    zaijian_note: ZAIJIAN_COMBO_NOTES[noteIdx]!,
    tags: tagsForCombo(method, protein, carb, dayIndex),
  }
}

function preferredIndices(
  dayIndex: number,
  mealType: 'breakfast' | 'lunch' | 'dinner',
  rollOffset: number,
  weekSeed: number
): { pi: number; ci: number; vi: number; mi: number } {
  const proteins = PROTEINS.length
  const carbs = CARBS.length
  const vegs = VEGETABLES.length
  const methods = COOKING_METHODS.length
  const slot = MEAL_SLOT[mealType]
  const base = weekSeed * 97 + dayIndex * 31 + slot * 13 + rollOffset * 17

  let pi = base % proteins
  let ci = (base + 7) % carbs
  let vi = (base + 13) % vegs
  let mi = (base + 19) % methods

  if (dayIndex >= 5) {
    mi = (mi + 3) % methods
    ci = (ci + 2) % carbs
  }
  if (dayIndex === 5) ci = CARBS.findIndex(c => c.tags?.includes('weekend')) >= 0 ? CARBS.findIndex(c => c.tags?.includes('weekend')) : ci
  if (dayIndex === 6) mi = COOKING_METHODS.findIndex(m => m.tags?.includes('lazy')) >= 0 ? COOKING_METHODS.findIndex(m => m.tags?.includes('lazy')) : mi

  return { pi, ci, vi, mi }
}

/**
 * 自己煮組合引擎 — 500+ 模組化健康組合
 * rollOffset: 0 = 預設，≥1 = 🎲 重骰
 */
export function buildHomeCombo(
  mealType: 'breakfast' | 'lunch' | 'dinner',
  dayIndex: number,
  targetCalories: number,
  targetProtein: number,
  profile: UserProfile,
  options: {
    rollOffset?: number
    weekSeed?: number
    excludeComboIds?: string[]
  } = {}
): HomeMealCombo {
  const rollOffset = options.rollOffset ?? 0
  const weekSeed = options.weekSeed ?? 1
  const exclude = new Set(options.excludeComboIds ?? [])
  const proteins = filterProteins(profile)

  for (let attempt = 0; attempt < 800; attempt++) {
    const offset = rollOffset + attempt
    const { pi, ci, vi, mi } = preferredIndices(dayIndex, mealType, offset, weekSeed)
    const combo = buildComboFromIndices(
      mealType,
      dayIndex,
      targetCalories,
      targetProtein,
      profile,
      pi % proteins.length,
      ci,
      vi,
      mi
    )
    if (!exclude.has(combo.combo_id)) return combo
  }

  const fallback = preferredIndices(dayIndex, mealType, rollOffset, weekSeed)
  return buildComboFromIndices(
    mealType,
    dayIndex,
    targetCalories,
    targetProtein,
    profile,
    fallback.pi % proteins.length,
    fallback.ci,
    fallback.vi,
    fallback.mi
  )
}

/** 相容舊 API */
export function buildScaledHomeMeal(
  mealType: 'breakfast' | 'lunch' | 'dinner',
  dayIndex: number,
  targetCalories: number,
  targetProtein: number,
  profile: UserProfile
) {
  const combo = buildHomeCombo(mealType, dayIndex, targetCalories, targetProtein, profile, {
    weekSeed: dayIndex,
  })
  return {
    type: combo.type,
    type_zh: combo.type_zh,
    name_zh: combo.name_zh,
    items: combo.items,
    total_calories: combo.total_calories,
    protein_g: combo.protein_g,
    calories: combo.total_calories,
    carbs_g: combo.carbs_g,
    fat_g: combo.fat_g,
    steps: combo.steps,
    zaijian_note: combo.zaijian_note,
    combo_id: combo.combo_id,
    tags: combo.tags,
  }
}

export function comboToDailyMeal(combo: HomeMealCombo) {
  return {
    type: combo.type,
    type_zh: combo.type_zh,
    name_zh: combo.name_zh,
    items: combo.items,
    total_calories: combo.total_calories,
    steps: combo.steps,
    zaijian_note: combo.zaijian_note,
    combo_id: combo.combo_id,
    tags: combo.tags,
  }
}
