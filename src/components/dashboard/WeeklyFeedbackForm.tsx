'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { WeeklyFeedback } from '@/types'

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
      toast.success('回饋已提交！AI 教練將根據你的回饋調整下週計畫 🎯')
    } catch {
      toast.error('提交失敗，請再試一次')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Diet satisfaction */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">本週飲食計畫滿意度？</p>
        <div className="flex gap-2">
          {[1,2,3,4,5].map(n => (
            <button key={n} type="button" onClick={() => setDietSatisfaction(n)}
              className={`flex-1 py-2 rounded-lg border-2 text-sm font-bold transition-colors ${dietSatisfaction === n ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-500'}`}>
              {n}
            </button>
          ))}
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>很差</span><span>很好</span>
        </div>
      </div>

      {/* Workout intensity */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">訓練強度感受？</p>
        <div className="flex gap-2">
          {[['too_easy','太輕鬆'],['just_right','剛好'],['too_hard','太難']].map(([val, label]) => (
            <button key={val} type="button" onClick={() => setWorkoutIntensity(val)}
              className={`flex-1 py-2 rounded-lg border-2 text-xs font-medium transition-colors ${workoutIntensity === val ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-500'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Special situations */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">本週有無特殊狀況？</p>
        <div className="flex gap-2">
          {[['hadSickDays','生病',hadSickDays,setHadSickDays],['hadTravel','出差/旅行',hadTravel,setHadTravel]].map(([key, label, val, setter]) => (
            <button key={key as string} type="button" onClick={() => (setter as (v: boolean) => void)(!(val as boolean))}
              className={`px-4 py-2 rounded-full border-2 text-sm font-medium transition-colors ${val ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-500'}`}>
              {label as string}
            </button>
          ))}
        </div>
      </div>

      {/* Hardest part */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-1">本週最難執行的是什麼？</p>
        <Textarea
          placeholder="例：工作太忙所以晚餐常外食、深蹲膝蓋有不舒服..."
          value={hardestPart}
          onChange={e => setHardestPart(e.target.value)}
          className="resize-none text-sm"
          rows={2}
        />
      </div>

      {/* Additional notes */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-1">其他想告訴 AI 教練的？</p>
        <Textarea
          placeholder="任何想法都可以說..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
          className="resize-none text-sm"
          rows={2}
        />
      </div>

      <Button
        onClick={handleSubmit}
        disabled={loading || !!existing}
        className="w-full bg-emerald-500 hover:bg-emerald-600"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        {existing ? '已提交回饋' : '提交並生成下週計畫'}
      </Button>
    </div>
  )
}
