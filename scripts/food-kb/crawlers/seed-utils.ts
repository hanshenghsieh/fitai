import type { RawFoodObservation } from '@/lib/food-kb/types'

export function seedRowToObservation(
  item: Record<string, unknown>,
  adapter: string,
  sourceFile: string
): RawFoodObservation {
  const store = String(item.store ?? 'unknown')
  return {
    adapter,
    source_type: 'estimated',
    source_name: `category-seed:${item.kb_category ?? 'unknown'}`,
    source_url: `internal://${sourceFile}#${item.id}`,
    brand: store,
    store,
    name: String(item.name),
    aliases: Array.isArray(item.aliases) ? item.aliases.map(String) : undefined,
    category: String(item.category ?? 'lunch'),
    role: item.role ? String(item.role) : undefined,
    price_twd: Number(item.price) || undefined,
    image_urls: item.photo_url ? [String(item.photo_url)] : [],
    legacy_id: String(item.id),
    tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
    nutrition: {
      calories: Number(item.calories) || undefined,
      protein_g: Number(item.protein_g) || undefined,
      carbs_g: Number(item.carbs_g) || undefined,
      fat_g: Number(item.fat_g) || undefined,
      sugar_g: Number(item.sugar_g) || undefined,
      fiber_g: Number(item.fiber_g) || undefined,
    },
    raw_json: { ...item, kb_category: item.kb_category },
  }
}
