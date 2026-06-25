/** Week score component weights — must sum to 1 */
export const WEEK_SCORE_WEIGHTS = {
  calories: 0.35,
  protein: 0.25,
  workout: 0.15,
  water: 0.1,
  consistency: 0.1,
  weightTrend: 0.05,
} as const

/** Daily score component weights — must sum to 1 */
export const DAY_SCORE_WEIGHTS = {
  calories: 0.25,
  protein: 0.25,
  fat: 0.15,
  veggies: 0.1,
  sugar: 0.1,
  workout: 0.1,
  water: 0.05,
} as const

export const WEEK_GOAL_SCORE = 80

export const SCORE_SIGNAL_THRESHOLDS = {
  green: 80,
  yellow: 60,
} as const

export const SUGAR_DRINK_PATTERN = /珍奶|奶茶|手搖|全糖|半糖|含糖|可樂|汽水|黑糖/
export const HIGH_FIBER_PATTERN = /花椰|蔬菜|青菜|毛豆|地瓜|番薯|菇|沙拉/
