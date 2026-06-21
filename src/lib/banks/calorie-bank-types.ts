/** BetterBit Engine v1 — persistent calorie bank row */

export interface CalorieBankRow {
  id?: string
  user_id: string
  date: string
  /** Plan target (normal) */
  daily_target_kcal: number
  /** Today effective target after recovery smoothing */
  internal_target_kcal: number
  actual_kcal: number
  /** actual − daily_target (positive = ate above plan) */
  delta_kcal: number
  /** internal_target − actual */
  running_balance_kcal: number
  /** kcal still to smooth over upcoming days */
  recovery_balance_kcal: number
  spread_days_remaining: number
  /** negative = gentle daily reduction during recovery */
  daily_adjust_kcal: number
  created_at?: string
  updated_at?: string
  /** Client-only: false when DB upsert failed but in-memory row is still valid */
  persisted?: boolean
}

export interface RecoveryWindow {
  spreadDays: number
  dailyAdjustKcal: number
}

export interface CalorieBankSyncInput {
  userId: string
  date: string
  normalTargetKcal: number
  calorieFloor: number
  actualKcal: number
  previousRow: CalorieBankRow | null
}
