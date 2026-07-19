export type DietaryIngredientGroup =
  | 'pork'
  | 'beef'
  | 'chicken'
  | 'seafood'
  | 'egg'
  | 'dairy'
  | 'peanut'
  | 'tree_nut'
  | 'soy'
  | 'wheat'
  | 'sesame'

export interface DietaryIngredientMetadata {
  name: string
  aliases?: string[] | null
  tags?: string[] | null
  category?: string | null
  description?: string | null
  canonicalName?: string | null
  mainIngredient?: string | null
  ingredients?: string[] | null
  allergens?: string[] | null
  dishFamily?: string | null
}

const GROUP_ALIASES: Record<DietaryIngredientGroup, string[]> = {
  pork: [
    '豬肉', '猪肉', '排骨', '豬排', '猪排', '控肉', '焢肉', '爌肉', '滷肉', '魯肉', '卤肉',
    '肉燥', '五花肉', '三層肉', '梅花肉', '叉燒', '叉烧', '火腿', '培根', '香腸', '香肠',
    '臘腸', '腊肠', '貢丸', '贡丸', '大腸', '大肠', '肥腸', '肥肠', '豬腳', '猪脚',
    '豬肝', '猪肝', '豬血', '猪血', '豬腸', '猪肠', '肉圓', '肉圆', '豬', '猪',
    'pork', 'bacon', 'ham',
  ],
  beef: [
    '牛肉', '牛排', '牛腩', '牛肋', '牛五花', '牛筋', '牛肚', '牛肉燥', '牛肉丸',
    '牛小排', '牛丼', '牛舌', '牛', 'beef', 'steak',
  ],
  chicken: [
    '雞肉', '鸡肉', '雞胸', '鸡胸', '雞腿', '鸡腿', '雞排', '鸡排', '雞翅', '鸡翅',
    '雞塊', '鸡块', '雞柳', '鸡柳', '雞絲', '鸡丝', '雞丁', '鸡丁', '雞', '鸡', 'chicken',
  ],
  seafood: [
    '海鮮', '海鲜', '鮭魚', '鲑鱼', '鮪魚', '鲔鱼', '鯖魚', '鲭鱼', '鱈魚', '鳕鱼',
    '虱目魚', '虱目鱼', '鯛魚', '鲷鱼', '蝦', '虾', '蟹', '蛤蜊', '蛤', '蚵',
    '牡蠣', '牡蛎', '花枝', '透抽', '魷魚', '鱿鱼', '章魚', '章鱼', '干貝', '干贝',
    '貝類', '贝类', '甲殼類', '甲壳类', '魚', '鱼', 'seafood', 'shellfish', 'shrimp', 'fish',
  ],
  egg: [
    '雞蛋', '鸡蛋', '荷包蛋', '滷蛋', '魯蛋', '卤蛋', '茶葉蛋', '茶叶蛋', '炒蛋',
    '滑蛋', '蒸蛋', '蛋花', '蛋餅', '蛋饼', '蛋炒飯', '蛋炒饭', '加蛋', '玉子',
    '歐姆蛋', '欧姆蛋', '厚蛋燒', '厚蛋烧', '水煮蛋', '白煮蛋', '煎蛋', '鴨蛋',
    '鸭蛋', '鹹蛋', '咸蛋', '皮蛋', '溏心蛋', '半熟蛋', '蔥蛋', '葱蛋', '菜脯蛋',
    '蛋沙拉', '蛋堡', '蛋吐司', '蛋包', '蛋', 'egg', 'omelette', 'omelet',
    'boiled egg', 'fried egg', 'scrambled egg',
  ],
  dairy: [
    '牛奶', '鮮奶', '鲜奶', '奶粉', '奶油', '起司', '芝士', '乳酪', '奶酪', '優格',
    '优格', '優酪乳', '优酪乳', '煉乳', '炼乳', '奶精', '鮮奶油', '鲜奶油', '乳清',
    '拿鐵', '拿铁', '奶茶', '奶昔', 'dairy', 'milk', 'cheese', 'yogurt', 'yoghurt',
    'latte', 'cream', 'whey',
  ],
  peanut: ['花生', 'peanut'],
  tree_nut: ['堅果', '坚果', '核桃', '腰果', '榛果', '開心果', '开心果', '杏仁', 'nuts', 'tree nut'],
  soy: ['大豆', '黃豆', '黄豆', '豆漿', '豆浆', '豆奶', '豆腐', 'soy'],
  wheat: ['小麥', '小麦', '麵粉', '面粉', 'wheat', 'gluten'],
  sesame: ['芝麻', '麻油', 'sesame'],
}

