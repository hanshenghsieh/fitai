/** Phase 5 — 真實生活餐次，不強迫早午晚 */

export type FoodSlot = 'meal1' | 'meal2' | 'meal3' | 'other' | 'before_sleep'

export const FOOD_SLOTS: { id: FoodSlot; label: string }[] = [
  { id: 'meal1', label: '第 1 餐' },
  { id: 'meal2', label: '第 2 餐' },
  { id: 'meal3', label: '第 3 餐' },
  { id: 'other', label: '其他' },
  { id: 'before_sleep', label: '睡前' },
]

export function defaultFoodSlot(hour: number): FoodSlot {
  if (hour >= 22 || hour < 5) return 'before_sleep'
  if (hour < 10) return 'meal1'
  if (hour < 15) return 'meal2'
  if (hour < 20) return 'meal3'
  return 'other'
}

export function slotLabel(slot: FoodSlot): string {
  return FOOD_SLOTS.find(s => s.id === slot)?.label ?? slot
}
