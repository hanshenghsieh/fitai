import type { ConfirmationQuestion, HighRiskTag, MealSceneCategory } from './types'

const HIGH_RISK_PATTERNS: Array<{ tag: HighRiskTag; pattern: RegExp }> = [
  { tag: 'bento', pattern: /便當/ },
  { tag: 'hot_pot', pattern: /火鍋/ },
  { tag: 'braised_snack', pattern: /滷味/ },
  { tag: 'fried_chicken', pattern: /鹽酥雞|鹹酥雞|雞排/ },
  { tag: 'bbq', pattern: /燒肉/ },
  { tag: 'buffet', pattern: /吃到飽|自助餐|buffet/i },
  { tag: 'night_market', pattern: /夜市/ },
  { tag: 'bubble_tea', pattern: /奶茶|手搖|珍奶|鮮奶茶|奶蓋/ },
  { tag: 'salad_dressing', pattern: /沙拉/ },
  { tag: 'pasta', pattern: /義大利麵|義麵|pasta/i },
  { tag: 'curry_rice', pattern: /咖哩飯|咖哩/ },
  { tag: 'fried_rice', pattern: /炒飯/ },
  { tag: 'fried_noodle', pattern: /炒麵/ },
  { tag: 'beef_noodle', pattern: /牛肉麵/ },
  { tag: 'teppanyaki', pattern: /鐵板燒/ },
  { tag: 'donburi', pattern: /丼飯|丼/ },
  { tag: 'fried_platter', pattern: /炸物拼盤|拼盤/ },
  { tag: 'combo_meal', pattern: /套餐/ },
  { tag: 'all_you_can_eat', pattern: /吃到飽/ },
]

export function detectHighRiskTags(label: string, extra: HighRiskTag[] = []): HighRiskTag[] {
  const found = new Set<HighRiskTag>(extra)
  for (const { tag, pattern } of HIGH_RISK_PATTERNS) {
    if (pattern.test(label)) found.add(tag)
  }
  return [...found]
}

export function isHighRiskFood(label: string, tags: HighRiskTag[] = []): boolean {
  return detectHighRiskTags(label, tags).length > 0
}

const CATEGORY_FORCE_CONFIRM: MealSceneCategory[] = [
  'hot_pot', 'bbq', 'braised_snack', 'fried_chicken', 'night_market', 'bento_shop',
]

export function categoryRequiresConfirmation(category: MealSceneCategory, tags: HighRiskTag[]): boolean {
  if (CATEGORY_FORCE_CONFIRM.includes(category)) return true
  return tags.length > 0
}

export function buildConfirmationQuestions(
  tags: HighRiskTag[],
  category: MealSceneCategory
): ConfirmationQuestion[] {
  const questions: ConfirmationQuestion[] = []

  if (tags.includes('bento') || tags.includes('donburi') || tags.includes('curry_rice') || category === 'bento_shop') {
    questions.push({
      id: 'rice_portion',
      prompt: '飯量？',
      options: [
        { id: 'less', label: '少飯' },
        { id: 'half', label: '半飯' },
        { id: 'normal', label: '正常' },
        { id: 'extra', label: '加飯' },
      ],
    })
  }

  if (
    tags.includes('bento') ||
    tags.includes('fried_chicken') ||
    tags.includes('night_market') ||
    category === 'fried_chicken'
  ) {
    questions.push({
      id: 'cooking_method',
      prompt: '主菜？',
      options: [
        { id: 'fried', label: '炸' },
        { id: 'braised', label: '滷' },
        { id: 'grilled', label: '烤' },
        { id: 'pan_fried', label: '煎' },
        { id: 'unknown', label: '不確定' },
      ],
    })
  }

  if (tags.includes('bubble_tea') || category === 'drink_shop') {
    questions.push({
      id: 'drink_sugar',
      prompt: '飲料甜度？',
      options: [
        { id: 'none', label: '無糖' },
        { id: 'light', label: '微糖' },
        { id: 'half', label: '半糖' },
        { id: 'full', label: '全糖' },
      ],
    })
  }

  if (tags.includes('salad_dressing') || tags.includes('hot_pot') || tags.includes('bbq') || tags.includes('teppanyaki')) {
    questions.push({
      id: 'sauce_level',
      prompt: '醬料？',
      options: [
        { id: 'none', label: '不要' },
        { id: 'less', label: '少' },
        { id: 'normal', label: '正常' },
        { id: 'extra', label: '多' },
      ],
    })
  }

  if (tags.includes('night_market') || tags.includes('braised_snack') || tags.includes('fried_platter')) {
    questions.push({
      id: 'portion_size',
      prompt: '份量？',
      options: [
        { id: 'small', label: '小份' },
        { id: 'medium', label: '中份' },
        { id: 'large', label: '大份' },
        { id: 'half', label: '半份' },
      ],
    })
  }

  return questions.slice(0, 2)
}
