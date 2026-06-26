import type {
  FoodIntelligenceCatalog,
  FoodIntelligenceItemInput,
  MealGraphEdge,
  RecommendedAddon,
  RecommendedReplacement,
  RecommendationRule,
} from './types'
import { BEEF_NOODLE, DRINK, FRIED, LEAN_PROTEIN, SUGAR_DRINK } from './tags'
import type { DietTag, FoodCategory } from './types'

function itemConfidence(item: FoodIntelligenceItemInput): string {
  return item.verification?.confidence ?? item.nutrition_trace?.confidence ?? 'C'
}

function runtimeSafe(from: FoodIntelligenceItemInput, to: FoodIntelligenceItemInput): boolean {
  const grades = [itemConfidence(from), itemConfidence(to)]
  return grades.every(g => g === 'A' || g === 'B')
}

function findInCatalog(
  catalog: FoodIntelligenceCatalog,
  store: string,
  patterns: RegExp[],
  opts?: { excludeId?: string; maxCalories?: number }
): FoodIntelligenceItemInput | undefined {
  const pool = catalog.byStore.get(store) ?? catalog.items
  for (const item of pool) {
    if (opts?.excludeId && item.id === opts.excludeId) continue
    if (opts?.maxCalories && item.calories > opts.maxCalories) continue
    if (patterns.some(p => p.test(item.name))) return item
  }
  return undefined
}

function findGlobal(catalog: FoodIntelligenceCatalog, patterns: RegExp[]): FoodIntelligenceItemInput | undefined {
  return catalog.items.find(item => patterns.some(p => p.test(item.name)))
}

export function inferRecommendationRules(
  input: FoodIntelligenceItemInput,
  tags: DietTag[],
  category: FoodCategory
): RecommendationRule[] {
  const rules = new Set<RecommendationRule>()
  const conf = itemConfidence(input)

  if (conf === 'D') rules.add('runtime_blocked')
  if (tags.includes('high_protein')) rules.add('protein_gap_good')
  if (input.protein_g < 12) rules.add('protein_gap_poor')
  if (input.fat_g <= 15) rules.add('fat_limit_good')
  if (input.fat_g >= 28 || tags.includes('fried')) rules.add('fat_limit_bad')
  if (tags.includes('low_sugar') || SUGAR_DRINK.test(input.name) === false) rules.add('sugar_limit_good')
  if (SUGAR_DRINK.test(input.name) || tags.includes('dessert')) rules.add('sugar_limit_bad')
  if (input.calories <= 550) rules.add('calorie_limit_good')
  if (input.calories >= 700) rules.add('calorie_limit_bad')
  if (input.calories <= 520 && input.fat_g <= 20) rules.add('dinner_safe')
  if (input.calories >= 650 || FRIED.test(input.name)) rules.add('dinner_heavy')
  if (/早餐|蛋餅|飯糰|粥|豆漿/.test(input.name)) rules.add('breakfast_fit')
  if (BEEF_NOODLE.test(input.name)) rules.add('breakfast_poor')
  if (input.calories <= 280 && input.protein_g >= 10) rules.add('late_night_safe')
  if (input.calories >= 600) rules.add('late_night_heavy')
  if (tags.includes('post_workout')) rules.add('post_workout_good')
  if (input.protein_g < 20 && input.calories >= 400) rules.add('post_workout_poor')
  if (tags.includes('pre_workout')) rules.add('pre_workout_good')
  if (category === '飲料' || category === '手搖飲') rules.add('low_satiety_drink')
  if (tags.includes('high_satiety')) rules.add('high_satiety_solid')
  if (tags.includes('weight_loss')) rules.add('weight_loss_good')
  if (FRIED.test(input.name) || SUGAR_DRINK.test(input.name)) rules.add('weight_loss_poor')
  if (tags.includes('fried')) rules.add('fried_avoid')

  return [...rules]
}

