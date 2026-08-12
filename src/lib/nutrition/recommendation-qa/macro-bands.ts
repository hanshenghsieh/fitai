export type DishMacroBandId =
  | 'chicken_bento'
  | 'rice_bowl'
  | 'noodles'
  | 'dumplings'
  | 'sushi'
  | 'fried'
  | 'drink'
  | 'salad'
  | 'generic'

export interface MacroBand {
  id: DishMacroBandId
  label: string
  calories: [number, number]
  protein_g: [number, number]
  fat_g: [number, number]
  carbs_g: [number, number]
}

export const MACRO_BANDS: Record<DishMacroBandId, MacroBand> = {
  chicken_bento: {
    id: 'chicken_bento',
    label: '雞胸/燒肉便當',
    calories: [420, 650],
    protein_g: [30, 55],
    fat_g: [8, 22],
    carbs_g: [35, 75],
  },
  rice_bowl: {
    id: 'rice_bowl',
    label: '飯類主食',
    calories: [380, 720],
    protein_g: [18, 45],
    fat_g: [8, 28],
    carbs_g: [40, 90],
  },
  noodles: {
    id: 'noodles',
    label: '麵食',
    calories: [350, 780],
    protein_g: [15, 40],
    fat_g: [8, 30],
    carbs_g: [45, 110],
  },
  dumplings: {
    id: 'dumplings',
    label: '水餃/鍋貼',
    calories: [280, 620],
    protein_g: [12, 35],
    fat_g: [6, 24],
    carbs_g: [35, 80],
  },
  sushi: {
    id: 'sushi',
    label: '壽司/丼',
    calories: [300, 680],
    protein_g: [14, 38],
    fat_g: [4, 22],
    carbs_g: [40, 95],
  },
  fried: {
    id: 'fried',
    label: '炸物',
    calories: [320, 750],
    protein_g: [12, 35],
    fat_g: [18, 45],
    carbs_g: [20, 70],
  },
  drink: {
    id: 'drink',
    label: '飲料',
    calories: [0, 450],
    protein_g: [0, 12],
    fat_g: [0, 15],
    carbs_g: [0, 80],
  },
  salad: {
    id: 'salad',
    label: '沙拉/輕食',
    calories: [120, 420],
    protein_g: [10, 35],
    fat_g: [3, 20],
    carbs_g: [5, 35],
  },
  generic: {
    id: 'generic',
    label: '一般餐點',
    calories: [150, 900],
    protein_g: [5, 60],
    fat_g: [3, 50],
    carbs_g: [5, 120],
  },
}

export function classifyDishBand(name: string, tags: string[] = [], role?: string): DishMacroBandId {
  const n = name
  if (role === 'drink' || /奶茶|咖啡|茶$|果汁|可樂|汽水|豆漿|拿鐵|鮮奶|紅茶|綠茶|珍奶/.test(n)) return 'drink'
  if (/沙拉|輕食|蔬食/.test(n)) return 'salad'
  if (/水餃|鍋貼|煎餃|餃子|小籠/.test(n)) return 'dumplings'
  if (/壽司|握壽司|丼|刺身|生魚片|軍艦/.test(n)) return 'sushi'
  if (/炸|雞排|鹽酥|咔啦|薯條|排骨酥/.test(n)) return 'fried'
  if (/麵|拉麵|烏龍|米粉|河粉/.test(n)) return 'noodles'
  if (/雞胸|燒肉飯|雞腿便當|舒肥雞/.test(n)) return 'chicken_bento'
  // Rice balls/onigiri are a snack-sized portion (~150-250 kcal), not a
  // full rice-bowl meal (380-720 kcal) — must be checked before the generic
  // "飯" substring rule below, which would otherwise catch "飯糰" too (it
  // contains "飯") and fail the rice_bowl macro band for having too few
  // calories, incorrectly grading real, well-sourced rice-ball products as
  // low-confidence/unsearchable.
  if (/飯糰/.test(n)) return 'generic'
  if (tags.includes('rice') || /飯|便當|燴飯|炒飯|拌飯/.test(n)) return 'rice_bowl'
  return 'generic'
}

export function macroInBand(
  bandId: DishMacroBandId,
  macros: { calories: number; protein_g: number; fat_g: number; carbs_g: number }
): boolean {
  const band = MACRO_BANDS[bandId]
  return (
    macros.calories >= band.calories[0] &&
    macros.calories <= band.calories[1] &&
    macros.protein_g >= band.protein_g[0] &&
    macros.protein_g <= band.protein_g[1] &&
    macros.fat_g >= band.fat_g[0] &&
    macros.fat_g <= band.fat_g[1] &&
    macros.carbs_g >= band.carbs_g[0] &&
    macros.carbs_g <= band.carbs_g[1]
  )
}
