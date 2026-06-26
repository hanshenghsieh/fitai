import type { FoodLogEntry } from '@/lib/banks/types'
import { isNutritionPendingConfirmation } from '@/lib/nutrition/food-log-display'
import {
  applyAutoResolveToLog,
  evaluateAutoApply,
} from '@/lib/nutrition/unknown-food-resolution/auto-apply'
import {
  listAutoApplyAudits,
  newAuditEntry,
  recordAutoApplyAudit,
} from '@/lib/nutrition/unknown-food-resolution/audit'
import type { DailyRematchJobResult } from '@/lib/nutrition/unknown-food-resolution/types'
import { listUnknownQueue, updateUnknownQueueStatus } from '@/lib/nutrition/search-v2/unknown-queue'

export interface DailyRematchInput {
  food_logs: FoodLogEntry[]
  run_at?: Date
}

function alreadyAppliedForMatch(log: FoodLogEntry, matchedItemId: string): boolean {
  if (log.auto_resolved_meta?.matched_item_id === matchedItemId) return true
  return listAutoApplyAudits().some(
    a =>
      !a.rolled_back &&
      a.unknown_record_id === log.id &&
      a.matched_item_id === matchedItemId
  )
}

export function runDailyUnknownRematchJob(input: DailyRematchInput): DailyRematchJobResult {
  const runAt = input.run_at ?? new Date()
  const logsById = new Map(input.food_logs.map(l => [l.id, { ...l }]))
  const pendingLogs = [...logsById.values()].filter(l => isNutritionPendingConfirmation(l))

  let applied = 0
  let pending_review = 0
  let skipped = 0
  const audits: DailyRematchJobResult['audits'] = []
  const updated_logs: FoodLogEntry[] = []

  for (const log of pendingLogs) {
    const decision = evaluateAutoApply(log)

    if (decision.eligible && decision.candidate) {
      if (alreadyAppliedForMatch(log, decision.candidate.matched_item_id)) {
        skipped++
        continue
      }

      const before = {
        nutrition_status: log.nutrition_status,
        calories: log.calories,
        protein_g: log.protein_g,
        fat_g: log.fat_g ?? null,
        carbs_g: log.carbs_g ?? null,
      }

      const updated = applyAutoResolveToLog(log, decision.candidate, runAt)
      logsById.set(log.id, updated)
      updated_logs.push(updated)

      const audit = recordAutoApplyAudit(
        newAuditEntry({
          unknown_record_id: log.id,
          original_food_name: log.name,
          matched_item_id: decision.candidate.matched_item_id,
          matched_item_name: decision.candidate.matched_item_name,
          match_score: decision.candidate.match_score,
          source_type: decision.candidate.nutrition_trace.source_type,
          source_name: decision.candidate.nutrition_trace.source_name,
          source_url: decision.candidate.nutrition_trace.source_url,
          before_nutrition: before,
          after_nutrition: {
            nutrition_status: 'auto_resolved',
            calories: updated.calories!,
            protein_g: updated.protein_g!,
            fat_g: updated.fat_g ?? 0,
            carbs_g: updated.carbs_g ?? 0,
          },
          auto_resolved_at: runAt.toISOString(),
          qa_result: decision.qa,
        })
      )
      audits.push(audit)
      applied++

      const queueEntry = listUnknownQueue().find(
        e => e.food_name.trim().toLowerCase() === log.name.trim().toLowerCase()
      )
      if (queueEntry) updateUnknownQueueStatus(queueEntry.id, 'updated')
    } else if (decision.pending_review) {
      pending_review++
      const queueEntry = listUnknownQueue().find(
        e => e.food_name.trim().toLowerCase() === log.name.trim().toLowerCase()
      )
      if (queueEntry) updateUnknownQueueStatus(queueEntry.id, 'pending_review')
    } else {
      skipped++
    }
  }

  return {
    scanned: pendingLogs.length,
    applied,
    pending_review,
    skipped,
    audits,
    updated_logs,
  }
}

/** Idempotent re-run — second run should not duplicate applies. */
export function runDailyUnknownRematchJobIdempotent(input: DailyRematchInput): DailyRematchJobResult {
  const first = runDailyUnknownRematchJob(input)
  const mergedLogs = input.food_logs.map(l => {
    const u = first.updated_logs.find(x => x.id === l.id)
    return u ?? l
  })
  const second = runDailyUnknownRematchJob({ food_logs: mergedLogs, run_at: input.run_at })
  return {
    scanned: first.scanned,
    applied: first.applied,
    pending_review: first.pending_review + second.pending_review,
    skipped: first.skipped + second.skipped,
    audits: [...first.audits, ...second.audits.filter(a => !first.audits.some(x => x.id === a.id))],
    updated_logs: first.updated_logs,
  }
}
