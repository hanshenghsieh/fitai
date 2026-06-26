import type { FoodLogEntry } from '@/lib/banks/types'
import { getAutoApplyAnalytics, listAutoApplyAudits } from '@/lib/nutrition/unknown-food-resolution/audit'
import { getFounderUnknownDashboard } from '@/lib/nutrition/search-v2/unknown-queue'

export function getFounderAutoApplyDashboard(logs: FoodLogEntry[] = []) {
  return {
    generated_at: new Date().toISOString(),
    auto_apply: getAutoApplyAnalytics(logs),
    text_unknown: getFounderUnknownDashboard().text_unknown,
    recent_audits: listAutoApplyAudits()
      .slice(-20)
      .reverse()
      .map(a => ({
        unknown_record_id: a.unknown_record_id,
        original_food_name: a.original_food_name,
        matched_item_name: a.matched_item_name,
        match_score: a.match_score,
        rolled_back: a.rolled_back ?? false,
        auto_resolved_at: a.auto_resolved_at,
      })),
  }
}
