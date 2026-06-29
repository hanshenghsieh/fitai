/** Weekly weight change thresholds for strategy pacing (general population). */

/** More than ~1 kg / week is treated as rapid loss — strategies should ease pressure. */
export const RAPID_WEEKLY_WEIGHT_LOSS_KG = 1.0

export function isRapidWeightLoss(deltaKg: number | null | undefined): boolean {
  return deltaKg != null && deltaKg <= -RAPID_WEEKLY_WEIGHT_LOSS_KG
}
