import { calorieFloorFromGender } from '@/lib/engines/calorie-bank-engine'
import type { UserProfile } from '@/types'

export function validateHeightCm(value: number | null | undefined): string | null {
  if (value == null || Number.isNaN(value)) return '請填寫身高'
  if (value < 100 || value > 230) return '身高請填 100–230 cm'
  return null
}

export function validateWeightKg(value: number | null | undefined): string | null {
  if (value == null || Number.isNaN(value)) return '請填寫體重'
  if (value < 30 || value > 250) return '體重請填 30–250 kg'
  return null
}

export function validateBodyFatPct(value: number | null | undefined): string | null {
  if (value == null || value === ('' as unknown)) return null
  if (Number.isNaN(value)) return '請填寫有效體脂'
  if (value < 3 || value > 70) return '體脂請填 3–70 %'
  return null
}

export function validateWaistCm(value: number | null | undefined): string | null {
  if (value == null || Number.isNaN(value)) return null
  if (value < 40 || value > 200) return '腰圍請填 40–200 cm'
  return null
}

export function validateDailyCalories(
  value: number | null | undefined,
  profile?: Pick<UserProfile, 'gender'> | null
): string | null {
  if (value == null || Number.isNaN(value)) return '請填寫每日熱量'
  if (value <= 0) return '每日熱量必須大於 0'
  const floor = calorieFloorFromGender(profile?.gender)
  if (value < floor) return `每日熱量不得低於 ${floor} kcal 安全下限`
  return null
}

export function validateMacroGrams(value: number | null | undefined, label: string): string | null {
  if (value == null || value === ('' as unknown)) return null
  if (Number.isNaN(value)) return `請填寫有效${label}`
  if (value < 0) return `${label}不可為負數`
  return null
}

export function parseOptionalNumber(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}
