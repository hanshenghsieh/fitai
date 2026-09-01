/**
 * Deterministic forensic audit of eatOutMenu nutrition data integrity.
 *
 * Classifies every item as passing or failing the existing confidence gate
 * (never modifies or weakens the gate itself — see menu-confidence-core.ts),
 * computes contamination statistics, and detects suspiciously-repeated
 * nutrition tuples that indicate bulk-generation corruption rather than
 * independent data-entry mistakes.
 *
 * IMPORTANT distinction this module makes explicit: most gate-rejected items
 * fail solely because of `placeholder_description` — the confidence gate
 * correctly withholding unverified auto-generated content ("估計營養（待交叉驗證）")
 * from being treated as trustworthy/searchable. That is the gate working as
 * designed, not corruption. Genuine corruption is `energy_mismatch` /
 * `implausible_protein` / `implausible_fat` / `implausible_carbs` /
 * `macro_out_of_band` — internally inconsistent numbers on an item that may
 * or may not also be a placeholder.
 */
import type { ConvenienceItem } from '@/lib/convenience-store-menu'
import {
  energyBalanceOk,
  impliedCaloriesFromMacros,
  inferNutritionSource,
  isPlaceholderMenuItem,
  portionPlausible,
  PLACEHOLDER_DESC,
} from './menu-confidence-core'
import { evaluateMenuItemConfidence, isRuntimeSearchable, clearMenuConfidenceCache } from './menu-confidence-runtime'
import { classifyDishBand, macroInBand } from './recommendation-qa/macro-bands'
import { hasCompleteNutrition } from './restaurant-menu-audit'

export type FailureReason =
  | 'energy_mismatch'
  | 'implausible_protein'
  | 'implausible_fat'
  | 'implausible_carbs'
  | 'macro_out_of_band'
  | 'placeholder_description'
  | 'missing_nutrition_field'

export interface AuditedItem {
  id: string
  brand: string
  name: string
  category: string
  role: string
  declared_calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  macro_calories: number
  difference: number
  percentage_difference: number
  energy_balance_status: 'ok' | 'mismatch'
  plausibility_status: 'ok' | 'implausible'
  confidence_grade: string
  source: string
  failure_reasons: FailureReason[]
  nutrition_fingerprint: string
  passes_gate: boolean
}

export function nutritionFingerprint(item: Pick<ConvenienceItem, 'calories' | 'protein_g' | 'carbs_g' | 'fat_g'>): string {
  return `${item.calories}|${item.protein_g}|${item.carbs_g}|${item.fat_g}`
}

/** True for the specific "numbers don't add up" corruption class — independent of the separate, intentional placeholder/unverified gating. */
export function isNutritionCorrupted(
  item: Pick<ConvenienceItem, 'calories' | 'protein_g' | 'carbs_g' | 'fat_g' | 'role'>
): boolean {
  if (item.calories <= 0) return false
  const energyOk = energyBalanceOk(item.calories, item.protein_g, item.carbs_g, item.fat_g)
  const implausibleProtein = item.role === 'drink' && item.protein_g * 4 > item.calories * 0.4 && item.protein_g >= 15
  return !energyOk || implausibleProtein
}

export function classifyFailureReasons(item: ConvenienceItem): FailureReason[] {
  const reasons: FailureReason[] = []
  if (!hasCompleteNutrition(item)) {
    reasons.push('missing_nutrition_field')
    return reasons
  }
  if (isPlaceholderMenuItem(item) && PLACEHOLDER_DESC.test(item.description ?? '')) {
    reasons.push('placeholder_description')
  }
  if (!energyBalanceOk(item.calories, item.protein_g, item.carbs_g, item.fat_g)) {
    reasons.push('energy_mismatch')
  }
  const isDrinkish = item.role === 'drink' || classifyDishBand(item.name, item.tags ?? [], item.role) === 'drink'
  if (isDrinkish && item.protein_g * 4 > item.calories * 0.4 && item.protein_g >= 15) {
    reasons.push('implausible_protein')
  }
  if (isDrinkish && /茶$|綠茶|紅茶|烏龍/.test(item.name) && !/奶|拿鐵|奶蓋/.test(item.name) && item.fat_g >= 10) {
    reasons.push('implausible_fat')
  }
  if (!portionPlausible(item.calories, item.protein_g, item.carbs_g, item.fat_g)) {
    if (item.carbs_g * 4 > item.calories * 0.92) reasons.push('implausible_carbs')
  }
  const bandId = classifyDishBand(item.name, item.tags ?? [], item.role)
  if (!macroInBand(bandId, { calories: item.calories, protein_g: item.protein_g, fat_g: item.fat_g, carbs_g: item.carbs_g })) {
    reasons.push('macro_out_of_band')
  }
  return reasons
}

