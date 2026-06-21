import type { ProductModel } from './types'

/** 更新此檔 = 反映目前上線產品；每次 major change 後重跑 market-loop */
export const CURRENT_PRODUCT: ProductModel = {
  version: '2026-06-20-mr500-iter8-phase10-premium',
  trial_days: 14,
  price_ntd: 500,
  has_adherence_engine: true,
  has_meal_trust: true,
  has_plateau_story: true,
  has_night_shift_timeline: true,
  has_dice_variants: true,
  has_health_sync: true,
  has_photo_log: true,
  onboarding_steps: 3,
  onboarding_friction: 0.22,
  dice_diversity: 0.78,
  paywall_blocks_progress: false,
  has_early_win: true,
  has_value_framing: true,
  has_quick_log: true,
  has_family_meal: true,
  has_first_run_guide: true,
  has_premium_today_ui: true,
  has_premium_week_ui: true,
  has_premium_progress_ui: true,
  has_premium_settings_ui: true,
  has_premium_invitation_ui: true,
  /** Phase 10.3 — goal distance, fat bank, plateau reassurance on Progress */
  has_goal_visibility: true,
}

export function productFitScore(p: ProductModel): number {
  let s = 0.5
  if (p.has_adherence_engine) s += 0.06
  if (p.has_meal_trust) s += 0.04
  if (p.has_plateau_story) s += 0.04
  if (p.has_night_shift_timeline) s += 0.03
  if (p.has_dice_variants) s += 0.05
  if (p.trial_days >= 14) s += 0.04
  if (p.has_health_sync) s += 0.05
  if (!p.paywall_blocks_progress) s += 0.04
  if (p.has_early_win) s += 0.04
  if (p.has_value_framing) s += 0.03
  if (p.has_quick_log) s += 0.04
  if (p.has_family_meal) s += 0.03
  if (p.has_first_run_guide) s += 0.04
  if (p.has_premium_today_ui) s += 0.05
  if (p.has_premium_week_ui) s += 0.04
  if (p.has_premium_progress_ui) s += 0.05
  if (p.has_premium_settings_ui) s += 0.04
  if (p.has_premium_invitation_ui) s += 0.05
  s -= p.onboarding_friction * 0.12
  s -= p.onboarding_steps > 3 ? 0.04 : p.onboarding_steps > 4 ? 0.06 : 0
  return Math.max(0.08, Math.min(0.95, s))
}

export function activationEase(p: ProductModel): number {
  let e = 0
  if (p.onboarding_steps <= 3) e += 0.14
  else if (p.onboarding_steps <= 4) e += 0.07
  e += Math.max(0, 0.38 - p.onboarding_friction) * 0.2
  if (p.has_quick_log) e += 0.06
  if (p.has_early_win) e += 0.04
  if (p.has_first_run_guide) e += 0.05
  if (p.has_premium_today_ui) e += 0.06
  return e
}
