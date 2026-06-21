'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { colors } from '@/lib/design-system'

interface Props {
  lastWeightKg?: number | null
}

export default function ProgressWeightLog({ lastWeightKg }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [showBodyFat, setShowBodyFat] = useState(false)
  const [loading, setLoading] = useState(false)
  const [weight, setWeight] = useState('')
  const [bodyFat, setBodyFat] = useState('')
  const router = useRouter()

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
        body: JSON.stringify({
          weight_kg: w,
          body_fat_pct: bodyFat ? parseFloat(bodyFat) : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'failed')

      setWeight('')
      setBodyFat('')
      setExpanded(false)
      setShowBodyFat(false)
      router.refresh()
      toast.message('記下了')
    } catch {
      toast.error('沒記上，再試一次')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-5 px-4 py-4 rounded-2xl space-y-3" style={{ backgroundColor: colors.bg.elevated, border: `1px solid ${colors.border.subtle}` }}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[15px] font-medium" style={{ color: colors.text.primary }}>
          記一下體重
        </p>
        {lastWeightKg != null && !expanded && (
          <span className="text-[13px] tabular-nums" style={{ color: colors.text.tertiary }}>
            上次 {lastWeightKg} kg
          </span>
        )}
      </div>

      {!expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="w-full py-3 rounded-xl text-[15px] font-medium"
          style={{ backgroundColor: colors.bg.muted, color: colors.text.secondary }}
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
            className="w-full px-4 py-3 rounded-xl text-[15px] outline-none"
            style={{
              backgroundColor: colors.bg.muted,
              color: colors.text.primary,
              border: `1px solid ${colors.border.subtle}`,
            }}
          />
          {!showBodyFat ? (
            <button
              type="button"
              onClick={() => setShowBodyFat(true)}
              className="text-[13px]"
              style={{ color: colors.text.tertiary }}
            >
              加體脂（選填）
            </button>
          ) : (
            <input
              type="number"
              inputMode="decimal"
              placeholder="體脂 %"
              step="0.1"
              value={bodyFat}
              onChange={e => setBodyFat(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-[15px] outline-none"
              style={{
                backgroundColor: colors.bg.muted,
                color: colors.text.primary,
                border: `1px solid ${colors.border.subtle}`,
              }}
            />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setExpanded(false); setShowBodyFat(false) }}
              className="flex-1 py-3 rounded-xl text-[14px] font-medium"
              style={{ backgroundColor: colors.bg.muted, color: colors.text.secondary }}
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 py-3 rounded-xl text-[15px] font-medium flex items-center justify-center disabled:opacity-40"
              style={{ backgroundColor: colors.accent.action, color: colors.bg.elevated }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '記一下'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