export function auditItem(item: ConvenienceItem): AuditedItem {
  const macro_calories = impliedCaloriesFromMacros(item.protein_g, item.carbs_g, item.fat_g)
  const difference = macro_calories - item.calories
  const percentage_difference = item.calories > 0 ? Math.round((difference / item.calories) * 1000) / 10 : Infinity
  const grade = evaluateMenuItemConfidence(item)
  const energyOk = hasCompleteNutrition(item) && energyBalanceOk(item.calories, item.protein_g, item.carbs_g, item.fat_g)
  const plausible = hasCompleteNutrition(item) && portionPlausible(item.calories, item.protein_g, item.carbs_g, item.fat_g)

  return {
    id: item.id,
    brand: item.store,
    name: item.name,
    category: item.category,
    role: item.role,
    declared_calories: item.calories,
    protein_g: item.protein_g,
    carbs_g: item.carbs_g,
    fat_g: item.fat_g,
    macro_calories,
    difference,
    percentage_difference,
    energy_balance_status: energyOk ? 'ok' : 'mismatch',
    plausibility_status: plausible ? 'ok' : 'implausible',
    confidence_grade: grade,
    source: inferNutritionSource(item),
    failure_reasons: classifyFailureReasons(item),
    nutrition_fingerprint: nutritionFingerprint(item),
    passes_gate: isRuntimeSearchable(item),
  }
}

export interface DuplicateTupleGroup {
  fingerprint: string
  count: number
  brands: string[]
  categories: string[]
  sampleNames: string[]
}

/**
 * Flags nutrition tuples shared across an unusually large number of
 * semantically unrelated products. Zero-calorie unsweetened teas and
 * intentional shared templates are common and NOT flagged — the threshold
 * requires both a high raw count AND breadth across multiple distinct
 * brands, which legitimate shared templates rarely exhibit at this scale.
 */
export function detectSuspiciousDuplicateTuples(
  items: ConvenienceItem[],
  { minCount = 8, minBrands = 5 }: { minCount?: number; minBrands?: number } = {}
): DuplicateTupleGroup[] {
  const groups = new Map<string, ConvenienceItem[]>()
  for (const item of items) {
    if (item.calories === 0 && item.protein_g === 0 && item.carbs_g === 0 && item.fat_g === 0) continue
    const fp = nutritionFingerprint(item)
    const arr = groups.get(fp) ?? []
    arr.push(item)
    groups.set(fp, arr)
  }

  const out: DuplicateTupleGroup[] = []
  for (const [fp, groupItems] of groups) {
    const brands = new Set(groupItems.map(i => i.store))
    if (groupItems.length >= minCount && brands.size >= minBrands) {
      out.push({
        fingerprint: fp,
        count: groupItems.length,
        brands: [...brands].sort(),
        categories: [...new Set(groupItems.map(i => i.category))].sort(),
        sampleNames: [...new Set(groupItems.map(i => i.name))].slice(0, 10),
      })
    }
  }
  return out.sort((a, b) => b.count - a.count)
}

export interface AuditSummary {
  generatedAt: string
  total: number
  passing: number
  failing: number
  failingPct: number
  byCategory: Record<string, { total: number; passing: number; failing: number }>
  byRole: Record<string, { total: number; passing: number; failing: number }>
  byBrand: { brand: string; total: number; passing: number; failing: number; failureRate: number }[]
  byFailureReason: Record<FailureReason, number>
  duplicateTuples: DuplicateTupleGroup[]
}

