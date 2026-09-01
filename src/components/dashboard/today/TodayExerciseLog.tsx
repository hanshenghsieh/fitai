'use client'

import { useState } from 'react'
import { Activity, Pencil, Trash2, Plus } from 'lucide-react'
import { BB_V2 } from '@/lib/betterbit-v2'
import { ACTIVITY_LABEL_ZH, INTENSITY_LABEL_ZH } from '@/lib/exercise/activity-met'
import { formatTaipeiTime } from '@/lib/timezone'
import AppConfirmSheet from '@/components/ui/AppConfirmSheet'
import AddExerciseSheet, { type ExerciseDraft } from './AddExerciseSheet'
import { iconForExerciseLog } from './exercise-icons'
import type { ExerciseLog } from '@/types'

interface Props {
  logs: ExerciseLog[]
  bodyWeightKg?: number | null
  onAdd: (draft: ExerciseDraft) => void
  onEdit: (id: string, draft: ExerciseDraft) => void
  onDelete: (id: string) => void
  onSheetOpened?: () => void
}

function exerciseName(log: ExerciseLog): string {
  return log.activity_name ?? (log.activity_type === 'other' ? log.activity_label ?? ACTIVITY_LABEL_ZH.other : ACTIVITY_LABEL_ZH[log.activity_type])
}

function exerciseDetailLine(log: ExerciseLog): string {
  const intensityPart = log.intensity ? ` · ${INTENSITY_LABEL_ZH[log.intensity]}強度` : ''
  return `${log.duration_minutes} 分鐘${intensityPart} · 預估消耗 ${log.estimated_calories} kcal`
}

export default function TodayExerciseLog({ logs, bodyWeightKg, onAdd, onEdit, onDelete, onSheetOpened }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingLog, setEditingLog] = useState<ExerciseLog | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  function openAddSheet() {
    setEditingLog(null)
    setSheetOpen(true)
    onSheetOpened?.()
  }

  function openEditSheet(log: ExerciseLog) {
    setEditingLog(log)
    setSheetOpen(true)
  }

  function handleSave(draft: ExerciseDraft) {
    if (editingLog) {
      onEdit(editingLog.id, draft)
    } else {
      onAdd(draft)
    }
    setSheetOpen(false)
    setEditingLog(null)
  }

  return (
    <>
      <div
        className="rounded-[20px] px-4 py-3"
        style={{ backgroundColor: BB_V2.bg.card, border: `1px solid ${BB_V2.divider}` }}
      >
        <div className="flex items-center gap-3">
          <span
            className="flex items-center justify-center shrink-0"
            style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: BB_V2.bg.pill, color: BB_V2.accent.green }}
          >
            <Activity className="h-4 w-4" strokeWidth={BB_V2.iconStroke} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px]" style={{ color: BB_V2.text.secondary, fontWeight: 500 }}>
              今日運動
            </span>
            <span className="block text-[14px] mt-0.5" style={{ color: BB_V2.text.primary, fontWeight: 600 }}>
              {logs.length === 0 ? '尚未記錄運動' : `已記錄 ${logs.length} 筆`}
            </span>
          </span>
          <button
            type="button"
            onClick={openAddSheet}
            className="inline-flex items-center gap-1 text-[12px] px-3 py-1.5 rounded-full shrink-0 active:opacity-80"
            style={{ backgroundColor: BB_V2.accent.greenSoft, color: BB_V2.accent.greenDeep, fontWeight: 600 }}
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={BB_V2.iconStroke} />
            記錄運動
          </button>
        </div>

        {logs.length > 0 && (
          <div className="mt-3 pt-3 space-y-3" style={{ borderTop: `1px solid ${BB_V2.divider}` }}>
            {logs.map(log => {
              const LogIcon = iconForExerciseLog(log)
              const time = formatTaipeiTime(log.created_at)
              return (
                <div key={log.id} className="flex items-center gap-3">
                  <span
                    className="flex items-center justify-center shrink-0"
                    style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: BB_V2.bg.pill, color: BB_V2.accent.green }}
                  >
                    <LogIcon className="h-3.5 w-3.5" strokeWidth={BB_V2.iconStroke} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] truncate" style={{ color: BB_V2.text.primary, fontWeight: 600 }}>
                      {exerciseName(log)}
                    </p>
                    <p className="text-[12px] mt-0.5" style={{ color: BB_V2.text.secondary }}>
                      {exerciseDetailLine(log)}
                      {time ? ` · ${time}` : ''}
                    </p>
                  </div>
                  <button type="button" onClick={() => openEditSheet(log)} className="p-1.5 shrink-0" aria-label="編輯">
                    <Pencil className="h-3.5 w-3.5" strokeWidth={BB_V2.iconStroke} style={{ color: BB_V2.text.secondary }} />
                  </button>
                  <button type="button" onClick={() => setDeleteConfirmId(log.id)} className="p-1.5 shrink-0" aria-label="刪除">
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={BB_V2.iconStroke} style={{ color: BB_V2.text.secondary }} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <AddExerciseSheet
        open={sheetOpen}
        bodyWeightKg={bodyWeightKg}
        editingLog={editingLog}
        onClose={() => {
          setSheetOpen(false)
          setEditingLog(null)
        }}
        onSave={handleSave}
      />

      <AppConfirmSheet
        open={deleteConfirmId != null}
        title="刪除運動紀錄"
        message="確定要刪除這筆運動紀錄嗎？"
        confirmLabel="刪除"
        onConfirm={() => {
          if (deleteConfirmId) onDelete(deleteConfirmId)
          setDeleteConfirmId(null)
        }}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </>
  )
}