export function buildRecommendedAddons(
  input: FoodIntelligenceItemInput,
  catalog: FoodIntelligenceCatalog,
  category: FoodCategory
): RecommendedAddon[] {
  if (category === '手搖飲' || (DRINK.test(input.name) && SUGAR_DRINK.test(input.name))) {
    const unsweet = findInCatalog(catalog, input.store, [/無糖.*茶|無糖綠茶|美式咖啡/], {
      excludeId: input.id,
      maxCalories: 30,
    })
    if (unsweet) {
      return [{ item_id: unsweet.id, name: unsweet.name, reason: '手搖飲改無糖茶，避免液體熱量' }]
    }
    return []
  }

  if (category === '飲料' || input.role === 'drink') return []

  const addons: RecommendedAddon[] = []
  const candidates: Array<{ patterns: RegExp[]; reason: string; maxCal?: number }> = [
    { patterns: [/茶葉蛋/], reason: '獨立副食，補充蛋白質' },
    { patterns: [/無糖豆漿/], reason: '液體蛋白，不組成套餐' },
    { patterns: [/沙拉/], reason: '增加纖維與飽足感', maxCal: 200 },
    { patterns: [/無糖綠茶|無糖茶/], reason: '零糖飲料搭配', maxCal: 20 },
  ]

  for (const c of candidates) {
    const hit =
      findInCatalog(catalog, input.store, c.patterns, {
        excludeId: input.id,
        maxCalories: c.maxCal,
      }) ?? findGlobal(catalog, c.patterns)
    if (hit && !addons.some(a => a.item_id === hit.id)) {
      addons.push({ item_id: hit.id, name: hit.name, reason: c.reason })
    }
    if (addons.length >= 3) break
  }

  return addons
}

export function buildRecommendedReplacements(
  input: FoodIntelligenceItemInput,
  catalog: FoodIntelligenceCatalog
): RecommendedReplacement[] {
  const replacements: RecommendedReplacement[] = []
  const n = input.name

  const rules: Array<{ if: RegExp; find: RegExp[]; reason: string }> = [
    { if: /炸雞|咔啦|炸雞腿/, find: [/烤雞|舒肥雞胸|雞胸/], reason: '炸改烤或雞胸，降低油脂' },
    { if: /珍珠奶茶|珍奶/, find: [/無糖.*茶|無糖豆漿|美式咖啡/], reason: '高糖飲改無糖選項' },
    { if: /薯條/, find: [/沙拉|地瓜|燙青菜/], reason: '炸薯改沙拉或地瓜' },
    { if: /大麥克|雙層牛肉/, find: [/麥香雞|雞胸|烤雞/], reason: '高脂堡改較瘦蛋白主餐' },
  ]

  for (const rule of rules) {
    if (!rule.if.test(n)) continue
    const hit =
      findInCatalog(catalog, input.store, rule.find, { excludeId: input.id }) ??
      findGlobal(catalog, rule.find)
    if (hit && hit.id !== input.id && !replacements.some(r => r.item_id === hit.id)) {
      replacements.push({ item_id: hit.id, name: hit.name, reason: rule.reason })
    }
  }

  if (FRIED.test(n) && LEAN_PROTEIN.test(n) === false) {
    const lean = findInCatalog(catalog, input.store, [/雞胸|舒肥|烤雞/], { excludeId: input.id })
    if (lean) {
      replacements.push({ item_id: lean.id, name: lean.name, reason: '炸物改瘦肉蛋白（替代建議，非改名）' })
    }
  }

  return replacements.slice(0, 3)
}

export function buildMealGraphEdges(
  input: FoodIntelligenceItemInput,
  catalog: FoodIntelligenceCatalog,
  addons: RecommendedAddon[],
  replacements: RecommendedReplacement[],
  category: FoodCategory
): MealGraphEdge[] {
  const edges: MealGraphEdge[] = []
  const isMain = category === '主餐' || input.role === 'combo'

  if (!isMain) return edges

  for (const addon of addons) {
    const target = catalog.byId.get(addon.item_id)
    if (!target) continue
    const edgeType = DRINK.test(target.name) ? 'main_to_drink' : 'main_to_side'
    edges.push({
      from_id: input.id,
      to_id: addon.item_id,
      edge_type: edgeType,
      weight: edgeType === 'main_to_side' ? 0.75 : 0.55,
      explain: `建議搭配（非官方套餐）：${addon.reason}`,
      runtime_safe: runtimeSafe(input, target),
    })
  }

  for (const rep of replacements) {
    const target = catalog.byId.get(rep.item_id)
    if (!target) continue
    edges.push({
      from_id: input.id,
      to_id: rep.item_id,
      edge_type: 'main_to_replacement',
      weight: 0.65,
      explain: `替代建議：${rep.reason}`,
      runtime_safe: runtimeSafe(input, target),
    })
  }

  return edges
}

export function buildCatalog(items: FoodIntelligenceItemInput[]): FoodIntelligenceCatalog {
  const byId = new Map(items.map(i => [i.id, i]))
  const byStore = new Map<string, FoodIntelligenceItemInput[]>()
  for (const item of items) {
    const list = byStore.get(item.store) ?? []
    list.push(item)
    byStore.set(item.store, list)
  }
  return { items, byId, byStore }
}
