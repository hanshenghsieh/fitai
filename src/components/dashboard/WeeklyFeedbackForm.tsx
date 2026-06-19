'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { colors } from '@/lib/design-system'
import type { WeeklyFeedback } from '@/types'

const selectedStyle = {
  border: `2px solid ${colors.accent.action}`,
  backgroundColor: colors.accent.actionSoft,
  color: colors.text.primary,
}
const idleStyle = {
  border: `1px solid ${colors.border.subtle}`,
  backgroundColor: colors.bg.canvas,
  color: colors.text.secondary,
}

export default function WeeklyFeedbackForm({ existing }: { existing: WeeklyFeedback | null }) {
  const [hardestPart, setHardestPart] = useState(existing?.hardest_part ?? '')
  const [dietSatisfaction, setDietSatisfaction] = useState(existing?.diet_satisfaction ?? 0)
  const [workoutIntensity, setWorkoutIntensity] = useState(existing?.workout_intensity ?? '')
  const [hadSickDays, setHadSickDays] = useState(existing?.had_sick_days ?? false)
  const [hadTravel, setHadTravel] = useState(existing?.had_travel ?? false)
  const [notes, setNotes] = useState(existing?.additional_notes ?? '')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setLoading(true)
    try {
      const res = await fetch('/api/weekly-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hardest_part: hardestPart,
          diet_satisfaction: dietSatisfaction || null,
          workout_intensity: workoutIntensity || null,
          had_sick_days: hadSickDays,
          had_travel: hadTravel,
          additional_notes: notes || null,
        }),
      })
      if (!res.ok) throw new Error('提交失敗')
      toast.success('收到了。下週再健一點。')
    } catch {
      toast.error('沒送出去，再試一次。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[14px] font-medium mb-2" style={{ color: colors.text.primary }}>
          這週吃得還行嗎？
        </p>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => setDietSatisfaction(n)}
              className="flex-1 py-2 rounded-xl text-sm font-semibold transition-colors"
              style={dietSatisfaction === n ? selectedStyle : idleStyle}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="flex justify-between text-[11px] mt-1" style={{ color: colors.text.tertiary }}>
          <span>普普</span>
          <span>還可以</span>
        </div>
      </div>

      <div>
        <p className="text-[14px] font-medium mb-2" style={{ color: colors.text.primary }}>
          有動一下嗎？感覺如何？
        </p>
        <div className="flex gap-2">
          {[
            ['too_easy', '太輕鬆'],
            ['just_right', '剛好'],
            ['too_hard', '太難'],
          ].map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setWorkoutIntensity(val)}
              className="flex-1 py-2 rounded-xl text-xs font-medium transition-colors"
              style={workoutIntensity === val ? selectedStyle : idleStyle}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[14px] font-medium mb-2" style={{ color: colors.text.primary }}>
          本週有沒有什麼事？
        </p>
        <div className="flex gap-2 flex-wrap">
          {[
            ['生病', hadSickDays, setHadSickDays],
            ['出差/旅行', hadTravel, setHadTravel],
          ].map(([label, val, setter]) => (
            <button
              key={label as string}
              type="button"
              onClick={() => (setter as (v: boolean) => void)(!(val as boolean))}
              className="px-4 py-2 rounded-full text-sm font-medium transition-colors"
              style={val ? selectedStyle : idleStyle}
            >
              {label as string}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[14px] font-medium mb-1" style={{ color: colors.text.primary }}>
          這週最難的是？
        </p>
        <Textarea
          placeholder="例：加班太晚、聚餐太多、懶得煮…"
          value={hardestPart}
          onChange={e => setHardestPart(e.target.value)}
          className="resize-none text-sm border-0"
          style={{ backgroundColor: colors.bg.muted, color: colors.text.primary }}
          rows={2}
        />
      </div>

      <div>
        <p className="text-[14px] font-medium mb-1" style={{ color: colors.text.primary }}>
          還想跟我說什麼？
        </p>
        <Textarea
          placeholder="隨便說，我聽。"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          className="resize-none text-sm border-0"
          style={{ backgroundColor: colors.bg.muted, color: colors.text.primary }}
          rows={2}
        />
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading || !!existing}
        className="w-full py-3 rounded-xl text-[15px] font-semibold flex items-center justify-center disabled:opacity-50"
        style={{ backgroundColor: colors.accent.action, color: '#FFFDF9' }}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        {existing ? '已跟我說過了' : '送出，下週見'}
      </button>
    </div>
  )
}
