import type { FoodLogEntry } from '@/lib/banks/types'

/** Sum carbs from logs, inferring when legacy entries omit macros. */
export function sumLoggedCarbs(logs: FoodLogEntry[]): number {
  return logs.reduce((acc, log) => acc + resolveLogMacros(log).carbs_g, 0)
}

/** Sum fat from logs, inferring when legacy entries omit macros. */
export function sumLoggedFat(logs: FoodLogEntry[]): number {
  return logs.reduce((acc, log) => acc + resolveLogMacros(log).fat_g, 0)
}

export function resolveLogMacros(log: FoodLogEntry): { carbs_g: number; fat_g: number } {
  const hasCarbs = log.carbs_g != null && log.carbs_g > 0
  const hasFat = log.fat_g != null && log.fat_g > 0
  if (hasCarbs && hasFat) {
    return { carbs_g: Math.round(log.carbs_g!), fat_g: Math.round(log.fat_g!) }
  }
  return inferMacrosFromLog(log)
}

/** Backfill missing macros for display and future saves. Unknown records skip inference. */
export function enrichFoodLog(log: FoodLogEntry): FoodLogEntry {
  if (log.nutrition_status === 'unknown' || log.capture_status === 'photo_only') return log
  const { carbs_g, fat_g } = resolveLogMacros(log)
  if (log.carbs_g === carbs_g && log.fat_g === fat_g) return log
  return { ...log, carbs_g, fat_g }
}

export function enrichFoodLogs(logs: FoodLogEntry[]): FoodLogEntry[] {
  return logs.map(enrichFoodLog)
}

function inferMacrosFromLog(log: FoodLogEntry): { carbs_g: number; fat_g: number } {
  if (log.nutrition_status === 'unknown' || log.calories == null) {
    return { carbs_g: 0, fat_g: 0 }
  }
  const calories = Math.max(0, log.calories ?? 0)
  const proteinKcal = Math.max(0, (log.protein_g ?? 0) * 4)
  const remaining = Math.max(0, calories - proteinKcal)

  if (remaining <= 0) {
    return {
      carbs_g: log.carbs_g != null ? Math.round(log.carbs_g) : 0,
      fat_g: log.fat_g != null ? Math.round(log.fat_g) : 0,
    }
  }

  const name = `${log.name} ${log.store ?? ''}`
  const carbHeavy = /飯|麵|餃|壽司|粥|粉|粄|吐司|地瓜|芋|年糕|麵包|飯卷|丼|炒飯|燴飯|拌飯|烏龍|拉麵|河粉|米粉|潛艇堡|三明治|貝果|燕麥|穀物/i.test(name)
  const fatHeavy = /炸|滷|排骨|雞腿|五花|奶油|起司|薯條|咔啦|酥|起士|培根|香腸|鍋貼煎|油飯/i.test(name)

  let carbShare = 0.45
  let fatShare = 0.35
  if (carbHeavy && !fatHeavy) {
    carbShare = 0.72
    fatShare = 0.18
  } else if (fatHeavy && !carbHeavy) {
    carbShare = 0.22
    fatShare = 0.58
  } else if (carbHeavy && fatHeavy) {
    carbShare = 0.48
    fatShare = 0.42
  }

  const carbKcal = remaining * carbShare
  const fatKcal = remaining * fatShare

  return {
    carbs_g: log.carbs_g != null && log.carbs_g > 0 ? Math.round(log.carbs_g) : Math.round(carbKcal / 4),
    fat_g: log.fat_g != null && log.fat_g > 0 ? Math.round(log.fat_g) : Math.round(fatKcal / 9),
  }
}

export function sumItemMacros(
  items: Array<{ calories?: number; protein_g?: number; carbs_g?: number; fat_g?: number }>
) {
  return items.reduce(
    (acc, item) => ({
      calories: acc.calories + (item.calories ?? 0),
      protein_g: acc.protein_g + (item.protein_g ?? 0),
      carbs_g: acc.carbs_g + (item.carbs_g ?? 0),
      fat_g: acc.fat_g + (item.fat_g ?? 0),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  )
}
