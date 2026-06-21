'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Loader2, Plus, ChevronDown, ChevronUp } from 'lucide-react'
import { colors, cardStyle } from '@/lib/design-system'
import { GENTLE_ERROR_MESSAGE } from '@/lib/copy/gentle-errors'
import ZaiJian from '@/components/character/ZaiJian'

interface Props {
  lastWeightKg?: number | null
}

export default function MeasurementForm({ lastWeightKg }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [weight, setWeight] = useState('')
  const [bodyFat, setBodyFat] = useState('')
  const router = useRouter()

  async function handleSubmit() {
    if (!weight) {
      toast.error('填個體重就好')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/measurements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weight_kg: parseFloat(weight),
          body_fat_pct: bodyFat ? parseFloat(bodyFat) : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'failed')

      setWeight('')
      setBodyFat('')
      setOpen(false)
      router.refresh()

      if (data.planRegenerated && data.regenSummary) {
        toast.success('計畫已更新', {
          description: data.regenSummary,
          duration: 8000,
        })
      } else if (data.regenError) {
        toast.error(GENTLE_ERROR_MESSAGE, { description: data.regenError })
      } else {
        toast.success('記下了。')
      }
    } catch {
      toast.error(GENTLE_ERROR_MESSAGE)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={cardStyle}>
      <button className="w-full px-4 py-4 flex items-center gap-3" onClick={() => setOpen(!open)}>
        <ZaiJian size="xs" expression="normal" />
        <span className="text-[15px] font-semibold flex-1 text-left" style={{ color: colors.text.primary }}>
          記一下體重
        </span>
        {open ? <ChevronUp className="h-4 w-4" style={{ color: colors.text.tertiary }} /> : <ChevronDown className="h-4 w-4" style={{ color: colors.text.tertiary }} />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: colors.border.subtle }}>
          <p className="text-[12px] pt-3" style={{ color: colors.text.tertiary }}>
            變化夠大時，系統會自動重算熱量、蛋白質與課表。
            {lastWeightKg != null && (
              <span className="block mt-1">上次：{lastWeightKg} kg</span>
            )}
          </p>
          <div>
            <label className="text-[13px] block mb-1" style={{ color: colors.text.secondary }}>體重 kg</label>
            <Input type="number" placeholder="70.5" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} />
          </div>
          <div>
            <label className="text-[13px] block mb-1" style={{ color: colors.text.secondary }}>體脂 %（選填）</label>
            <Input type="number" placeholder="25" step="0.1" value={bodyFat} onChange={e => setBodyFat(e.target.value)} />
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3 rounded-xl text-[15px] font-semibold flex items-center justify-center gap-2 disabled:opacity-40"
            style={{ backgroundColor: colors.accent.action, color: '#FFFDF9' }}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            記錄並更新計畫
          </button>
        </div>
      )}
    </div>
  )
}
