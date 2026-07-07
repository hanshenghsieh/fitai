import type { FoodLogEntry } from '@/lib/banks/types'
import { getP0FoodById } from './catalog'
import { defaultFoodRecordDraft } from './calculate'
import { resolveP0FoodByLabel } from './resolve-p0-food'
import type { FoodRecordDraft } from './types'

export function foodRecordDraftFromLog(log: FoodLogEntry): FoodRecordDraft | null {
  const meta = log.food_record_meta
  if (meta) return { ...meta }

  const item = resolveFoodItemForLog(log)
  if (item) return defaultFoodRecordDraft(item)

  return null
}

export function resolveFoodItemForLog(log: FoodLogEntry) {
  const metaId = log.food_record_meta?.p0_food_id
  if (metaId) {
    const fromMeta = getP0FoodById(metaId)
    if (fromMeta) return fromMeta
  }

  if (log.id.startsWith('p0-')) {
    const fromLogId = getP0FoodById(log.id.replace(/^p0-/, '').split('-')[0] ?? '')
    if (fromLogId) return fromLogId
  }

  const label = log.display_label ?? log.name
  return resolveP0FoodByLabel(label)
}
