'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Droplets } from 'lucide-react'
import { BB_V2 } from '@/lib/betterbit-v2'
import {
  formatTodayWaterLine,
  isDailyWaterGoalMet,
  singleDoseNeedsConfirm,
  waterProgressPct,
} from '@/lib/water-log'
import AppConfirmSheet from '@/components/ui/AppConfirmSheet'
import WaterCustomSheet from './WaterCustomSheet'

const QUICK_ADD_ML = [250, 500] as const

type ConfirmState =
  | { kind: 'add'; deltaMl: number }
  | { kind: 'set'; totalMl: number }
  | { kind: 'reset' }
  | null

interface Props {
  loggedMl: number
  targetMl: number
  onAdd: (deltaMl: number) => void
  onSetTotal: (totalMl: number) => void
  onReset: () => void
}

export default function TodayWaterLog({ loggedMl, targetMl, onAdd, onSetTotal, onReset }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [customOpen, setCustomOpen] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmState>(null)
  const pct = waterProgressPct(loggedMl, targetMl)
  const met = isDailyWaterGoalMet(loggedMl, targetMl)

  function tryAdd(deltaMl: number) {
    if (singleDoseNeedsConfirm(deltaMl)) {
      setConfirm({ kind: 'add', deltaMl })
      return
    }
    onAdd(deltaMl)
  }

  function trySetTotal(totalMl: number) {
    const dose = Math.abs(totalMl - loggedMl)
    if (singleDoseNeedsConfirm(dose)) {
      setConfirm({ kind: 'set', totalMl })
      return
    }
    onSetTotal(totalMl)
    setCustomOpen(false)
  }

  function handleConfirm() {
    if (!confirm) return
    if (confirm.kind === 'add') onAdd(confirm.deltaMl)
    if (confirm.kind === 'set') {
      onSetTotal(confirm.totalMl)
      setCustomOpen(false)
    }
    if (confirm.kind === 'reset') {
      onReset()
      setCustomOpen(false)
    }
    setConfirm(null)
  }

  function requestReset() {
    setCustomOpen(false)
    setConfirm({ kind: 'reset' })
  }

  const confirmMessage =
    confirm?.kind === 'add'
      ? `一次記錄 ${confirm.deltaMl} ml 比較多，確定要加入嗎？`
      : confirm?.kind === 'set'
        ? `這次調整 ${Math.abs(confirm.totalMl - loggedMl)} ml，確定要更新嗎？`
        : confirm?.kind === 'reset'
          ? '確定要重設今日喝水量嗎？'
          : ''

  return (
    <>
      <div
        className="rounded-[20px] px-4 py-3"
        style={{ backgroundColor: BB_V2.bg.card, border: `1px solid ${BB_V2.divider}` }}
      >
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="w-full flex items-center gap-3 text-left touch-manipulation"
          aria-expanded={expanded}
        >
          <span
            className="flex items-center justify-center shrink-0"
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              backgroundColor: BB_V2.bg.pill,
              color: 'var(--bb-icon-color-water)',
            }}
          >
            <Droplets className="h-4 w-4" strokeWidth={BB_V2.iconStroke} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px]" style={{ color: BB_V2.text.secondary, fontWeight: 500 }}>
              今日喝水
            </span>
            <span className="block text-[14px] tabular-nums mt-0.5" style={{ color: BB_V2.text.primary, fontWeight: 600 }}>
              {formatTodayWaterLine(loggedMl, targetMl)}
              {met ? ' · 達標' : ''}
            </span>
          </span>
          {expanded ? (
            <ChevronUp className="h-4 w-4 shrink-0" strokeWidth={BB_V2.iconStroke} style={{ color: BB_V2.text.secondary }} />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0" strokeWidth={BB_V2.iconStroke} style={{ color: BB_V2.text.secondary }} />
          )}
        </button>

        <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: BB_V2.bg.pill }}>
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${pct}%`,
              backgroundColor: met ? 'var(--bb-icon-color-water)' : BB_V2.accent.orangeLight,
            }}
          />
        </div>

        {expanded && (
          <div className="mt-3 pt-3 space-y-2" style={{ borderTop: `1px solid ${BB_V2.divider}` }}>
            <div className="flex gap-2">
              {QUICK_ADD_ML.map(ml => (
                <button
                  key={ml}
                  type="button"
                  onClick={() => tryAdd(ml)}
                  className="flex-1 h-10 rounded-[16px] text-[13px] active:scale-[0.98] transition-transform"
                  style={{ backgroundColor: BB_V2.bg.pill, color: BB_V2.text.primary, fontWeight: 600 }}
                >
                  +{ml} ml
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCustomOpen(true)}
                className="flex-1 h-10 rounded-[16px] text-[13px] active:opacity-80"
                style={{ backgroundColor: BB_V2.bg.canvas, color: BB_V2.text.secondary, fontWeight: 500 }}
              >
                自訂
              </button>
            </div>
          </div>
        )}
      </div>

      <WaterCustomSheet
        open={customOpen}
        currentMl={loggedMl}
        onClose={() => setCustomOpen(false)}
        onSaveTotal={trySetTotal}
        onReset={requestReset}
      />

      <AppConfirmSheet
        open={confirm != null}
        title="確認喝水量"
        message={confirmMessage}
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
      />
    </>
  )
}
