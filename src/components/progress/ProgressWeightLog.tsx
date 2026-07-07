'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { BB_V2 } from '@/lib/betterbit-v2'
import type { BodyMeasurement } from '@/types'

interface Props {
  lastWeightKg?: number | null
  embedded?: boolean
  onSaved?: (weightKg: number, measurements?: BodyMeasurement[]) => void | Promise<void>
}

export default function ProgressWeightLog({ lastWeightKg, embedded = false, onSaved }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [weight, setWeight] = useState('')

  async function handleSubmit() {
    const w = parseFloat(weight)
    if (!weight || Number.isNaN(w)) {
      toast.error('填個體重就好')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/measurements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ weight_kg: w }),
      })
      const data = (await res.json()) as {
        error?: string
        historySaved?: boolean
        logSaved?: boolean
        measurements?: BodyMeasurement[]
      }
      if (!res.ok) throw new Error(data.error || 'failed')
      if (!data.historySaved && !data.logSaved) throw new Error('體重紀錄同步失敗')

      setWeight('')
      setExpanded(false)
      await onSaved?.(w, data.measurements)
      toast.message('記下了')
    } catch {
      toast.error('沒記上，再試一次')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={embedded ? 'space-y-3' : 'mx-5 px-4 py-4 rounded-2xl space-y-3'}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[15px] font-medium" style={{ color: BB_V2.text.primary }}>
          記一下體重
        </p>
        {lastWeightKg != null && !expanded && (
          <span className="text-[13px] tabular-nums" style={{ color: BB_V2.text.secondary }}>
            上次 {Number(lastWeightKg).toFixed(1)} kg
          </span>
        )}
      </div>

      {!expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="w-full py-3 rounded-xl text-[15px] font-medium touch-manipulation"
          style={{ backgroundColor: BB_V2.bg.pill, color: BB_V2.text.primary }}
        >
          更新
        </button>
      ) : (
        <div className="space-y-3">
          <input
            type="number"
            inputMode="decimal"
            placeholder="kg"
            step="0.1"
            value={weight}
            onChange={e => setWeight(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-[16px] outline-none"
            style={{
              backgroundColor: BB_V2.bg.pill,
              color: BB_V2.text.primary,
              border: `1px solid ${BB_V2.divider}`,
            }}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="flex-1 py-3 rounded-xl text-[14px] font-medium touch-manipulation"
              style={{ backgroundColor: BB_V2.bg.pill, color: BB_V2.text.secondary }}
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 py-3 rounded-xl text-[15px] font-medium flex items-center justify-center disabled:opacity-40 touch-manipulation"
              style={{ backgroundColor: BB_V2.accent.orange, color: '#FFFFFF' }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '記一下'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
