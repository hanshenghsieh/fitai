'use client'

import { useState } from 'react'
import { BB_V2 } from '@/lib/betterbit-v2'
import BBCard from '@/components/ui/BBCard'
import {
  formatTodayWaterLine,
  isDailyWaterGoalMet,
  singleDoseNeedsConfirm,
  waterProgressPct,
} from '@/lib/water-log'
import WaterCustomSheet from './WaterCustomSheet'

const QUICK_ADD_ML = [250, 500, 750] as const

interface Props {
  loggedMl: number
  targetMl: number
  onAdd: (deltaMl: number) => void
  onSetTotal: (totalMl: number) => void
  onReset: () => void
}

export default function TodayWaterLog({ loggedMl, targetMl, onAdd, onSetTotal, onReset }: Props) {
  const [customOpen, setCustomOpen] = useState(false)
  const pct = waterProgressPct(loggedMl, targetMl)
  const met = isDailyWaterGoalMet(loggedMl, targetMl)
  const empty = loggedMl <= 0

  function tryAdd(deltaMl: number) {
    if (singleDoseNeedsConfirm(deltaMl)) {
      const ok = window.confirm(`一次記錄 ${deltaMl} ml 比較多，確定要加入嗎？`)
      if (!ok) return
    }
    onAdd(deltaMl)
  }

  function trySetTotal(totalMl: number) {
    const dose = Math.abs(totalMl - loggedMl)
    if (singleDoseNeedsConfirm(dose)) {
      const ok = window.confirm(`這次調整 ${dose} ml，確定要更新嗎？`)
      if (!ok) return
    }
    onSetTotal(totalMl)
    setCustomOpen(false)
  }

  return (
    <>
      <BBCard className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-[17px]" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
            今日喝水
          </h2>
          {met && (
            <span
              className="text-[12px] px-2.5 py-1 rounded-full shrink-0"
              style={{ backgroundColor: 'rgba(76, 140, 106, 0.12)', color: 'var(--bb-icon-color-success)', fontWeight: 600 }}
            >
              今天喝水達標了
            </span>
          )}
        </div>

        <p className="text-[15px] tabular-nums" style={{ color: BB_V2.text.primary, fontWeight: 600 }}>
          {formatTodayWaterLine(loggedMl, targetMl)}
        </p>

        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: BB_V2.bg.pill }}>
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${pct}%`,
              backgroundColor: met ? 'var(--bb-icon-color-water)' : 'var(--bb-icon-color-accent)',
            }}
          />
        </div>

        {empty && !met && (
          <p className="text-[13px]" style={{ color: BB_V2.text.secondary, fontWeight: 400 }}>
            今天還沒記錄喝水
          </p>
        )}

        <div className="flex gap-2">
          {QUICK_ADD_ML.map(ml => (
            <button
              key={ml}
              type="button"
              onClick={() => tryAdd(ml)}
              className="flex-1 h-11 rounded-[18px] text-[13px] active:scale-[0.98] transition-transform"
              style={{ backgroundColor: BB_V2.bg.pill, color: BB_V2.text.primary, fontWeight: 600 }}
            >
              +{ml} ml
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setCustomOpen(true)}
          className="w-full h-11 rounded-[18px] text-[14px] active:opacity-80"
          style={{ backgroundColor: BB_V2.bg.canvas, color: BB_V2.text.secondary, fontWeight: 500 }}
        >
          自訂
        </button>
      </BBCard>

      <WaterCustomSheet
        open={customOpen}
        currentMl={loggedMl}
        onClose={() => setCustomOpen(false)}
        onSaveTotal={trySetTotal}
        onReset={onReset}
      />
    </>
  )
}
