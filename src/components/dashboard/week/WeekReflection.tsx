'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { colors } from '@/lib/design-system'
import type { WeeklyFeedback } from '@/types'

type WeekFeel = 'steady' | 'messy' | 'tired'
type MoveFeel = 'moved' | 'right' | 'barely'

const weekOptions: { id: WeekFeel; label: string }[] = [
  { id: 'steady', label: '還算穩' },
  { id: 'messy', label: '有點亂' },
  { id: 'tired', label: '需要休息' },
]

const moveOptions: { id: MoveFeel; label: string }[] = [
  { id: 'moved', label: '有動' },
  { id: 'right', label: '剛好' },
  { id: 'barely', label: '幾乎沒動' },
]

function payloadFor(week: WeekFeel, move: MoveFeel) {
  const dietMap: Record<WeekFeel, number> = { steady: 4, messy: 2, tired: 2 }
  const hardestMap: Record<WeekFeel, string | null> = {
    steady: null,
    messy: '本週有點亂',
    tired: '這週需要休息',
  }
  const intensityMap: Record<MoveFeel, 'too_easy' | 'just_right' | 'too_hard' | null> = {
    moved: 'too_easy',
    right: 'just_right',
    barely: null,
  }
  return {
    diet_satisfaction: dietMap[week],
    hardest_part: hardestMap[week],
    workout_intensity: intensityMap[move],
    had_sick_days: week === 'tired',
    had_travel: false,
    additional_notes: null,
  }
}

interface Props {
  existing: WeeklyFeedback | null
  showPrompt: boolean
}

export default function WeekReflection({ existing, showPrompt }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<'week' | 'move' | 'done'>('week')
  const [weekFeel, setWeekFeel] = useState<WeekFeel | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!showPrompt && !existing) return null

  if (existing) {
    return (
      <div className="mx-5 mb-8 px-4 py-4 rounded-2xl" style={{ backgroundColor: colors.bg.muted }}>
        <p className="text-[13px]" style={{ color: colors.text.tertiary }}>
          本週已記下
        </p>
        <p className="text-[15px] mt-1 leading-relaxed" style={{ color: colors.text.secondary }}>
          謝謝你花兩秒鐘回顧。下週會照你的節奏調整。
        </p>
      </div>
    )
  }

  if (step === 'done') {
    return (
      <div className="mx-5 mb-8 px-4 py-4 rounded-2xl" style={{ backgroundColor: colors.bg.muted }}>
        <p className="text-[15px] leading-relaxed" style={{ color: colors.text.secondary }}>
          記下了。下週見。
        </p>
      </div>
    )
  }

  async function submit(week: WeekFeel, move: MoveFeel) {
    setSubmitting(true)
    try {
      const res = await fetch('/api/weekly-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadFor(week, move)),
      })
      if (!res.ok) throw new Error()
      setStep('done')
      router.refresh()
      toast.message('記下了')
    } catch {
      toast.error('沒送出去，再試一次')
    } finally {
      setSubmitting(false)
    }
  }

  function pickWeek(feel: WeekFeel) {
    setWeekFeel(feel)
    setStep('move')
  }

  function pickMove(move: MoveFeel) {
    if (!weekFeel || submitting) return
    void submit(weekFeel, move)
  }

  const chipStyle = (active: boolean) => ({
    backgroundColor: active ? colors.accent.actionSoft : colors.bg.muted,
    color: active ? colors.text.primary : colors.text.secondary,
    border: `1px solid ${active ? colors.border.focus : colors.border.subtle}`,
  })

  return (
    <div className="mx-5 mb-8 px-4 py-5 rounded-2xl space-y-4" style={{ backgroundColor: colors.bg.elevated, border: `1px solid ${colors.border.subtle}` }}>
      {step === 'week' ? (
        <>
          <p className="text-[15px] leading-relaxed" style={{ color: colors.text.secondary }}>
            這週，對你來說…
          </p>
          <div className="flex gap-2">
            {weekOptions.map(opt => (
              <button
                key={opt.id}
                type="button"
                disabled={submitting}
                onClick={() => pickWeek(opt.id)}
                className="flex-1 py-3 rounded-xl text-[14px] font-medium transition-colors"
                style={chipStyle(false)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <p className="text-[15px] leading-relaxed" style={{ color: colors.text.secondary }}>
            有動一下嗎？
          </p>
          <div className="flex gap-2">
            {moveOptions.map(opt => (
              <button
                key={opt.id}
                type="button"
                disabled={submitting}
                onClick={() => pickMove(opt.id)}
                className="flex-1 py-3 rounded-xl text-[14px] font-medium transition-colors"
                style={chipStyle(false)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setStep('week')}
            className="text-[12px]"
            style={{ color: colors.text.tertiary }}
          >
            上一步
          </button>
        </>
      )}
    </div>
  )
}