const GROUP_EXCEPTIONS: Partial<Record<DietaryIngredientGroup, RegExp[]>> = {
  pork: [/素排/g, /素肉燥/g, /素肉/g, /植物肉(?:燥)?/g],
  beef: [/牛奶/g, /牛乳/g, /牛蒡/g, /牛番茄/g],
  chicken: [/素雞/g, /素鸡/g, /雞蛋/g, /鸡蛋/g],
  egg: [/蛋白質/g, /蛋白质/g, /高蛋白/g, /植物蛋白/g, /乳清蛋白/g],
  dairy: [/椰奶/g, /豆奶/g, /杏仁奶/g, /燕麥奶/g, /燕麦奶/g, /植物奶/g],
}

const STRUCTURED_GROUP_KEYS: Record<string, DietaryIngredientGroup> = {
  pork: 'pork',
  豬肉: 'pork',
  beef: 'beef',
  牛肉: 'beef',
  chicken: 'chicken',
  雞肉: 'chicken',
  seafood: 'seafood',
  fish: 'seafood',
  shellfish: 'seafood',
  shrimp: 'seafood',
  海鮮: 'seafood',
  egg: 'egg',
  eggs: 'egg',
  雞蛋: 'egg',
  dairy: 'dairy',
  milk: 'dairy',
  cheese: 'dairy',
  yogurt: 'dairy',
  乳製品: 'dairy',
  peanut: 'peanut',
  peanuts: 'peanut',
  nuts: 'tree_nut',
  tree_nut: 'tree_nut',
  soy: 'soy',
  wheat: 'wheat',
  gluten: 'wheat',
  sesame: 'sesame',
}

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase('zh-TW')
}

function semanticSegments(metadata: DietaryIngredientMetadata): string[] {
  return [
    metadata.name,
    ...(metadata.aliases ?? []),
    ...(metadata.tags ?? []),
    metadata.category ?? '',
    metadata.description ?? '',
    metadata.canonicalName ?? '',
    metadata.mainIngredient ?? '',
    ...(metadata.ingredients ?? []),
    ...(metadata.allergens ?? []),
    metadata.dishFamily ?? '',
  ]
    .map(normalized)
    .filter(Boolean)
}

function textForGroup(segments: string[], group: DietaryIngredientGroup): string {
  let text = segments.join(' ')
  for (const exception of GROUP_EXCEPTIONS[group] ?? []) text = text.replace(exception, ' ')
  return text
}

/** Infer canonical ingredient groups from structured metadata first, then compound dish phrases. */
export function inferDietaryIngredientGroups(
  metadata: DietaryIngredientMetadata
): Set<DietaryIngredientGroup> {
  const groups = new Set<DietaryIngredientGroup>()
  const structured = [
    ...(metadata.ingredients ?? []),
    ...(metadata.allergens ?? []),
    ...(metadata.tags ?? []),
    metadata.mainIngredient ?? '',
  ]

  for (const value of structured) {
    const key = normalized(value)
    const direct = STRUCTURED_GROUP_KEYS[key]
    if (direct) groups.add(direct)
  }

  const segments = semanticSegments(metadata)
  for (const [group, aliases] of Object.entries(GROUP_ALIASES) as Array<
    [DietaryIngredientGroup, string[]]
  >) {
    const text = textForGroup(segments, group)
    if (aliases.some(alias => text.includes(normalized(alias)))) groups.add(group)
  }
  return groups
}