export function runAudit(items: ConvenienceItem[]): { audited: AuditedItem[]; summary: AuditSummary } {
  clearMenuConfidenceCache()
  const audited = items.map(auditItem)

  const byCategory: AuditSummary['byCategory'] = {}
  const byRole: AuditSummary['byRole'] = {}
  const byBrandMap = new Map<string, { total: number; passing: number; failing: number }>()
  const byFailureReason: Record<string, number> = {}

  for (const a of audited) {
    byCategory[a.category] ??= { total: 0, passing: 0, failing: 0 }
    byCategory[a.category]!.total++
    byCategory[a.category]![a.passes_gate ? 'passing' : 'failing']++

    byRole[a.role] ??= { total: 0, passing: 0, failing: 0 }
    byRole[a.role]!.total++
    byRole[a.role]![a.passes_gate ? 'passing' : 'failing']++

    const brandStat = byBrandMap.get(a.brand) ?? { total: 0, passing: 0, failing: 0 }
    brandStat.total++
    brandStat[a.passes_gate ? 'passing' : 'failing']++
    byBrandMap.set(a.brand, brandStat)

    for (const reason of a.failure_reasons) {
      byFailureReason[reason] = (byFailureReason[reason] ?? 0) + 1
    }
  }

  const byBrand = [...byBrandMap.entries()]
    .map(([brand, s]) => ({ brand, ...s, failureRate: s.total > 0 ? Math.round((s.failing / s.total) * 1000) / 10 : 0 }))
    .sort((a, b) => b.failing - a.failing)

  const failing = audited.filter(a => !a.passes_gate).length
  const summary: AuditSummary = {
    generatedAt: new Date().toISOString(),
    total: audited.length,
    passing: audited.length - failing,
    failing,
    failingPct: audited.length > 0 ? Math.round((failing / audited.length) * 1000) / 10 : 0,
    byCategory,
    byRole,
    byBrand,
    byFailureReason: byFailureReason as Record<FailureReason, number>,
    duplicateTuples: detectSuspiciousDuplicateTuples(items),
  }

  return { audited, summary }
}

export function formatAuditMarkdownSummary(summary: AuditSummary): string {
  const lines: string[] = []
  lines.push(`# eatOutMenu Nutrition Integrity Audit`)
  lines.push(``)
  lines.push(`Generated: ${summary.generatedAt}`)
  lines.push(``)
  lines.push(`## Overall`)
  lines.push(``)
  lines.push(`- Total items: ${summary.total}`)
  lines.push(`- Passing (searchable): ${summary.passing}`)
  lines.push(`- Failing (gate-rejected): ${summary.failing} (${summary.failingPct}%)`)
  lines.push(``)
  lines.push(`## By category`)
  lines.push(``)
  lines.push(`| Category | Total | Passing | Failing |`)
  lines.push(`|---|---|---|---|`)
  for (const [cat, s] of Object.entries(summary.byCategory).sort((a, b) => b[1].failing - a[1].failing)) {
    lines.push(`| ${cat} | ${s.total} | ${s.passing} | ${s.failing} |`)
  }
  lines.push(``)
  lines.push(`## By role`)
  lines.push(``)
  lines.push(`| Role | Total | Passing | Failing |`)
  lines.push(`|---|---|---|---|`)
  for (const [role, s] of Object.entries(summary.byRole).sort((a, b) => b[1].failing - a[1].failing)) {
    lines.push(`| ${role} | ${s.total} | ${s.passing} | ${s.failing} |`)
  }
  lines.push(``)
  lines.push(`## By brand (top 30 by failure count)`)
  lines.push(``)
  lines.push(`| Brand | Total | Passing | Failing | Failure rate |`)
  lines.push(`|---|---|---|---|---|`)
  for (const b of summary.byBrand.slice(0, 30)) {
    lines.push(`| ${b.brand} | ${b.total} | ${b.passing} | ${b.failing} | ${b.failureRate}% |`)
  }
  lines.push(``)
  lines.push(`## By failure reason`)
  lines.push(``)
  lines.push(`| Reason | Count |`)
  lines.push(`|---|---|`)
  for (const [reason, count] of Object.entries(summary.byFailureReason).sort((a, b) => b[1] - a[1])) {
    lines.push(`| ${reason} | ${count} |`)
  }
  lines.push(``)
  lines.push(`## Suspicious duplicate nutrition tuples`)
  lines.push(``)
  lines.push(`(same calories+protein+carbs+fat shared by 8+ items across 5+ distinct brands — a signature of bulk-generation corruption, not legitimate shared templates)`)
  lines.push(``)
  for (const d of summary.duplicateTuples.slice(0, 20)) {
    lines.push(
      `- \`{${d.fingerprint}}\` — ${d.count} items across ${d.brands.length} brands (${d.brands.slice(0, 8).join(', ')}${d.brands.length > 8 ? '...' : ''}) — e.g. ${d.sampleNames.slice(0, 5).join(', ')}`
    )
  }
  lines.push(``)
  return lines.join('\n')
}
