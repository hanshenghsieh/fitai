import { rollMealSuggestion } from '../src/lib/meal-engine'
import { preloadDiceMenuBulk } from '../src/lib/dice-menu-pool'

async function main() {
  const daily = { calories: 2000, protein_g: 120, carbs_g: 200, fat_g: 65 }

  console.log('Preloading bulk menu...')
  await preloadDiceMenuBulk()
  console.log('Rolling 5 lunches...')

  for (let i = 0; i < 5; i++) {
    const r = rollMealSuggestion({
      meal_type: 'lunch',
      daily_targets: daily,
      seen_ids: [],
      exclude_names: [],
      rolls_used: i,
      day_index: 0,
    })
    const s = r.suggestion
    if (!s) {
      console.log(`roll ${i}: null`)
      continue
    }
    console.log(
      `roll ${i}: ${s.lines.length} items, ${s.totals.calories} kcal, stores: ${[...new Set(s.lines.map(l => l.item.store))].join(', ')}`
    )
    for (const l of s.lines) {
      console.log(`  - ${l.item.store} · ${l.item.name} (${l.item.calories} kcal)`)
    }
  }
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
