import { preloadDiceMenuBulk } from '../src/lib/dice-menu-pool.ts'
import { computeTodayMealState } from '../src/lib/engines/next-meal-engine.ts'
import { rollMealSuggestion } from '../src/lib/meal-engine.ts'
import { suggestNextMeal, clearSessionDicePoolsForTests } from '../src/lib/meal-suggest.ts'

await preloadDiceMenuBulk()
clearSessionDicePoolsForTests()

const dayState = computeTodayMealState({
  todayFoodLogs: [],
  normalTargetKcal: 2000,
  proteinTargetG: 120,
  mealSlot: 'lunch',
  hourOfDay: 12,
})

console.log('targets cal/pro', dayState.effectiveMealCalTarget, dayState.effectiveMealProteinTarget)

const base = {
  meal_type: 'lunch',
  daily_targets: { calories: 2000, protein_g: 120, carbs_g: 242, fat_g: 61 },
  day_state: dayState,
  fast_dice: true,
}

const probe = suggestNextMeal({ ...base, seed: 1, rolls_used: 0 })
console.log(
  'first suggest',
  probe.suggestion?.stores[0],
  probe.suggestion?.lines[0]?.item.name,
  'pool_exhausted',
  probe.pool_exhausted
)

let ids = []
const labels = new Set()
const stores = new Set()
for (let i = 0; i < 15; i++) {
  const r = rollMealSuggestion({
    meal_type: 'lunch',
    daily_targets: base.daily_targets,
    day_state: dayState,
    seen_ids: ids,
    exclude_stores: [],
    rolls_used: i,
  })
  if (!r.suggestion) {
    console.log('roll', i, 'NULL')
    break
  }
  const label = `${r.suggestion.stores[0]} · ${r.suggestion.lines.map(l => l.item.name).join('+')}`
  console.log('roll', i, label)
  labels.add(label)
  stores.add(r.suggestion.stores[0] ?? '')
  ids = [...ids, r.suggestion.id]
}
console.log('unique labels', labels.size, 'unique stores', stores.size)
