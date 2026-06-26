import type { FoodIntelligenceItemInput, MealContextScores } from './types'
import { BEEF_NOODLE, DRINK, FRIED, SUGAR_DRINK } from './tags'
import type { FoodCategory } from './types'

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}

export function computeMealContext(
  input: FoodIntelligenceItemInput,
  category: FoodCategory
): MealContextScores {
  const n = input.name
  let breakfast = 40
  let lunch = 50
  let dinner = 45
  let late_night = 30
  let snack = 35

  if (/茶葉蛋|蛋餅|飯糰|三明治|粥|豆漿|燒餅|油條|早餐|可頌|貝果/.test(n)) {
    breakfast = 85
    snack = 75
    late_night = 55
  }
  if (/茶葉蛋/.test(n)) {
    breakfast = 80
    snack = 90
    late_night = 70
    lunch = 45
    dinner = 40
  }
  if (/便當|丼|飯|麵|堡|套餐|定食|潛艇堡|沙拉碗/.test(n) && input.calories >= 350) {
    lunch = 90
    dinner = 80
    breakfast = 15
  }
  if (input.store === 'Subway' || /潛艇堡/.test(n)) {
    lunch = 92
    dinner = 85
    breakfast = 20
  }
  if (BEEF_NOODLE.test(n)) {
    lunch = 75
    dinner = 60
    breakfast = 8
    late_night = 25
  }
  if (DRINK.test(n) || category === '飲料' || category === '手搖飲') {
    breakfast = 55
    lunch = 50
    dinner = 45
    snack = 60
    late_night = 40
  }
  if (SUGAR_DRINK.test(n)) {
    snack = 70
    breakfast = 35
    lunch = 30
    dinner = 20
    late_night = 15
  }
  if (FRIED.test(n)) {
    dinner -= 10
    late_night -= 15
  }
  if (input.calories >= 650) {
    late_night -= 20
    breakfast -= 15
  }
  if (input.category === 'breakfast') breakfast += 15
  if (input.category === 'lunch') lunch += 10
  if (input.category === 'dinner') dinner += 10
  if (input.role === 'side' || input.role === 'protein') snack += 20

  return {
    breakfast: clamp(breakfast),
    lunch: clamp(lunch),
    dinner: clamp(dinner),
    late_night: clamp(late_night),
    snack: clamp(snack),
  }
}
