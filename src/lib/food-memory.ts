import type { FoodLogEntry } from '@/lib/banks/types'
import type { FoodSlot } from '@/lib/food-slots'

export interface FrequentFood {
  id: string
  name: string
  store?: string
  calories: number
  protein_g: number
  carbs_g?: number
  fat_g?: number
  count: number
  last_used: string
}

export interface FoodDna {
  frequent: FrequentFood[]
}

const MAX_FREQUENT = 12

export function learnFromLog(dna: FoodDna | undefined, entry: FoodLogEntry): FoodDna {
  const list = [...(dna?.frequent ?? [])]
  const key = entry.name.trim().toLowerCase()
  const idx = list.findIndex(f => f.name.trim().toLowerCase() === key)
  const now = entry.logged_at

  if (idx >= 0) {
    const prev = list[idx]
    list[idx] = {
      ...prev,
      calories: entry.calories,
      protein_g: entry.protein_g,
      carbs_g: entry.carbs_g ?? prev.carbs_g,
      fat_g: entry.fat_g ?? prev.fat_g,
      store: entry.store ?? prev.store,
      count: prev.count + 1,
      last_used: now,
    }
  } else {
    list.unshift({
      id: entry.id,
      name: entry.name,
      store: entry.store,
      calories: entry.calories,
      protein_g: entry.protein_g,
      carbs_g: entry.carbs_g,
      fat_g: entry.fat_g,
      count: 1,
      last_used: now,
    })
  }

  list.sort((a, b) => b.count - a.count || b.last_used.localeCompare(a.last_used))
  return { frequent: list.slice(0, MAX_FREQUENT) }
}

export function frequentToLogEntry(food: FrequentFood, slot: FoodSlot): Omit<FoodLogEntry, 'logged_at' | 'user_declared'> {
  return {
    id: `freq-${food.id}`,
    name: food.name,
    store: food.store,
    calories: food.calories,
    protein_g: food.protein_g,
    carbs_g: food.carbs_g,
    fat_g: food.fat_g,
    slot,
    source: 'frequent',
  }
}

/** 從近期 checkin notes 聚合 Food DNA */
export function buildFoodDnaFromCheckins(
  checkins: { notes?: string | null; checkin_date: string }[]
): FoodDna {
  let dna: FoodDna = { frequent: [] }
  const sorted = [...checkins].sort((a, b) => a.checkin_date.localeCompare(b.checkin_date))
  for (const c of sorted) {
    if (!c.notes) continue
    try {
      const meta = JSON.parse(c.notes) as { user_memory?: { food_logs_today?: FoodLogEntry[]; food_dna?: FoodDna } }
      if (meta.user_memory?.food_dna?.frequent?.length) {
        dna = meta.user_memory.food_dna
      }
      for (const log of meta.user_memory?.food_logs_today ?? []) {
        dna = learnFromLog(dna, log)
      }
    } catch {
      // skip bad json
    }
  }
  return dna
}

export const STARTER_FREQUENT: FrequentFood[] = [
  { id: 's-1', name: '雞胸肉', store: '7-11', calories: 120, protein_g: 23, count: 0, last_used: '' },
  { id: 's-2', name: '蔥油餅', calories: 280, protein_g: 5, count: 0, last_used: '' },
  { id: 's-3', name: '珍珠奶茶', calories: 350, protein_g: 2, count: 0, last_used: '' },
  { id: 's-4', name: '便當', calories: 650, protein_g: 25, count: 0, last_used: '' },
]

export function displayFrequent(dna: FoodDna | undefined): FrequentFood[] {
  const learned = dna?.frequent?.filter(f => f.count > 0) ?? []
  if (learned.length >= 3) return learned.slice(0, 8)
  const names = new Set(learned.map(f => f.name))
  const starters = STARTER_FREQUENT.filter(s => !names.has(s.name))
  return [...learned, ...starters].slice(0, 8)
}
